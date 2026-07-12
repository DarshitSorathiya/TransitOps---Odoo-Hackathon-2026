import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createMaintenanceAction } from '@/actions/maintenance/actions';
import { MaintenanceStatus, MaintenancePriority, MaintenanceType, Prisma } from '@prisma/client';

// 1. GET: Fetch paginated maintenance logs + stats
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.max(1, parseInt(searchParams.get('limit') || '10'));
    const offset = (page - 1) * limit;

    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const priority = searchParams.get('priority') || '';
    const type = searchParams.get('type') || '';
    const archived = searchParams.get('archived') === 'true';

    // Construct filters
    const whereClause: Prisma.MaintenanceWhereInput = {
      deletedAt: archived ? { not: null } : null,
    };

    if (status) {
      whereClause.status = status as MaintenanceStatus;
    }
    if (priority) {
      whereClause.priority = priority as MaintenancePriority;
    }
    if (type) {
      whereClause.type = type as MaintenanceType;
    }

    if (search) {
      whereClause.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { technician: { contains: search, mode: 'insensitive' } },
        {
          vehicle: {
            OR: [
              { licensePlate: { contains: search, mode: 'insensitive' } },
              { make: { contains: search, mode: 'insensitive' } },
              { model: { contains: search, mode: 'insensitive' } },
            ],
          },
        },
      ];
    }

    // Query logs and stats in parallel
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const [logs, total, vehiclesInShop, pendingCount, completedTodayCount, avgCostRes, upcomingCount] = await Promise.all([
      prisma.maintenance.findMany({
        where: whereClause,
        include: {
          vehicle: {
            select: {
              make: true,
              model: true,
              licensePlate: true,
              odometer: true,
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
        },
        skip: offset,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.maintenance.count({ where: whereClause }),
      prisma.vehicle.count({ where: { status: 'IN_SHOP', deletedAt: null } }),
      prisma.maintenance.count({ where: { status: MaintenanceStatus.PENDING, deletedAt: null } }),
      prisma.maintenance.count({
        where: {
          status: MaintenanceStatus.COMPLETED,
          endDate: { gte: startOfToday, lte: endOfToday },
          deletedAt: null,
        },
      }),
      prisma.maintenance.aggregate({
        where: { status: MaintenanceStatus.COMPLETED, deletedAt: null },
        _avg: { actualCost: true },
      }),
      prisma.maintenance.count({
        where: {
          status: MaintenanceStatus.APPROVED,
          startDate: { gt: new Date() },
          deletedAt: null,
        },
      }),
    ]);

    return NextResponse.json({
      data: logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      stats: {
        vehiclesInMaintenance: vehiclesInShop,
        pendingRequests: pendingCount,
        completedToday: completedTodayCount,
        avgCost: avgCostRes._avg.actualCost ? Number(avgCostRes._avg.actualCost) : 0,
        upcomingCount,
      },
    });
  } catch (error) {
    console.error('[MAINTENANCE_GET_ERROR]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// 2. POST: Create a new maintenance request
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const result = await createMaintenanceAction(body);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result.data, { status: 201 });
  } catch (error) {
    console.error('[MAINTENANCE_POST_ERROR]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
