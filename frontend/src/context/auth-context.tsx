import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { authService } from '../services/auth.service';
import { getToken } from '../services/api';
import type { AuthStatus, LoginInput, RegisterInput } from '../types/auth';
import type { User } from '../types/user';

interface AuthContextValue {
  user: User | null;
  status: AuthStatus;
  login: (credentials: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>(() =>
    getToken() ? 'loading' : 'anonymous',
  );

  useEffect(() => {
    if (!getToken()) {
      return;
    }

    let cancelled = false;

    authService
      .me()
      .then((me) => {
        if (!cancelled) {
          setUser(me);
          setStatus('authenticated');
        }
      })
      .catch(() => {
        if (!cancelled) {
          authService.logout();
          setUser(null);
          setStatus('anonymous');
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (credentials: LoginInput) => {
    const response = await authService.login(credentials);
    setUser(response.user);
    setStatus('authenticated');
  }, []);

  const register = useCallback(async (input: RegisterInput) => {
    await authService.register(input);
    const response = await authService.login({
      email: input.email,
      password: input.password,
    });
    setUser(response.user);
    setStatus('authenticated');
  }, []);

  const logout = useCallback(() => {
    authService.logout();
    setUser(null);
    setStatus('anonymous');
  }, []);

  const value = useMemo(
    () => ({ user, status, login, register, logout }),
    [user, status, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth doit être utilisé dans un AuthProvider');
  }

  return context;
}
