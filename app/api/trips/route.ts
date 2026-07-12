import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { tripSchema } from '@/types/trip';
import { Prisma, TripStatus } from '@prisma/client';

// 1. GET: Fetch paginated, searchable, filtered trips
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const archived = searchParams.get('archived') === 'true';

    const offset = (page - 1) * limit;

    // Build filter query
    const whereClause: Prisma.TripWhereInput = {
      deletedAt: archived ? { not: null } : null,
    };

    if (search) {
      whereClause.OR = [
        { tripNumber: { contains: search, mode: 'insensitive' } },
        { startLocation: { contains: search, mode: 'insensitive' } },
        { endLocation: { contains: search, mode: 'insensitive' } },
        { vehicle: { licensePlate: { contains: search, mode: 'insensitive' } } },
        { vehicle: { make: { contains: search, mode: 'insensitive' } } },
        { vehicle: { model: { contains: search, mode: 'insensitive' } } },
        {
          driver: {
            OR: [
              { licenseNumber: { contains: search, mode: 'insensitive' } },
              { phoneNumber: { contains: search, mode: 'insensitive' } },
              {
                user: {
                  name: { contains: search, mode: 'insensitive' },
                },
              },
            ],
          },
        },
      ];
    }

    if (status) {
      whereClause.status = status as TripStatus;
    }

    // Query Neon Database and Operational KPIs in parallel
    const [trips, total, activeTrips, completedTrips, cancelledTrips, totalDistanceRes, vehiclesOnTrip, driversOnTrip] = await Promise.all([
      prisma.trip.findMany({
        where: whereClause,
        include: {
          vehicle: {
            select: {
              make: true,
              model: true,
              licensePlate: true,
              odometer: true,
              payloadCapacity: true,
            },
          },
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
            },
          },
        },
        skip: offset,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.trip.count({ where: whereClause }),
      prisma.trip.count({ where: { status: 'DISPATCHED', deletedAt: null } }),
      prisma.trip.count({ where: { status: 'COMPLETED', deletedAt: null } }),
      prisma.trip.count({ where: { status: 'CANCELLED', deletedAt: null } }),
      prisma.trip.aggregate({
        where: { status: 'COMPLETED', deletedAt: null },
        _sum: { actualDistance: true },
      }),
      prisma.vehicle.count({ where: { status: 'ON_TRIP', deletedAt: null } }),
      prisma.driver.count({ where: { status: 'ON_TRIP', deletedAt: null } }),
    ]);

    return NextResponse.json({
      data: trips,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      stats: {
        activeTrips,
        completedTrips,
        cancelledTrips,
        totalDistance: totalDistanceRes._sum.actualDistance || 0,
        vehiclesOnTrip,
        driversOnTrip,
      },
    });
  } catch (error) {
    console.error('[TRIPS_GET_ERROR]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// 2. POST: Create a new trip
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const roles = session.user.roles || [];
    if (!roles.includes('ADMIN') && !roles.includes('FLEET_MANAGER')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const result = tripSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: 'Validation Error', details: result.error.format() }, { status: 400 });
    }

    const data = result.data;

    // Verify Vehicle & Driver exist
    const vehicleExists = await prisma.vehicle.findUnique({ where: { id: data.vehicleId } });
    if (!vehicleExists) {
      return NextResponse.json({ error: 'Vehicle not found.' }, { status: 400 });
    }

    const driverExists = await prisma.driver.findUnique({ where: { id: data.driverId } });
    if (!driverExists) {
      return NextResponse.json({ error: 'Driver not found.' }, { status: 400 });
    }

    // Auto-generate numeric string for tripNumber sequence e.g., TRIP-1002
    const count = await prisma.trip.count();
    const tripNumber = `TRIP-${String(count + 1001)}`;

    const trip = await prisma.trip.create({
      data: {
        tripNumber,
        vehicleId: data.vehicleId,
        driverId: data.driverId,
        dispatcherId: session.user.id,
        status: TripStatus.DRAFT,
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
        action: 'TRIP_CREATE',
        details: { tripId: trip.id, tripNumber: trip.tripNumber },
      },
    });

    return NextResponse.json(trip, { status: 201 });
  } catch (error) {
    console.error('[TRIPS_POST_ERROR]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
