'use server';

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { tripSchema, tripTransitionSchema } from '@/types/trip';
import { TripStatus, VehicleStatus, DriverStatus, Prisma } from '@prisma/client';
import { revalidatePath } from 'next/cache';

// Helper to check user session authorization
async function getAuthenticatedUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    throw new Error('Unauthorized');
  }
  return session.user;
}

// Helper to check for Manager/Admin role
function enforceManagerOrAdmin(roles: string[]) {
  if (!roles.includes('ADMIN') && !roles.includes('FLEET_MANAGER')) {
    throw new Error('Forbidden: Insufficient permissions');
  }
}

// 1. Create Trip (DRAFT by default)
export async function createTripAction(values: z.infer<typeof tripSchema>) {
  try {
    const user = await getAuthenticatedUser();
    enforceManagerOrAdmin(user.roles);

    const validated = tripSchema.safeParse(values);
    if (!validated.success) {
      return { success: false, error: 'Validation Error: ' + validated.error.issues[0].message };
    }

    const data = validated.data;

    // Generate next unique trip number
    const count = await prisma.trip.count();
    const tripNumber = `TRIP-${String(count + 1001)}`;

    // Verify Vehicle & Driver exist
    const vehicle = await prisma.vehicle.findUnique({ where: { id: data.vehicleId } });
    if (!vehicle) return { success: false, error: 'Vehicle not found.' };

    const driver = await prisma.driver.findUnique({ where: { id: data.driverId } });
    if (!driver) return { success: false, error: 'Driver not found.' };

    const trip = await prisma.trip.create({
      data: {
        tripNumber,
        vehicleId: data.vehicleId,
        driverId: data.driverId,
        dispatcherId: user.id,
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

    // Audit Log
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: 'TRIP_CREATE',
        details: { tripId: trip.id, tripNumber },
      },
    });

    revalidatePath('/trips');
    return { success: true, data: trip };
  } catch (error: unknown) {
    console.error('createTripAction error:', error);
    const err = error instanceof Error ? error.message : 'Failed to create trip.';
    return { success: false, error: err };
  }
}

// 2. Update Trip (Only allowed if status is DRAFT or DISPATCHED)
export async function updateTripAction(id: string, values: z.infer<typeof tripSchema>) {
  try {
    const user = await getAuthenticatedUser();
    enforceManagerOrAdmin(user.roles);

    const validated = tripSchema.safeParse(values);
    if (!validated.success) {
      return { success: false, error: 'Validation Error: ' + validated.error.issues[0].message };
    }

    const data = validated.data;

    const existingTrip = await prisma.trip.findUnique({ where: { id } });
    if (!existingTrip) return { success: false, error: 'Trip not found.' };

    if (existingTrip.status === TripStatus.COMPLETED || existingTrip.status === TripStatus.CANCELLED) {
      return { success: false, error: 'Cannot update a completed or cancelled trip.' };
    }

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

    // Audit Log
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: 'TRIP_UPDATE',
        details: { tripId: id, tripNumber: existingTrip.tripNumber },
      },
    });

    revalidatePath('/trips');
    return { success: true, data: updatedTrip };
  } catch (error: unknown) {
    console.error('updateTripAction error:', error);
    const err = error instanceof Error ? error.message : 'Failed to update trip.';
    return { success: false, error: err };
  }
}

// 3. Delete Trip (Soft Delete, only allowed if status is DRAFT or CANCELLED)
export async function deleteTripAction(id: string) {
  try {
    const user = await getAuthenticatedUser();
    enforceManagerOrAdmin(user.roles);

    const existingTrip = await prisma.trip.findUnique({ where: { id } });
    if (!existingTrip) return { success: false, error: 'Trip not found.' };

    if (existingTrip.status === TripStatus.DISPATCHED) {
      return { success: false, error: 'Cannot delete an active dispatched trip. Cancel it first.' };
    }

    if (existingTrip.status === TripStatus.COMPLETED) {
      return { success: false, error: 'Cannot delete a completed trip for audit integrity.' };
    }

    // Soft delete
    await prisma.trip.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    // Audit Log
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: 'TRIP_DELETE',
        details: { tripId: id, tripNumber: existingTrip.tripNumber },
      },
    });

    revalidatePath('/trips');
    return { success: true };
  } catch (error: unknown) {
    console.error('deleteTripAction error:', error);
    const err = error instanceof Error ? error.message : 'Failed to delete trip.';
    return { success: false, error: err };
  }
}

// 4. Transition Trip Status (State Machine Lifecycle Flow)
export async function transitionTripStatusAction(id: string, values: z.infer<typeof tripTransitionSchema>) {
  try {
    const user = await getAuthenticatedUser();
    // Managers & Dispatchers can dispatch/cancel. Drivers can complete their own trips.
    const isManagerOrAdmin = user.roles.includes('ADMIN') || user.roles.includes('FLEET_MANAGER');
    const isDriver = user.roles.includes('DRIVER');

    const validated = tripTransitionSchema.safeParse(values);
    if (!validated.success) {
      return { success: false, error: 'Validation Error: ' + validated.error.issues[0].message };
    }

    const { action, actualArrival, actualDistance, endOdometer, notes } = validated.data;

    // Fetch the Trip with related Vehicle/Driver profiles
    const trip = await prisma.trip.findUnique({
      where: { id },
      include: {
        vehicle: true,
        driver: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!trip) return { success: false, error: 'Trip not found.' };
    if (trip.deletedAt) return { success: false, error: 'Cannot transition a deleted trip.' };

    // Strict Authorization Rules
    if (action === 'DISPATCH' || action === 'CANCEL') {
      if (!isManagerOrAdmin) {
        return { success: false, error: 'Forbidden: Only managers and dispatchers can dispatch or cancel trips.' };
      }
    } else if (action === 'COMPLETE') {
      // Driver of this trip or manager can complete it
      if (!isManagerOrAdmin && (!isDriver || trip.driver.userId !== user.id)) {
        return { success: false, error: 'Forbidden: You are not assigned to complete this trip.' };
      }
    }

    // DISPATCH Transition (DRAFT -> DISPATCHED)
    if (action === 'DISPATCH') {
      if (trip.status !== TripStatus.DRAFT) {
        return { success: false, error: 'Only Draft trips can be dispatched.' };
      }

      const vehicle = trip.vehicle;
      const driver = trip.driver;

      // Business Rule Check: Driver License Expiration
      if (new Date(driver.licenseExpiry) < new Date()) {
        return { success: false, error: `Cannot dispatch: Driver license is expired (Expired on: ${new Date(driver.licenseExpiry).toLocaleDateString()}).` };
      }

      // Business Rule Check: Vehicle capacity limit check
      if (trip.cargoWeight > vehicle.payloadCapacity) {
        return { success: false, error: `Cannot dispatch: Cargo weight (${trip.cargoWeight} kg) exceeds vehicle payload capacity (${vehicle.payloadCapacity} kg).` };
      }

      // Business Rule Check: Vehicle status availability
      if (vehicle.status !== VehicleStatus.AVAILABLE) {
        return { success: false, error: `Cannot dispatch: Vehicle is currently ${vehicle.status.toLowerCase().replace('_', ' ')}.` };
      }

      // Business Rule Check: Driver status availability
      if (driver.status !== DriverStatus.AVAILABLE) {
        return { success: false, error: `Cannot dispatch: Driver is currently ${driver.status.toLowerCase().replace('_', ' ')}.` };
      }

      // Transactional updates: Mark trip dispatched, and set statuses to ON_TRIP
      await prisma.$transaction([
        prisma.trip.update({
          where: { id },
          data: {
            status: TripStatus.DISPATCHED,
            actualDeparture: new Date(),
            startOdometer: vehicle.odometer,
            notes: notes ?? trip.notes,
          },
        }),
        prisma.vehicle.update({
          where: { id: vehicle.id },
          data: { status: VehicleStatus.ON_TRIP },
        }),
        prisma.driver.update({
          where: { id: driver.id },
          data: { status: DriverStatus.ON_TRIP },
        }),
        prisma.activityLog.create({
          data: {
            userId: user.id,
            action: 'TRIP_DISPATCH',
            details: { tripId: id, tripNumber: trip.tripNumber, vehicleId: vehicle.id, driverId: driver.id },
          },
        }),
      ]);
    }

    // COMPLETE Transition (DISPATCHED -> COMPLETED)
    else if (action === 'COMPLETE') {
      if (trip.status !== TripStatus.DISPATCHED) {
        return { success: false, error: 'Only Dispatched active trips can be completed.' };
      }

      if (!actualArrival) return { success: false, error: 'Actual completion arrival date is required.' };
      if (!actualDistance || actualDistance <= 0) return { success: false, error: 'Valid actual distance is required.' };
      if (!endOdometer) return { success: false, error: 'Odometer reading at completion is required.' };

      const vehicle = trip.vehicle;
      const driver = trip.driver;

      // Business Rule Check: Mileage integrity check
      if (endOdometer < vehicle.odometer) {
        return { success: false, error: `Cannot complete: End odometer (${endOdometer}) cannot be less than start odometer (${vehicle.odometer}).` };
      }

      await prisma.$transaction([
        prisma.trip.update({
          where: { id },
          data: {
            status: TripStatus.COMPLETED,
            actualArrival,
            actualDistance,
            endOdometer,
            notes: notes ?? trip.notes,
          },
        }),
        prisma.vehicle.update({
          where: { id: vehicle.id },
          data: {
            status: VehicleStatus.AVAILABLE,
            odometer: endOdometer,
          },
        }),
        prisma.driver.update({
          where: { id: driver.id },
          data: { status: DriverStatus.AVAILABLE },
        }),
        prisma.activityLog.create({
          data: {
            userId: user.id,
            action: 'TRIP_COMPLETE',
            details: { tripId: id, tripNumber: trip.tripNumber, distance: actualDistance, endOdometer },
          },
        }),
      ]);
    }

    // CANCEL Transition (DRAFT/DISPATCHED -> CANCELLED)
    else if (action === 'CANCEL') {
      if (trip.status === TripStatus.COMPLETED || trip.status === TripStatus.CANCELLED) {
        return { success: false, error: 'Cannot cancel a trip that is already completed or cancelled.' };
      }

      const wasActive = trip.status === TripStatus.DISPATCHED;

      const updates: Prisma.PrismaPromise<unknown>[] = [
        prisma.trip.update({
          where: { id },
          data: {
            status: TripStatus.CANCELLED,
            notes: notes ?? trip.notes,
          },
        }),
        prisma.activityLog.create({
          data: {
            userId: user.id,
            action: 'TRIP_CANCEL',
            details: { tripId: id, tripNumber: trip.tripNumber },
          },
        }),
      ];

      // If it was already active, release the vehicle and driver back to AVAILABLE
      if (wasActive) {
        updates.push(
          prisma.vehicle.update({
            where: { id: trip.vehicleId },
            data: { status: VehicleStatus.AVAILABLE },
          })
        );
        updates.push(
          prisma.driver.update({
            where: { id: trip.driverId },
            data: { status: DriverStatus.AVAILABLE },
          })
        );
      }

      await prisma.$transaction(updates);
    }

    revalidatePath('/trips');
    return { success: true };
  } catch (error: unknown) {
    console.error('transitionTripStatusAction error:', error);
    const err = error instanceof Error ? error.message : 'Failed to transition trip status.';
    return { success: false, error: err };
  }
}
