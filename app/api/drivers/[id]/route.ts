import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { driverSchema } from '@/types/driver';

// 1. GET: Fetch driver details by ID
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const driver = await prisma.driver.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            image: true,
          },
        },
      },
    });

    if (!driver) {
      return NextResponse.json({ error: 'Driver not found' }, { status: 404 });
    }

    return NextResponse.json(driver);
  } catch (error) {
    console.error('[DRIVER_GET_BY_ID_ERROR]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// 2. PATCH: Update driver details by ID
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const roles = session.user.roles || [];
    if (!roles.includes('ADMIN') && !roles.includes('FLEET_MANAGER')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();

    const result = driverSchema.partial().safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: 'Validation Error', details: result.error.format() }, { status: 400 });
    }

    // Verify licenseNumber unique constraint
    if (result.data.licenseNumber) {
      const existingDriver = await prisma.driver.findFirst({
        where: {
          AND: [
            { id: { not: id } },
            { licenseNumber: result.data.licenseNumber },
          ],
        },
      });
      if (existingDriver) {
        return NextResponse.json({ error: 'A driver with this license number already exists.' }, { status: 400 });
      }
    }

    // Verify user mapping constraint
    if (result.data.userId) {
      const alreadyAssignedUser = await prisma.driver.findFirst({
        where: {
          AND: [
            { id: { not: id } },
            { userId: result.data.userId },
          ],
        },
      });
      if (alreadyAssignedUser) {
        return NextResponse.json({ error: 'This user account is already assigned to a driver profile.' }, { status: 400 });
      }
    }

    const updatedDriver = await prisma.driver.update({
      where: { id },
      data: result.data,
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    // Create Audit Log
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: 'DRIVER_UPDATE',
        details: { driverId: id, licenseNumber: updatedDriver.licenseNumber },
      },
    });

    return NextResponse.json(updatedDriver);
  } catch (error) {
    console.error('[DRIVER_PATCH_ERROR]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// 3. DELETE: Soft delete driver details by ID
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const roles = session.user.roles || [];
    if (!roles.includes('ADMIN') && !roles.includes('FLEET_MANAGER')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    const deletedDriver = await prisma.driver.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    // Create Audit Log
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: 'DRIVER_SOFT_DELETE',
        details: { driverId: id, licenseNumber: deletedDriver.licenseNumber },
      },
    });

    return NextResponse.json({ message: 'Driver soft-deleted successfully' });
  } catch (error) {
    console.error('[DRIVER_DELETE_ERROR]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
