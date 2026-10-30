import { AxiosError, create, type InternalAxiosRequestConfig } from 'axios';
import { requireApiBaseUrl } from './env';
import { tokenStore } from './tokenStore';
import { RefreshResponseSchema } from '@/types/auth';

const apiBaseUrl = requireApiBaseUrl();

type SessionExpiredListener = () => void;
let sessionExpiredListener: SessionExpiredListener | null = null;

export function onSessionExpired(listener: SessionExpiredListener): () => void {
  sessionExpiredListener = listener;
  return () => {
    if (sessionExpiredListener === listener) sessionExpiredListener = null;
  };
}

export const api = create({
  baseURL: apiBaseUrl,
  timeout: 15000,
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = tokenStore.getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const refreshClient = create({ baseURL: apiBaseUrl, timeout: 15000 });

/**
 * Serialises refresh across tabs.
 *
 * Backend refresh tokens are single use: `AuthService.refresh` claims the row
 * with a `deleteMany` before minting a replacement, so exactly one caller can
 * ever redeem a given token. With two tabs open, both hitting a 401 at the same
 * time, the loser would receive 401 → clear its tokens → appear signed out.
 * Holding a Web Lock means the second tab waits and then reads the pair the
 * winner just wrote instead of racing it.
 *
 * Browsers without the Web Locks API (older Safari) fall through to the single
 * in-page queue below, which is correct per tab.
 */
const withRefreshLock = async <T>(fn: () => Promise<T>): Promise<T> => {
  const locks = typeof navigator !== 'undefined' ? navigator.locks : undefined;
  if (!locks) return fn();
  return locks.request('sms-token-refresh', fn);
};

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const attempted = tokenStore.getRefreshToken();
  if (!attempted) return null;

  return withRefreshLock(async () => {
    const current = tokenStore.getRefreshToken();

    // Signed out (in this tab or another) while we were waiting for the lock.
    if (!current) return null;

    // Another tab already rotated the pair. Use its access token rather than
    // redeeming a refresh token that no longer exists.
    if (current !== attempted) {
      return tokenStore.getAccessToken();
    }

    const res = await refreshClient.post('/auth/refresh', {
      refreshToken: current,
    });
    const parsed = RefreshResponseSchema.parse(res.data);
    tokenStore.saveTokens(parsed.accessToken, parsed.refreshToken);
    return parsed.accessToken;
  });
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as
      (InternalAxiosRequestConfig & { _retried?: boolean }) | null;
    const is401 = error.response?.status === 401;

    // Same exemptions as the app's client, for the same reasons:
    //   /auth/login   — a 401 there means a wrong password, not an expired
    //                   session. Routing it through refresh would replace the
    //                   caller's 401 with "no refresh token available" and wipe
    //                   a session the user still had.
    //   /auth/refresh — it IS the refresh.
    // Everything else, including /auth/me, must refresh: it is the first call
    // on every page load, so exempting it silently signs people out whenever
    // the access token has aged out.
    const url = originalRequest?.url ?? '';
    const isCredentialEndpoint =
      url.includes('/auth/login') || url.includes('/auth/refresh');

    if (
      !is401 ||
      !originalRequest ||
      originalRequest._retried ||
      isCredentialEndpoint
    ) {
      return Promise.reject(error);
    }

    originalRequest._retried = true;

    try {
      // A second 401 while a refresh is already in flight must join that
      // refresh, not skip it — falling through would resolve with `undefined`
      // and blow up on the caller's `res.data`.
      if (!refreshPromise) {
        refreshPromise = refreshAccessToken().finally(() => {
          refreshPromise = null;
        });
      }

      const newAccessToken = await refreshPromise;

      if (!newAccessToken) {
        throw new Error('no refresh token available');
      }

      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
      return api(originalRequest);
    } catch (refreshError) {
      tokenStore.clearTokens();
      sessionExpiredListener?.();
      return Promise.reject(refreshError);
    }
  },
);
