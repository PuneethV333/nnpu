/**
 * Runtime configuration.
 *
 * Only variables prefixed `EXPO_PUBLIC_` reach app code. Expo replaces
 * `process.env.FOO` with a literal at build time, so these MUST be read as
 * static member accesses — `process.env[name]` is not substituted (and the
 * `expo/no-dynamic-env-var` lint rule enforces it).
 *
 * `.env` is gitignored, so `.env.example` is the source of truth for which
 * variables must exist; copy it to `.env` and fill in the values.
 */

const nonEmpty = (value: string | undefined): string | undefined =>
  value && value.trim() !== '' ? value.trim() : undefined;

export const backendUrl = nonEmpty(process.env.EXPO_PUBLIC_API_URL);

/**
 * Firebase project the native build is wired to. Must match the project in
 * `google-services.json` / `GoogleService-Info.plist` and the
 * `FIREBASE_PROJECT_ID` the backend sends with.
 *
 * Used only as a build-time sanity check: if this and the native config
 * disagree, FCM registration fails deep in the native layer with an opaque
 * error, so we catch it up front and log something actionable instead.
 */
export const firebaseProjectId = nonEmpty(
  process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
);

/**
 * Escape hatch for local development on an emulator/simulator, where a native
 * push token cannot be obtained and `getDevicePushTokenAsync()` throws.
 * Set `EXPO_PUBLIC_PUSH_ENABLED=false` to skip registration entirely.
 */
export const pushEnabled =
  nonEmpty(process.env.EXPO_PUBLIC_PUSH_ENABLED) !== 'false';

export const pushConfig = {
  enabled: pushEnabled,
  projectId: firebaseProjectId,
} as const;
