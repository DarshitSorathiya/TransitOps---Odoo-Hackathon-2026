import { z } from 'zod';
import { Trip, Driver } from '@prisma/client';

export type TripWithDetails = Trip & {
  vehicle: {
    make: string;
    model: string;
    licensePlate: string;
    odometer: number;
    payloadCapacity: number;
  };
  driver: Driver & {
    user: {
      name: string | null;
      email: string | null;
      image: string | null;
    } | null;
  };
  dispatcher?: {
    name: string | null;
  };
};

export const tripSchema = z.object({
  vehicleId: z.string().uuid('Please select a valid vehicle.'),
  driverId: z.string().uuid('Please select a valid driver.'),
  startLocation: z.string().min(2, 'Start location is required.'),
  endLocation: z.string().min(2, 'Destination is required.'),
  plannedDeparture: z.coerce.date(),
  plannedArrival: z.coerce.date(),
  cargoWeight: z.coerce.number().min(0, 'Cargo weight must be positive.'),
  plannedDistance: z.coerce.number().min(0, 'Planned distance must be positive.'),
  notes: z.string().optional().nullable(),
});

export const tripTransitionSchema = z.object({
  action: z.enum(['DISPATCH', 'COMPLETE', 'CANCEL']),
  actualArrival: z.coerce.date().optional(),
  actualDistance: z.coerce.number().optional(),
  endOdometer: z.coerce.number().optional(),
  notes: z.string().optional().nullable(),
});

export type TripFormValues = z.infer<typeof tripSchema>;
export type TripTransitionValues = z.infer<typeof tripTransitionSchema>;
