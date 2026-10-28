import { isRunningInExpoGo } from 'expo';

/**
 * Since SDK 53, merely IMPORTING `expo-notifications` on Android can throw
 * (SDK 58: "Cannot find native module 'ExpoTopicSubscriptionModule'"). A static
 * import in any file reachable from `app/_layout.tsx` then stops the root
 * layout from loading at all — which surfaces as the misleading
 * `Route "./_layout.tsx" is missing the required default export` warning
 * followed by `Cannot read property 'ErrorBoundary' of undefined`.
 *
 * Push needs a development build here anyway (native FCM token), so outside a
 * dev/prod build this returns `null` and every caller treats push as
 * unavailable.
 *
 * The detection deliberately uses `isRunningInExpoGo()` from `expo` rather than
 * `Constants.executionEnvironment === ExecutionEnvironment.StoreClient`. The
 * latter was the previous check and no longer reports `storeClient` in Expo Go
 * under SDK 58, so the guard silently evaluated false and the `require` ran
 * anyway. `isRunningInExpoGo()` is the same helper `expo-notifications` itself
 * uses internally to decide whether it is in Expo Go.
 */
export const isExpoGo = isRunningInExpoGo();

type NotificationsModule = typeof import('expo-notifications');

let cached: NotificationsModule | null | undefined;

const load = (): NotificationsModule | null => {
  if (isExpoGo) return null;

  // A dev-client build made before `expo-notifications` was added to app.json
  // has no native module for it either — the JS bundle reloads, the native
  // side does not. Requiring it would throw at import time. Treat that the
  // same as Expo Go instead of taking the root layout down with it.
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-notifications') as NotificationsModule;
  } catch (err) {
    console.warn(
      '[push] expo-notifications could not be loaded (needs a development ' +
        'build with the plugin applied):',
      err,
    );
    return null;
  }
};

export const getNotifications = (): NotificationsModule | null => {
  if (cached !== undefined) return cached;
  cached = load();
  return cached;
};
