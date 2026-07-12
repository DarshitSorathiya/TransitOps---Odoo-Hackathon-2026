import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(
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

    // Restore vehicle by setting deletedAt to null
    const restoredVehicle = await prisma.vehicle.update({
      where: { id },
      data: { deletedAt: null },
    });

    // Create Audit Log
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: 'VEHICLE_RESTORE',
        details: { vehicleId: id, licensePlate: restoredVehicle.licensePlate },
      },
    });

    return NextResponse.json({ message: 'Vehicle restored successfully', data: restoredVehicle });
  } catch (error) {
    console.error('[VEHICLE_RESTORE_ERROR]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
