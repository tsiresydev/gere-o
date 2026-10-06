import type { User } from './user';

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface LoginResponse {
  accessToken: string;
  user: User;
}

export type AuthStatus = 'loading' | 'authenticated' | 'anonymous';
