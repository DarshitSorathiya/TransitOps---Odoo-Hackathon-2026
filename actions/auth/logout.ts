'use server';

import { prisma } from '@/lib/prisma';

export async function logUserLogout(userId: string) {
  try {
    await prisma.activityLog.create({
      data: {
        userId,
        action: 'USER_LOGOUT',
        details: { message: 'User logged out of the platform.' },
      },
    });
    return { success: true };
  } catch (error) {
    console.error('Failed to log user logout activity:', error);
    return { success: false };
  }
}
