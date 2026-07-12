import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { tripSchema } from '@/types/trip';
import { TripStatus } from '@prisma/client';

type Params = Promise<{ id: string }>;

// 1. GET: Fetch a single trip details
export async function GET(req: NextRequest, { params }: { params: Params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const trip = await prisma.trip.findUnique({
      where: { id },
      include: {
        vehicle: true,
        driver: {
          include: {
            user: {
              select: {
                name: true,
                email: true,
                image: true,
              },
            },
          },
        },
        dispatcher: {
          select: {
            name: true,
            email: true,
          },
        },
        expenses: {
          orderBy: { date: 'desc' },
        },
      },
    });

    if (!trip) {
      return NextResponse.json({ error: 'Trip not found.' }, { status: 404 });
    }

    return NextResponse.json(trip);
  } catch (error) {
    console.error('[TRIP_GET_ERROR]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// 2. PATCH: Update a trip details
export async function PATCH(req: NextRequest, { params }: { params: Params }) {
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

    const trip = await prisma.trip.findUnique({ where: { id } });
    if (!trip) {
      return NextResponse.json({ error: 'Trip not found.' }, { status: 404 });
    }

    if (trip.status === TripStatus.COMPLETED || trip.status === TripStatus.CANCELLED) {
      return NextResponse.json({ error: 'Cannot update a completed or cancelled trip.' }, { status: 400 });
    }

    const body = await req.json();
    const result = tripSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: 'Validation Error', details: result.error.format() }, { status: 400 });
    }

    const data = result.data;

    // Verify Vehicle & Driver exist
    const vehicleExists = await prisma.vehicle.findUnique({ where: { id: data.vehicleId } });
    if (!vehicleExists) return NextResponse.json({ error: 'Vehicle not found.' }, { status: 400 });

    const driverExists = await prisma.driver.findUnique({ where: { id: data.driverId } });
    if (!driverExists) return NextResponse.json({ error: 'Driver not found.' }, { status: 400 });

    const updatedTrip = await prisma.trip.update({
      where: { id },
      data: {
        vehicleId: data.vehicleId,
        driverId: data.driverId,
        startLocation: data.startLocation,
        endLocation: data.endLocation,
        plannedDeparture: data.plannedDeparture,
        plannedArrival: data.plannedArrival,
        cargoWeight: data.cargoWeight,
        plannedDistance: data.plannedDistance,
        notes: data.notes,
      },
    });

    // Create Audit Log
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: 'TRIP_UPDATE',
        details: { tripId: id, tripNumber: trip.tripNumber },
      },
    });

    return NextResponse.json(updatedTrip);
  } catch (error) {
    console.error('[TRIP_PATCH_ERROR]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// 3. DELETE: Soft delete a trip
export async function DELETE(req: NextRequest, { params }: { params: Params }) {
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

    const trip = await prisma.trip.findUnique({ where: { id } });
    if (!trip) {
      return NextResponse.json({ error: 'Trip not found.' }, { status: 404 });
    }

    if (trip.status === TripStatus.DISPATCHED) {
      return NextResponse.json({ error: 'Cannot delete an active dispatched trip. Cancel it first.' }, { status: 400 });
    }

    if (trip.status === TripStatus.COMPLETED) {
      return NextResponse.json({ error: 'Cannot delete a completed trip for audit integrity.' }, { status: 400 });
    }

    // Soft delete
    await prisma.trip.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    // Create Audit Log
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: 'TRIP_DELETE',
        details: { tripId: id, tripNumber: trip.tripNumber },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[TRIP_DELETE_ERROR]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
