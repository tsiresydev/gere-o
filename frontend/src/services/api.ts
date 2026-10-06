const TOKEN_KEY = 'gere-o.accessToken';
const API_BASE = '/api';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

const readMessage = (body: unknown): string | null => {
  if (typeof body !== 'object' || body === null) {
    return null;
  }

  const message = (body as { message?: unknown }).message;

  if (Array.isArray(message)) {
    return message.filter((item) => typeof item === 'string').join(' — ');
  }

  if (typeof message === 'string') {
    return message;
  }

  return null;
};

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const body = response.status === 204 ? null : await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(response.status, readMessage(body) ?? `Erreur ${response.status}`);
  }

  return body as T;
}
