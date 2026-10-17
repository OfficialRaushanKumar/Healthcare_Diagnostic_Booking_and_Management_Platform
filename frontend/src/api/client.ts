import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { API_V1 } from '../config/env';
import { deleteItem, getItem, setItem } from '../utils/storage';

const ACCESS = 'medibook.access';
const REFRESH = 'medibook.refresh';

let accessToken: string | null = null;
let onAuthLost: (() => void) | null = null;

export const tokenStore = {
  async load() { accessToken = await getItem(ACCESS); return { access: accessToken, refresh: await getItem(REFRESH) }; },
  async save(access: string, refresh?: string) {
    accessToken = access; await setItem(ACCESS, access);
    if (refresh) await setItem(REFRESH, refresh);
  },
  async clear() { accessToken = null; await deleteItem(ACCESS); await deleteItem(REFRESH); },
  refresh: () => getItem(REFRESH),
  setOnAuthLost(fn: () => void) { onAuthLost = fn; },
};

export const api = axios.create({ baseURL: API_V1, timeout: 20000, headers: { 'Content-Type': 'application/json' } });

api.interceptors.request.use((cfg) => {
  if (accessToken && !cfg.url?.startsWith('/auth/login') && !cfg.url?.startsWith('/auth/register')) {
    cfg.headers.Authorization = `Bearer ${accessToken}`;
  }
  return cfg;
});

let refreshing: Promise<string> | null = null;
async function refreshAccess(): Promise<string> {
  const refresh = await tokenStore.refresh();
  if (!refresh) throw new Error('no refresh token');
  const { data } = await axios.post(`${API_V1}/auth/token/refresh/`, { refresh }, { timeout: 20000 });
  await tokenStore.save(data.access, data.refresh); // refresh tokens rotate
  return data.access as string;
}

api.interceptors.response.use(
  (r) => r,
  async (error: AxiosError) => {
    const cfg = error.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined;
    const isAuthCall = cfg?.url?.startsWith('/auth/');
    if (error.response?.status === 401 && cfg && !cfg._retried && !isAuthCall) {
      cfg._retried = true;
      try {
        refreshing = refreshing ?? refreshAccess().finally(() => { refreshing = null; });
        const token = await refreshing;
        cfg.headers.Authorization = `Bearer ${token}`;
        return api(cfg);
      } catch {
        await tokenStore.clear();
        onAuthLost?.();
      }
    }
    return Promise.reject(error);
  },
);

export interface ApiError { message: string; status?: number; fields: Record<string, string>; network: boolean }

/** Turns any thrown error into a user-presentable shape using the backend error envelope. */
export function toApiError(e: unknown): ApiError {
  const err = e as AxiosError<{ error?: { message?: string; details?: unknown } }>;
  if (err?.isAxiosError) {
    if (!err.response) {
      return { message: 'Cannot reach the server. Check your connection and the API URL, then retry.', fields: {}, network: true };
    }
    const env = err.response.data?.error;
    const fields: Record<string, string> = {};
    let message = env?.message || 'Something went wrong. Please try again.';
    const d = env?.details;
    if (d && typeof d === 'object') {
      for (const [k, v] of Object.entries(d as Record<string, unknown>)) {
        const text = Array.isArray(v) ? v.join(' ') : typeof v === 'string' ? v : '';
        if (text) fields[k] = text;
      }
      const first = Object.values(fields)[0];
      if (first && message === 'Request could not be processed.') message = first;
    }
    if (err.response.status === 429) message = 'Too many attempts. Please wait a minute and try again.';
    return { message, status: err.response.status, fields, network: false };
  }
  return { message: (e as Error)?.message || 'Unexpected error.', fields: {}, network: false };
}
