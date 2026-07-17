import React, {
  createContext,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { CurrentUser, Role } from "$/types/auth";
import { tokenStore } from "$/store/tokenStore";
import * as authApi from "$/api/auth";
import { onSessionExpired } from "../api/client";
type AuthState = {
  isLoading: boolean;
  isAuthenticated: boolean;
  user: CurrentUser | null;
  role: Role | null;
};

type AuthContextValue = AuthState & {
  login: (authId: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | undefined>(
  undefined,
);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<AuthState>({
    isLoading: true,
    isAuthenticated: false,
    user: null,
    role: null,
  });

  const clearSession = useCallback(async () => {
    await tokenStore.clearTokens();
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

  useEffect(() => {
    (async () => {
      const accessToken = await tokenStore.getAccessToken();
      if (!accessToken) {
        setState((s) => ({ ...s, isLoading: false }));
        return;
      }

      try {
        await loadCurrentUser();
      } catch {
        await clearSession();
      }
    })();
  }, [loadCurrentUser, clearSession]);

  useEffect(() => {
    onSessionExpired(() => {
      void clearSession();
    });
  }, [clearSession]);

  const login = useCallback(
    async (authId: string, password: string) => {
      const res = await authApi.loginApi(authId, password);
      await tokenStore.saveTokens(res.accessToken, res.refreshToken);
      await loadCurrentUser();
    },
    [loadCurrentUser],
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch (err) {
      console.error(err);
    }
    await clearSession();
  }, [clearSession]);

  const value = useMemo(
    () => ({ ...state, login, logout, refreshUser: loadCurrentUser }),
    [state, login, logout, loadCurrentUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
