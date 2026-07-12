'use server';

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address.'),
  password: z.string().min(6, 'Password must be at least 6 characters long.'),
});

export async function validateCredentials(values: z.infer<typeof loginSchema>) {
  try {
    // 1. Validate payload inputs with Zod
    const validated = loginSchema.safeParse(values);
    if (!validated.success) {
      return {
        success: false,
        error: validated.error.issues[0].message,
      };
    }

    const { email, password } = validated.data;

    // 2. Query Neon Database for user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.passwordHash) {
      return {
        success: false,
        error: 'Invalid email or password.',
      };
    }

    if (user.status !== 'ACTIVE') {
      return {
        success: false,
        error: 'Your account is currently inactive or suspended.',
      };
    }

    // 3. Compare password hashes
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      return {
        success: false,
        error: 'Invalid email or password.',
      };
    }

    // Return success to proceed with NextAuth client sign-in
    return {
      success: true,
    };
  } catch (error) {
    console.error('Login action error:', error);
    return {
      success: false,
      error: 'An unexpected authentication error occurred.',
    };
  }
}
