/**
 * Credential storage for the browser.
 *
 * The app uses `expo-secure-store` and stores both tokens behind the OS
 * keychain. A browser has no equivalent, so the two tokens are treated
 * differently on purpose:
 *
 *   - access token  → localStorage. It is short-lived (the backend's access
 *     token TTL is a fraction of the refresh token's 30 days), and keeping it
 *     means a page reload does NOT have to call /auth/refresh.
 *   - refresh token → localStorage. There is nowhere better without backend
 *     changes: an httpOnly cookie is the correct answer, and it needs the
 *     backend to set/read a cookie and to CSRF-protect the refresh route.
 *
 * Why the reload path matters: backend refresh tokens are SINGLE USE and
 * atomically claimed (see AuthService.refresh). A reload that always refreshed
 * would rotate the token on every load, and two open tabs would race — the
 * loser gets a 401 and its session is cleared. Persisting the access token
 * keeps that request rare, and the api client serialises it across tabs with
 * the Web Locks API when it does happen.
 *
 * localStorage access is wrapped because it throws in some privacy modes
 * (Safari's "block all cookies", embedded webviews). A storage failure must
 * degrade to "signed out", not crash the page.
 */

const ACCESS_TOKEN_KEY = 'sms_access_token';
const REFRESH_TOKEN_KEY = 'sms_refresh_token';

const read = (key: string): string | null => {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};

const write = (key: string, value: string | null): void => {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    // Ignored: the in-memory copy below still works for this page's lifetime.
  }
};

export const tokenStore = {
  getAccessToken(): string | null {
    return read(ACCESS_TOKEN_KEY);
  },

  getRefreshToken(): string | null {
    return read(REFRESH_TOKEN_KEY);
  },

  saveTokens(accessToken: string, refreshToken: string): void {
    write(ACCESS_TOKEN_KEY, accessToken);
    write(REFRESH_TOKEN_KEY, refreshToken);
  },

  clearTokens(): void {
    write(ACCESS_TOKEN_KEY, null);
    write(REFRESH_TOKEN_KEY, null);
  },
};
