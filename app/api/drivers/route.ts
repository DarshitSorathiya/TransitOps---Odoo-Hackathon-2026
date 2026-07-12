import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { driverSchema } from '@/types/driver';
import { Prisma, DriverStatus } from '@prisma/client';

// 1. GET: Fetch paginated, filtered, and searchable drivers
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

    // Build query filters with Prisma types
    const whereClause: Prisma.DriverWhereInput = {
      deletedAt: archived ? { not: null } : null,
    };

    if (search) {
      whereClause.OR = [
        { licenseNumber: { contains: search, mode: 'insensitive' } },
        { licenseClass: { contains: search, mode: 'insensitive' } },
        { phoneNumber: { contains: search, mode: 'insensitive' } },
        {
          user: {
            name: { contains: search, mode: 'insensitive' },
          },
        },
      ];
    }

    if (status) {
      whereClause.status = status as DriverStatus;
    }

    // Query database and include optional User profile fields
    const [drivers, total] = await Promise.all([
      prisma.driver.findMany({
        where: whereClause,
        include: {
          user: {
            select: {
              name: true,
              email: true,
              image: true,
            },
          },
        },
        skip: offset,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.driver.count({ where: whereClause }),
    ]);

    return NextResponse.json({
      data: drivers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('[DRIVERS_GET_ERROR]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// 2. POST: Register a new driver
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
    const result = driverSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: 'Validation Error', details: result.error.format() }, { status: 400 });
    }

    // Verify uniqueness of licenseNumber
    const existingDriver = await prisma.driver.findFirst({
      where: {
        licenseNumber: result.data.licenseNumber,
      },
    });

    if (existingDriver) {
      return NextResponse.json({ error: 'A driver with this license number already exists.' }, { status: 400 });
    }

    // If userId is mapped, verify it isn't already assigned to another driver profile
    if (result.data.userId) {
      const alreadyAssignedUser = await prisma.driver.findUnique({
        where: { userId: result.data.userId },
      });
      if (alreadyAssignedUser) {
        return NextResponse.json({ error: 'This user account is already assigned to a driver profile.' }, { status: 400 });
      }
    }

    const driver = await prisma.driver.create({
      data: {
        userId: result.data.userId,
        licenseNumber: result.data.licenseNumber,
        licenseClass: result.data.licenseClass,
        licenseExpiry: result.data.licenseExpiry,
        status: result.data.status,
        phoneNumber: result.data.phoneNumber,
        emergencyContact: result.data.emergencyContact,
        safetyScore: result.data.safetyScore,
      },
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
        action: 'DRIVER_CREATE',
        details: { driverId: driver.id, licenseNumber: driver.licenseNumber },
      },
    });

    return NextResponse.json(driver, { status: 201 });
  } catch (error) {
    console.error('[DRIVERS_POST_ERROR]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
