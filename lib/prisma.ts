import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Build the client instance safely with the Prisma 7 driver adapter configuration
const getPrismaInstance = (): PrismaClient => {
  if (typeof window !== 'undefined') {
    // Return empty client for frontend bundle safety
    return new PrismaClient({} as Prisma.PrismaClientOptions);
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not defined.');
  }

  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);

  const client = new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

  return client;
};

export const prisma = globalForPrisma.prisma ?? getPrismaInstance();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
