import { createContext } from 'react';
import type { CurrentUser, Role } from '@/types/auth';

export type AuthState = {
  isLoading: boolean;
  isAuthenticated: boolean;
  user: CurrentUser | null;
  role: Role | null;
};

export type AuthContextValue = AuthState & {
  login: (authId: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

/**
 * Kept in its own file so `AuthProvider.tsx` exports a component and nothing
 * else — react-refresh can only hot-replace a module whose exports are all
 * components.
 */
export const AuthContext = createContext<AuthContextValue | undefined>(
  undefined,
);
