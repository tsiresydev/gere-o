export type UserRole = 'EMPLOYEE' | 'MANAGER' | 'ADMIN';

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}
