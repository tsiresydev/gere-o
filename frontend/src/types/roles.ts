import type { UserRole } from './user';

export const ROLE_LABELS: Record<UserRole, string> = {
  EMPLOYEE: 'Collaborateur',
  MANAGER: 'Manager',
  ADMIN: 'Administrateur',
};

export function roleClass(role: UserRole): string {
  return role.toLowerCase();
}
