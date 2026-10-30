import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { tokenStore } from '@/lib/tokenStore';
import * as authApi from '@/api/auth';
import { onSessionExpired } from '@/lib/apiClient';
import { AuthContext, type AuthState } from '@/context/AuthContext';

/**
 * Owns the session for the whole site: bootstrap, sign in, sign out.
 *
 * Mirrors app/src/context/AuthContext.tsx so the two clients cannot drift in
 * how they treat a token.
 */
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<AuthState>({
    isLoading: true,
    isAuthenticated: false,
    user: null,
    role: null,
  });

  const clearSession = useCallback(() => {
    tokenStore.clearTokens();
    setState({
      isLoading: false,
      isAuthenticated: false,
      user: null,
      role: null,
    });
  }, []);

  const loadCurrentUser = useCallback(async () => {
    const me = await authApi.getMe();
    setState({
      isLoading: false,
      isAuthenticated: true,
      user: me.data,
      role: me.data.role,
    });
  }, []);

  /**
   * On load, one request settles everything.
   *
   * When only a refresh token is present (access token aged out) `/auth/me`
   * answers 401, the api client refreshes, and the request is retried — so
   * there is no separate "refresh first" branch that could disagree with the
   * interceptor.
   */
  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const hasSession =
        tokenStore.getAccessToken() !== null ||
        tokenStore.getRefreshToken() !== null;

      if (!hasSession) {
        clearSession();
        return;
      }

      try {
        await loadCurrentUser();
      } catch {
        if (!cancelled) clearSession();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [loadCurrentUser, clearSession]);

  useEffect(
    () =>
      onSessionExpired(() => {
        clearSession();
      }),
    [clearSession],
  );

  const login = useCallback(
    async (authId: string, password: string) => {
      const res = await authApi.loginApi(authId, password);
      tokenStore.saveTokens(res.accessToken, res.refreshToken);
      await loadCurrentUser();
    },
    [loadCurrentUser],
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Clear local credentials even when the server is unreachable.
    } finally {
      clearSession();
    }
  }, [clearSession]);

  const value = useMemo(
    () => ({ ...state, login, logout, refreshUser: loadCurrentUser }),
    [state, login, logout, loadCurrentUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
