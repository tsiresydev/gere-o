import type { LoginInput, LoginResponse, RegisterInput } from '../types/auth';
import type { User } from '../types/user';
import { api, clearToken, setToken } from './api';

export const authService = {
  async login(credentials: LoginInput): Promise<LoginResponse> {
    const response = await api<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });

    setToken(response.accessToken);

    return response;
  },

  async register(input: RegisterInput): Promise<User> {
    return await api<User>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  async me(): Promise<User> {
    return await api<User>('/auth/me');
  },

  logout(): void {
    clearToken();
  },
};
