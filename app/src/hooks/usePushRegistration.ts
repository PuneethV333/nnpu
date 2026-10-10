import { useCallback, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from './useAuth';
import { useRegisterDevice } from './useNotifications';
import { pushConfig } from '$/config/env';
import { getNotifications } from '$/config/notificationsModule';
import {
  ensureAndroidChannel,
  resolvePermission,
} from '$/config/notifications';

/**
 * Registers this device's NATIVE push token with the backend.
 *
 * Deliberately `getDevicePushTokenAsync()` (FCM/APNs token) and NOT
 * `getExpoPushTokenAsync()` — the backend sends via `firebase-admin`
 * (`FirebaseService.sendPush`), which needs a raw FCM token. Expo's push
 * service is a separate relay this project does not use.
 *
 * Requires a development build with Firebase native config; it does not work
 * in Expo Go, and `google-services.json` is gitignored (see .env.example).
 */
export const usePushRegistration = () => {
  // null in Expo Go, where expo-notifications cannot even be imported.
  const Notifications = getNotifications();
  const { isAuthenticated } = useAuth();
  const { mutate: registerDevice } = useRegisterDevice();
  const router = useRouter();

  // Guards against a second in-flight registration while one is still running
  // (React 18 strict mode double-invokes effects in dev).
  const registering = useRef(false);

  const register = useCallback(async () => {
    if (!Notifications) {
      console.info('[push] unavailable in Expo Go — use a development build');
      return;
    }

    if (!pushConfig.enabled) {
      console.info('[push] disabled via EXPO_PUBLIC_PUSH_ENABLED=false');
      return;
    }

    if (!pushConfig.projectId) {
      console.warn(
        '[push] EXPO_PUBLIC_FIREBASE_PROJECT_ID is not set — skipping registration.',
      );
      return;
    }

    if (registering.current) return;
    registering.current = true;

    try {
      await ensureAndroidChannel();

      const permission = await resolvePermission();
      if (permission !== 'granted') {
        console.info(`[push] permission not granted (${permission})`);
        return;
      }

      // Throws on Android emulators and iOS simulators, which have no push
      // transport. Not an error worth surfacing to the user.
      const token = await Notifications.getDevicePushTokenAsync();
      if (!token.data) {
        console.warn('[push] device returned an empty token');
        return;
      }

      registerDevice({
        token: token.data,
        platform: Platform.OS === 'ios' ? 'ios' : 'android',
      });
    } catch (err) {
      console.warn('[push] registration failed', err);
    } finally {
      registering.current = false;
    }
  }, [Notifications, registerDevice]);

  useEffect(() => {
    if (!isAuthenticated) return;
    void register();
  }, [isAuthenticated, register]);

  // Route a tap on a delivered notification to the notification list. Scoped to
  // this hook so the listener is torn down with it.
  useEffect(() => {
    if (!isAuthenticated || !Notifications) return;

    const subscription = Notifications.addNotificationResponseReceivedListener(
      () => router.push('/notification'),
    );

    return () => subscription.remove();
  }, [Notifications, isAuthenticated, router]);

  // Cold start: the app was launched by tapping a notification.
  useEffect(() => {
    if (!isAuthenticated || !Notifications) return;

    let cancelled = false;

    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (!cancelled && response) router.push('/notification');
    });

    return () => {
      cancelled = true;
    };
  }, [Notifications, isAuthenticated, router]);
};