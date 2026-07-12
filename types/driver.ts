import { z } from 'zod';
import { DriverStatus } from '@prisma/client';

export const driverSchema = z.object({
  userId: z.string().uuid('Invalid user mapping ID.').nullable().optional(),
  licenseNumber: z.string().min(5, 'License number must be at least 5 characters.'),
  licenseClass: z.string().min(2, 'License category class must be specified.'),
  licenseExpiry: z.coerce.date(),
  status: z.nativeEnum(DriverStatus).default(DriverStatus.AVAILABLE),
  phoneNumber: z.string().min(10, 'Phone number must be at least 10 digits.'),
  emergencyContact: z.string().optional().nullable(),
  safetyScore: z.coerce.number().min(0).max(100, 'Safety score must be between 0 and 100.').default(100.0),
});

export type DriverFormValues = z.infer<typeof driverSchema>;
