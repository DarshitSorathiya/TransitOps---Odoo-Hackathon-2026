import { z } from 'zod';
import { VehicleType, VehicleStatus, FuelType } from '@prisma/client';

export const vehicleSchema = z.object({
  make: z.string().min(2, 'Make must be at least 2 characters.'),
  model: z.string().min(2, 'Model must be at least 2 characters.'),
  year: z.coerce.number().int().min(1900).max(new Date().getFullYear() + 1, 'Invalid vehicle year.'),
  vin: z.string().length(17, 'VIN must be exactly 17 characters.'),
  licensePlate: z.string().min(2, 'License plate must be at least 2 characters.'),
  type: z.nativeEnum(VehicleType),
  status: z.nativeEnum(VehicleStatus).default(VehicleStatus.AVAILABLE),
  fuelType: z.nativeEnum(FuelType),
  odometer: z.coerce.number().min(0, 'Odometer cannot be negative.'),
  payloadCapacity: z.coerce.number().min(0, 'Payload capacity must be positive.'),
  insuranceExpiry: z.coerce.string().transform((val) => new Date(val)),
  acquisitionCost: z.coerce.number().min(0, 'Acquisition cost must be positive.'),
  acquisitionDate: z.coerce.string().transform((val) => new Date(val)),
});

export type VehicleFormValues = z.infer<typeof vehicleSchema>;
