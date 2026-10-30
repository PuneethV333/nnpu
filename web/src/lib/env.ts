/**
 * Runtime configuration.
 *
 * Vite only inlines variables prefixed with `VITE_`, and only when they are
 * read as a static member access (`import.meta.env.VITE_API_URL`). Reading it
 * dynamically — `import.meta.env[key]` — yields `undefined` in a production
 * build, so keep this access literal.
 */

const rawApiUrl = import.meta.env.VITE_API_URL;

const trimmed = rawApiUrl?.trim().replace(/\/+$/, '') ?? '';

/**
 * The backend enables URI versioning with defaultVersion '1' and no controller
 * declares an explicit `@Version()`, so every route is served under `/v1`.
 * Without this suffix every request 404s.
 */
export const apiBaseUrl = trimmed ? `${trimmed}/v1` : null;

export function requireApiBaseUrl(): string {
  if (!apiBaseUrl) {
    throw new Error(
      'VITE_API_URL is not set. Copy web/.env.example to web/.env and point it at the backend, then restart the dev server.',
    );
  }
  return apiBaseUrl;
}
