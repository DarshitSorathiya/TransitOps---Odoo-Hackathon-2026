'use client';

import { useSession } from 'next-auth/react';
import { RoleName } from '@/types/auth';

export function useCurrentUser() {
  const { data: session, status } = useSession();

  const user = session?.user;
  const roles = (user?.roles || []) as RoleName[];
  const isLoading = status === 'loading';
  const isAuthenticated = status === 'authenticated';

  const hasRole = (role: RoleName): boolean => {
    if (!isAuthenticated || !roles) return false;
    return roles.includes(role);
  };

  const hasAnyRole = (targetRoles: RoleName[]): boolean => {
    if (!isAuthenticated || !roles) return false;
    return targetRoles.some((role) => roles.includes(role));
  };

  return {
    user,
    roles,
    isLoading,
    isAuthenticated,
    hasRole,
    hasAnyRole,
  };
}
