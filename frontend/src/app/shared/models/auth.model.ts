export enum UserRole {
  FOUNDER = 'FOUNDER',
  INVESTOR = 'INVESTOR',
  COFOUNDER = 'COFOUNDER',
  ADMIN = 'ADMIN'
}

export function parseUserRole(role: string | null | undefined): UserRole {
  if (!role) return UserRole.COFOUNDER; // Fallback default
  const upperRole = role.toUpperCase().replace('ROLE_', '');
  
  if (Object.values(UserRole).includes(upperRole as UserRole)) {
    return upperRole as UserRole;
  }
  
  return UserRole.COFOUNDER; // Fallback for unknown strings
}

export interface AuthSession {
  token: string | null;
  email: string | null;
  role: UserRole | null;
  userId: number | null;
  status: 'anonymous' | 'authenticating' | 'authenticated' | 'refreshing' | 'expired';
}

export interface LoginResponse {
  token: string;
  email: string;
  role: string;
  userId: number;
}
