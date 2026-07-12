import { z } from 'zod';
import { MaintenanceType, MaintenanceStatus, MaintenancePriority, Maintenance, Vehicle, Driver, User } from '@prisma/client';

export type MaintenanceWithDetails = Maintenance & {
  vehicle: {
    make: string;
    model: string;
    licensePlate: string;
    odometer: number;
  };
  driver: (Driver & {
    user: {
      name: string | null;
      email: string | null;
      image: string | null;
    } | null;
  }) | null;
};

export const maintenanceSchema = z.object({
  vehicleId: z.string().uuid('Please select a valid vehicle.'),
  driverId: z.string().uuid('Please select a valid driver.').optional().nullable(),
  title: z.string().min(3, 'Issue title must be at least 3 characters.'),
  description: z.string().min(5, 'Issue description must be at least 5 characters.'),
  priority: z.nativeEnum(MaintenancePriority),
  type: z.nativeEnum(MaintenanceType),
  technician: z.string().min(2, 'Technician name is required.'),
  estimatedCost: z.coerce.number().min(0, 'Estimated cost must be positive.'),
  actualCost: z.coerce.number().min(0, 'Actual cost must be positive.').optional().nullable(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const maintenanceTransitionSchema = z.object({
  action: z.enum(['APPROVE', 'START', 'COMPLETE', 'CANCEL']),
  actualCost: z.coerce.number().min(0, 'Actual cost must be positive.').optional().nullable(),
  notes: z.string().optional().nullable(),
});

export type MaintenanceFormValues = z.infer<typeof maintenanceSchema>;
export type MaintenanceTransitionValues = z.infer<typeof maintenanceTransitionSchema>;
