'use server';

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { maintenanceSchema, maintenanceTransitionSchema } from '@/types/maintenance';
import { MaintenanceStatus, VehicleStatus, Prisma } from '@prisma/client';
import { revalidatePath } from 'next/cache';

// Helper to check user session authorization
async function getAuthorizedUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    throw new Error('Unauthorized: Session not found');
  }
  return session.user;
}

function enforceManagerOrAdmin(roles: string[]) {
  if (!roles.includes('ADMIN') && !roles.includes('FLEET_MANAGER')) {
    throw new Error('Forbidden: Insufficient permissions');
  }
}

// 1. Create maintenance request
export async function createMaintenanceAction(values: z.infer<typeof maintenanceSchema>) {
  try {
    const user = await getAuthorizedUser();
    enforceManagerOrAdmin(user.roles || []);

    const validated = maintenanceSchema.safeParse(values);
    if (!validated.success) {
      return { success: false, error: 'Validation Error: ' + validated.error.issues[0].message };
    }

    const data = validated.data;

    // Verify vehicle exists
    const vehicle = await prisma.vehicle.findUnique({ where: { id: data.vehicleId } });
    if (!vehicle) return { success: false, error: 'Vehicle not found.' };

    const maintenance = await prisma.maintenance.create({
      data: {
        vehicleId: data.vehicleId,
        driverId: data.driverId,
        title: data.title,
        description: data.description,
        priority: data.priority,
        type: data.type,
        technician: data.technician,
        estimatedCost: data.estimatedCost,
        actualCost: data.actualCost,
        startDate: data.startDate,
        endDate: data.endDate,
        notes: data.notes,
        odometer: vehicle.odometer,
        status: MaintenanceStatus.PENDING,
      },
    });

    // Log Activity
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: 'MAINTENANCE_CREATE',
        details: { maintenanceId: maintenance.id, vehiclePlate: vehicle.licensePlate },
      },
    });

    revalidatePath('/maintenance');
    return { success: true, data: maintenance };
  } catch (error: unknown) {
    console.error('createMaintenanceAction error:', error);
    const err = error instanceof Error ? error.message : 'Failed to create maintenance log.';
    return { success: false, error: err };
  }
}

// 2. Update maintenance details
export async function updateMaintenanceAction(id: string, values: z.infer<typeof maintenanceSchema>) {
  try {
    const user = await getAuthorizedUser();
    enforceManagerOrAdmin(user.roles || []);

    const validated = maintenanceSchema.safeParse(values);
    if (!validated.success) {
      return { success: false, error: 'Validation Error: ' + validated.error.issues[0].message };
    }

    const data = validated.data;

    const existing = await prisma.maintenance.findUnique({ where: { id } });
    if (!existing) return { success: false, error: 'Maintenance record not found.' };

    if (existing.status === MaintenanceStatus.COMPLETED || existing.status === MaintenanceStatus.CANCELLED) {
      return { success: false, error: 'Cannot edit a closed or cancelled maintenance record.' };
    }

    const updated = await prisma.maintenance.update({
      where: { id },
      data: {
        vehicleId: data.vehicleId,
        driverId: data.driverId,
        title: data.title,
        description: data.description,
        priority: data.priority,
        type: data.type,
        technician: data.technician,
        estimatedCost: data.estimatedCost,
        actualCost: data.actualCost,
        startDate: data.startDate,
        endDate: data.endDate,
        notes: data.notes,
      },
    });

    // Log Activity
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: 'MAINTENANCE_UPDATE',
        details: { maintenanceId: id },
      },
    });

    revalidatePath('/maintenance');
    return { success: true, data: updated };
  } catch (error: unknown) {
    console.error('updateMaintenanceAction error:', error);
    const err = error instanceof Error ? error.message : 'Failed to update maintenance details.';
    return { success: false, error: err };
  }
}

// 3. Soft Delete maintenance request
export async function deleteMaintenanceAction(id: string) {
  try {
    const user = await getAuthorizedUser();
    enforceManagerOrAdmin(user.roles || []);

    const existing = await prisma.maintenance.findUnique({ where: { id } });
    if (!existing) return { success: false, error: 'Maintenance record not found.' };

    if (existing.status === MaintenanceStatus.IN_PROGRESS) {
      return { success: false, error: 'Cannot delete an active maintenance service in shop.' };
    }

    await prisma.maintenance.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    // Log Activity
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: 'MAINTENANCE_DELETE',
        details: { maintenanceId: id },
      },
    });

    revalidatePath('/maintenance');
    return { success: true };
  } catch (error: unknown) {
    console.error('deleteMaintenanceAction error:', error);
    const err = error instanceof Error ? error.message : 'Failed to delete maintenance request.';
    return { success: false, error: err };
  }
}

// 4. Transition Maintenance Status
export async function transitionMaintenanceStatusAction(id: string, values: z.infer<typeof maintenanceTransitionSchema>) {
  try {
    const user = await getAuthorizedUser();
    enforceManagerOrAdmin(user.roles || []);

    const validated = maintenanceTransitionSchema.safeParse(values);
    if (!validated.success) {
      return { success: false, error: 'Validation Error: ' + validated.error.issues[0].message };
    }

    const { action, actualCost, notes } = validated.data;

    // Fetch record with vehicle info
    const maintenance = await prisma.maintenance.findUnique({
      where: { id },
      include: { vehicle: true },
    });

    if (!maintenance) return { success: false, error: 'Maintenance record not found.' };
    if (maintenance.deletedAt) return { success: false, error: 'Cannot transition a deleted maintenance record.' };

    const { status: currentStatus, vehicle } = maintenance;

    if (action === 'APPROVE') {
      if (currentStatus !== MaintenanceStatus.PENDING) {
        return { success: false, error: 'Only pending requests can be approved.' };
      }

      await prisma.$transaction([
        prisma.maintenance.update({
          where: { id },
          data: { status: MaintenanceStatus.APPROVED },
        }),
        prisma.activityLog.create({
          data: {
            userId: user.id,
            action: 'MAINTENANCE_APPROVE',
            details: { maintenanceId: id, vehiclePlate: vehicle.licensePlate },
          },
        }),
      ]);
    } else if (action === 'START') {
      if (currentStatus !== MaintenanceStatus.APPROVED && currentStatus !== MaintenanceStatus.PENDING) {
        return { success: false, error: 'Only pending or approved requests can start.' };
      }

      // Check Business Rule: Vehicle must not be on an active trip
      if (vehicle.status === VehicleStatus.ON_TRIP) {
        return {
          success: false,
          error: `Cannot start maintenance: Vehicle is currently on active transit. Complete or cancel the active trip first.`,
        };
      }

      await prisma.$transaction([
        prisma.maintenance.update({
          where: { id },
          data: { status: MaintenanceStatus.IN_PROGRESS, startDate: new Date() },
        }),
        prisma.vehicle.update({
          where: { id: vehicle.id },
          data: { status: VehicleStatus.IN_SHOP },
        }),
        prisma.activityLog.create({
          data: {
            userId: user.id,
            action: 'MAINTENANCE_START',
            details: { maintenanceId: id, vehiclePlate: vehicle.licensePlate },
          },
        }),
      ]);
    } else if (action === 'COMPLETE') {
      if (currentStatus !== MaintenanceStatus.IN_PROGRESS) {
        return { success: false, error: 'Only maintenance services currently in progress can be completed.' };
      }

      const endCost = actualCost !== undefined && actualCost !== null ? new Prisma.Decimal(actualCost) : maintenance.estimatedCost;

      await prisma.$transaction([
        prisma.maintenance.update({
          where: { id },
          data: {
            status: MaintenanceStatus.COMPLETED,
            actualCost: endCost,
            endDate: new Date(),
            notes: notes ?? maintenance.notes,
          },
        }),
        // Only set status back to AVAILABLE if the vehicle is not RETIRED
        prisma.vehicle.update({
          where: { id: vehicle.id },
          data: {
            status: vehicle.status === VehicleStatus.RETIRED ? VehicleStatus.RETIRED : VehicleStatus.AVAILABLE,
          },
        }),
        prisma.activityLog.create({
          data: {
            userId: user.id,
            action: 'MAINTENANCE_COMPLETE',
            details: { maintenanceId: id, actualCost: Number(endCost), vehiclePlate: vehicle.licensePlate },
          },
        }),
      ]);
    } else if (action === 'CANCEL') {
      if (currentStatus === MaintenanceStatus.COMPLETED || currentStatus === MaintenanceStatus.CANCELLED) {
        return { success: false, error: 'Cannot cancel a completed or already cancelled maintenance service.' };
      }

      const wasActive = currentStatus === MaintenanceStatus.IN_PROGRESS;

      const updates: Prisma.PrismaPromise<unknown>[] = [
        prisma.maintenance.update({
          where: { id },
          data: {
            status: MaintenanceStatus.CANCELLED,
            endDate: new Date(),
            notes: notes ?? maintenance.notes,
          },
        }),
        prisma.activityLog.create({
          data: {
            userId: user.id,
            action: 'MAINTENANCE_CANCEL',
            details: { maintenanceId: id, vehiclePlate: vehicle.licensePlate },
          },
        }),
      ];

      // If vehicle was already in the shop, release it back to AVAILABLE (unless retired)
      if (wasActive) {
        updates.push(
          prisma.vehicle.update({
            where: { id: vehicle.id },
            data: {
              status: vehicle.status === VehicleStatus.RETIRED ? VehicleStatus.RETIRED : VehicleStatus.AVAILABLE,
            },
          })
        );
      }

      await prisma.$transaction(updates);
    }

    revalidatePath('/maintenance');
    return { success: true };
  } catch (error: unknown) {
    console.error('transitionMaintenanceStatusAction error:', error);
    const err = error instanceof Error ? error.message : 'Failed to transition maintenance status.';
    return { success: false, error: err };
  }
}
