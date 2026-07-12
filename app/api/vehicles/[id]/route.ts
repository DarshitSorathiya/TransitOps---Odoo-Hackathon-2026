import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { vehicleSchema } from '@/types/vehicle';
import { Prisma } from '@prisma/client';

// 1. GET: Fetch vehicle by ID
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

    const vehicle = await prisma.vehicle.findUnique({
      where: { id },
    });

    if (!vehicle) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
    }

    return NextResponse.json(vehicle);
  } catch (error) {
    console.error('[VEHICLE_GET_BY_ID_ERROR]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// 2. PATCH: Update vehicle by ID
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

    // Partial validation for patch update
    const result = vehicleSchema.partial().safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: 'Validation Error', details: result.error.format() }, { status: 400 });
    }

    // Verify if licensePlate or VIN is being changed and is already taken
    if (result.data.licensePlate || result.data.vin) {
      const uniqueClauses: Prisma.VehicleWhereInput[] = [];
      if (result.data.licensePlate) uniqueClauses.push({ licensePlate: result.data.licensePlate });
      if (result.data.vin) uniqueClauses.push({ vin: result.data.vin });

      const existingVehicle = await prisma.vehicle.findFirst({
        where: {
          AND: [
            { id: { not: id } },
            { OR: uniqueClauses },
          ],
        },
      });

      if (existingVehicle) {
        return NextResponse.json({ error: 'A vehicle with this license plate or VIN already exists.' }, { status: 400 });
      }
    }

    const updatedVehicle = await prisma.vehicle.update({
      where: { id },
      data: result.data,
    });

    // Create Audit Log
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: 'VEHICLE_UPDATE',
        details: { vehicleId: id, licensePlate: updatedVehicle.licensePlate },
      },
    });

    return NextResponse.json(updatedVehicle);
  } catch (error) {
    console.error('[VEHICLE_PATCH_ERROR]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// 3. DELETE: Soft delete vehicle by ID
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

    // Set deletedAt to current time
    const deletedVehicle = await prisma.vehicle.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    // Create Audit Log
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: 'VEHICLE_SOFT_DELETE',
        details: { vehicleId: id, licensePlate: deletedVehicle.licensePlate },
      },
    });

    return NextResponse.json({ message: 'Vehicle soft-deleted successfully' });
  } catch (error) {
    console.error('[VEHICLE_DELETE_ERROR]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
