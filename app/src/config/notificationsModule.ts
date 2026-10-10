import Constants, { ExecutionEnvironment } from 'expo-constants';

/**
 * Since SDK 53, merely IMPORTING `expo-notifications` throws on Android inside
 * Expo Go. A static import in any file reachable from `app/_layout.tsx` then
 * stops the root layout from loading at all (hence the "missing default
 * export" warning that follows the error).
 *
 * Push needs a development build here anyway (native FCM token), so in Expo Go
 * this returns `null` and every caller treats push as unavailable. In a dev or
 * production build it loads the real module.
 */
export const isExpoGo =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

type NotificationsModule = typeof import('expo-notifications');

let cached: NotificationsModule | null | undefined;

export const getNotifications = (): NotificationsModule | null => {
  if (cached !== undefined) return cached;
  // Deferred require on purpose — see the note above. CI lints with
  // --max-warnings 0, so the rule needs an explicit exemption here rather
  // than the file being quietly excluded from linting.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  cached = isExpoGo ? null : (require('expo-notifications') as NotificationsModule);
  return cached;
};
