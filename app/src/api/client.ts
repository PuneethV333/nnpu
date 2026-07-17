import { AxiosError, create, InternalAxiosRequestConfig } from "axios";
import { backendUrl } from "$/config/env";
import { tokenStore } from "$/store/tokenStore";
import { RefreshResponseSchema } from "$/types/auth";


type SessionExpiredListener = () => void;
let sessionExpiredListener: SessionExpiredListener | null = null;
export function onSessionExpired(listener: SessionExpiredListener) {
  sessionExpiredListener = listener;
}

export const api = create({
  baseURL: backendUrl,
  timeout: 15000
})

api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await tokenStore.getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
})

const refreshClient = create({
  baseURL: backendUrl,
  timeout: 15000
})

let refreshPromise: Promise<string | null> | null = null

const refreshAccessToken = async () => {
  const refreshToken = await tokenStore.getRefreshToken();
  if (!refreshAccessToken) return null;

  const res = await refreshClient.post('/auth/refresh', { refreshToken });
  const parsed = RefreshResponseSchema.parse(res.data);
  await tokenStore.saveTokens(parsed.accessToken, parsed.refreshToken);
  return parsed.accessToken;
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as | (InternalAxiosRequestConfig & { _retried?: boolean }) | null;
    const is401 = error.response?.status === 401;
    if (!is401 || !originalRequest || originalRequest._retried) {
      return Promise.reject(error);
    }

    originalRequest._retried = true;

    try {
      if (!refreshPromise) {
        refreshPromise = refreshAccessToken().finally(() => {
          refreshPromise = null
        })

        const newAccessToken = await refreshPromise;

        if (!newAccessToken) {
          throw new Error('no refresh token available');
        }

        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
        return api(originalRequest);

      }
    } catch (refreshError) {
      await tokenStore.clearTokens();
      sessionExpiredListener?.();
      return Promise.reject(refreshError);
    }
  }
)