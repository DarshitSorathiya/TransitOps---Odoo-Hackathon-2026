export type RoleName = 'ADMIN' | 'FLEET_MANAGER' | 'DRIVER' | 'SAFETY_OFFICER' | 'FINANCIAL_ANALYST';

export interface UserRoleResponse {
  role: {
    name: string;
  };
}

export interface SessionUser {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  roles: RoleName[];
}

export interface LoginResponse {
  success: boolean;
  message?: string;
  redirectUrl?: string;
}
