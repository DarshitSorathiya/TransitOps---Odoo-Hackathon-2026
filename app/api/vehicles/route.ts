import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { vehicleSchema } from '@/types/vehicle';
import { Prisma, VehicleType, VehicleStatus } from '@prisma/client';

// 1. GET: Fetch paginated, searchable, filtered vehicles
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
    const type = searchParams.get('type') || '';
    const status = searchParams.get('status') || '';
    const archived = searchParams.get('archived') === 'true';

    const offset = (page - 1) * limit;

    // Build Prisma query filters
    const whereClause: Prisma.VehicleWhereInput = {
      deletedAt: archived ? { not: null } : null,
    };

    if (search) {
      whereClause.OR = [
        { make: { contains: search, mode: 'insensitive' } },
        { model: { contains: search, mode: 'insensitive' } },
        { licensePlate: { contains: search, mode: 'insensitive' } },
        { vin: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (type) {
      whereClause.type = type as VehicleType;
    }

    if (status) {
      whereClause.status = status as VehicleStatus;
    }

    // Query Neon Database
    const [vehicles, total] = await Promise.all([
      prisma.vehicle.findMany({
        where: whereClause,
        skip: offset,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.vehicle.count({ where: whereClause }),
    ]);

    return NextResponse.json({
      data: vehicles,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('[VEHICLES_GET_ERROR]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// 2. POST: Create a new vehicle
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
    const result = vehicleSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: 'Validation Error', details: result.error.format() }, { status: 400 });
    }

    // Verify uniqueness of licensePlate and VIN
    const existingVehicle = await prisma.vehicle.findFirst({
      where: {
        OR: [
          { licensePlate: result.data.licensePlate },
          { vin: result.data.vin },
        ],
      },
    });

    if (existingVehicle) {
      return NextResponse.json({ error: 'A vehicle with this license plate or VIN already exists.' }, { status: 400 });
    }

    const vehicle = await prisma.vehicle.create({
      data: result.data,
    });

    // Create Audit Log
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: 'VEHICLE_CREATE',
        details: { vehicleId: vehicle.id, licensePlate: vehicle.licensePlate },
      },
    });

    return NextResponse.json(vehicle, { status: 201 });
  } catch (error) {
    console.error('[VEHICLES_POST_ERROR]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
