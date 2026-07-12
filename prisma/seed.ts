import { PrismaClient, UserRole, UserStatus, VehicleType, VehicleStatus, FuelType, DriverStatus, TripStatus, MaintenanceType, MaintenanceStatus, ExpenseCategory, ExpenseStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not defined in the environment.');
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding database starting...');

  // 1. Clean existing database records
  await prisma.activityLog.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.report.deleteMany({});
  await prisma.expense.deleteMany({});
  await prisma.fuelLog.deleteMany({});
  await prisma.maintenance.deleteMany({});
  await prisma.trip.deleteMany({});
  await prisma.driver.deleteMany({});
  await prisma.account.deleteMany({});
  await prisma.session.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.vehicle.deleteMany({});

  console.log('Database cleaned. Generating mock records...');

  const passwordHash = await bcrypt.hash('Password@123', 10);

  // 2. Create Users
  const admin = await prisma.user.create({
    data: {
      name: 'System Admin',
      email: 'admin@transitops.com',
      passwordHash,
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
    },
  });

  const manager = await prisma.user.create({
    data: {
      name: 'Fleet Manager Alex',
      email: 'manager@transitops.com',
      passwordHash,
      role: UserRole.FLEET_MANAGER,
      status: UserStatus.ACTIVE,
    },
  });

  const dispatcher = await prisma.user.create({
    data: {
      name: 'Dispatcher Chloe',
      email: 'dispatcher@transitops.com',
      passwordHash,
      role: UserRole.DISPATCHER,
      status: UserStatus.ACTIVE,
    },
  });

  const driverUser1 = await prisma.user.create({
    data: {
      name: 'Driver Michael',
      email: 'michael.driver@transitops.com',
      passwordHash,
      role: UserRole.DRIVER,
      status: UserStatus.ACTIVE,
    },
  });

  const driverUser2 = await prisma.user.create({
    data: {
      name: 'Driver Sarah',
      email: 'sarah.driver@transitops.com',
      passwordHash,
      role: UserRole.DRIVER,
      status: UserStatus.ACTIVE,
    },
  });

  console.log('Users created.');

  // 3. Create Drivers
  const driver1 = await prisma.driver.create({
    data: {
      userId: driverUser1.id,
      licenseNumber: 'DL-987654321',
      licenseClass: 'Class A CDL',
      licenseExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000 * 2), // 2 years expiry
      status: DriverStatus.AVAILABLE,
      phoneNumber: '+1 (555) 123-4567',
      emergencyContact: 'Jane Doe (+1 (555) 123-4560)',
      safetyScore: 94.5,
    },
  });

  const driver2 = await prisma.driver.create({
    data: {
      userId: driverUser2.id,
      licenseNumber: 'DL-123456789',
      licenseClass: 'Class B CDL',
      licenseExpiry: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000), // 6 months expiry
      status: DriverStatus.AVAILABLE,
      phoneNumber: '+1 (555) 987-6543',
      emergencyContact: 'John Smith (+1 (555) 987-6540)',
      safetyScore: 98.2,
    },
  });

  console.log(`Driver profiles created for ${driver1.licenseNumber} and ${driver2.licenseNumber}.`);

  // 4. Create Vehicles
  const vehicle1 = await prisma.vehicle.create({
    data: {
      make: 'Freightliner',
      model: 'Cascadia',
      year: 2022,
      vin: '1FVACWDB3NH123456',
      licensePlate: 'TX-FL-9988',
      type: VehicleType.TRUCK,
      status: VehicleStatus.AVAILABLE,
      fuelType: FuelType.DIESEL,
      odometer: 145000.5,
      payloadCapacity: 15000.0, // 15 tons
      insuranceExpiry: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 3 months expiry
      acquisitionCost: 125000.00,
      acquisitionDate: new Date('2022-04-12'),
    },
  });

  const vehicle2 = await prisma.vehicle.create({
    data: {
      make: 'Ford',
      model: 'E-Transit',
      year: 2023,
      vin: '1FTBW1EV5NKA654321',
      licensePlate: 'CA-EV-4422',
      type: VehicleType.VAN,
      status: VehicleStatus.AVAILABLE,
      fuelType: FuelType.ELECTRIC,
      odometer: 12450.2,
      payloadCapacity: 1600.0, // 1.6 tons
      insuranceExpiry: new Date(Date.now() + 150 * 24 * 60 * 60 * 1000), // 5 months expiry
      acquisitionCost: 55000.00,
      acquisitionDate: new Date('2023-08-19'),
    },
  });

  console.log('Vehicles created.');

  // 5. Create Maintenance records
  await prisma.maintenance.create({
    data: {
      vehicleId: vehicle1.id,
      driverId: driver1.id,
      type: MaintenanceType.PREVENTIVE,
      status: MaintenanceStatus.COMPLETED,
      description: 'Regular engine oil and filter change. Brake pad thickness inspection.',
      cost: 450.00,
      odometer: 142000.0,
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000), // 4 hours later
    },
  });

  await prisma.maintenance.create({
    data: {
      vehicleId: vehicle2.id,
      type: MaintenanceType.INSPECTION,
      status: MaintenanceStatus.SCHEDULED,
      description: 'Annual electrical drivetrain and battery degradation inspection.',
      cost: 0.00,
      odometer: 12450.2,
      startDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    },
  });

  console.log('Maintenance records created.');

  // 6. Create Fuel logs
  await prisma.fuelLog.create({
    data: {
      vehicleId: vehicle1.id,
      driverId: driver1.id,
      date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      odometer: 144500.0,
      fuelAmount: 220.50, // liters
      cost: 385.00,
      fuelStation: 'Loves Travel Stop #431',
    },
  });

  console.log('Fuel logs created.');

  // 7. Create Trips
  const trip = await prisma.trip.create({
    data: {
      vehicleId: vehicle1.id,
      driverId: driver1.id,
      dispatcherId: dispatcher.id,
      status: TripStatus.SCHEDULED,
      startLocation: 'Dallas Logistics Hub, TX',
      endLocation: 'Houston Port Terminal, TX',
      plannedDeparture: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
      plannedArrival: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000 + 5 * 60 * 60 * 1000), // 5 hours trip
      notes: 'Contains perishable food items. Refrigeration system must remain active.',
    },
  });

  console.log('Trips created.');

  // 8. Create Expenses
  await prisma.expense.create({
    data: {
      vehicleId: vehicle1.id,
      driverId: driver1.id,
      tripId: trip.id,
      category: ExpenseCategory.TOLL,
      amount: 45.50,
      date: new Date(),
      description: 'TX-99 Loop Toll Charges',
      status: ExpenseStatus.APPROVED,
      approvedById: manager.id,
    },
  });

  console.log('Expenses created.');

  // 9. Create Activity Logs
  await prisma.activityLog.create({
    data: {
      userId: admin.id,
      action: 'SYSTEM_INITIALIZATION',
      details: { message: 'Database was successfully seeded with mock entries.' },
    },
  });

  console.log('Activity logs created.');
  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
