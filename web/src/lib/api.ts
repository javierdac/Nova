import axios, { AxiosError, type AxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/store/auth';

const baseURL = import.meta.env.VITE_API_URL ?? '/api/v1';

export const api = axios.create({ baseURL, headers: { 'Content-Type': 'application/json' } });

// Attach the access token to every request.
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Transparent refresh-token rotation on 401.
let refreshing: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const { refreshToken, setTokens, clear } = useAuthStore.getState();
  if (!refreshToken) return null;
  try {
    const res = await axios.post(`${baseURL}/auth/refresh`, { refreshToken });
    const tokens = res.data.data as { accessToken: string; refreshToken: string };
    setTokens(tokens);
    return tokens.accessToken;
  } catch {
    clear();
    return null;
  }
}

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as AxiosRequestConfig & { _retry?: boolean };
    const isAuthCall = original?.url?.includes('/auth/');
    if (error.response?.status === 401 && original && !original._retry && !isAuthCall) {
      original._retry = true;
      refreshing = refreshing ?? refreshAccessToken();
      const token = await refreshing;
      refreshing = null;
      if (token) {
        original.headers = { ...original.headers, Authorization: `Bearer ${token}` };
        return api(original);
      }
    }
    return Promise.reject(error);
  },
);

/** Extracts a human-friendly message from an API error. */
export function apiError(err: unknown): string {
  if (axios.isAxiosError(err)) {
    return (err.response?.data as { error?: { message?: string } })?.error?.message ?? err.message;
  }
  return err instanceof Error ? err.message : 'Unexpected error';
}
