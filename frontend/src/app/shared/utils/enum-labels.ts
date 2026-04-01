import { UserRole } from '../models/auth.model';

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.FOUNDER]: 'Founder',
  [UserRole.INVESTOR]: 'Investor',
  [UserRole.COFOUNDER]: 'Co-Founder',
  [UserRole.ADMIN]: 'Administrator'
};

export function getRoleLabel(role: UserRole | string | null): string {
  if (!role) return 'Unknown Role';
  return USER_ROLE_LABELS[role as UserRole] || role;
}
