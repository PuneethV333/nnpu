import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

/**
 * Notification presentation + Android channel setup.
 *
 * `setNotificationHandler` MUST be registered once at module scope. Registering
 * it inside a component body re-runs it on every render, which races with
 * incoming notifications (and on Android the handler is read when a
 * notification is enqueued, so a late re-registration can be missed).
 */

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    // Show the banner/list entry even in the foreground — a teacher marking
    // attendance should see the reminder without leaving the screen.
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

/**
 * Android delivers nothing until a channel exists, and Android 8+ shows a
 * system prompt on first channel creation. Creating it at startup means that
 * prompt appears before the teacher is mid-task.
 */
export const ANDROID_CHANNEL_ID = 'default';

export const ensureAndroidChannel = async (): Promise<void> => {
  if (Platform.OS !== 'android') return;

  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: 'General',
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#2563EB',
    sound: 'default',
  });
};

/** Maps an expo-notifications permission result onto our tri-state. */
export const resolvePermission = async (): Promise<
  'granted' | 'denied' | 'undetermined'
> => {
  const current = await Notifications.getPermissionsAsync();

  if (current.status === 'granted') return 'granted';

  // iOS only ever asks once; asking again after a refusal is a no-op, so we
  // must not loop on it. Android allows re-prompting until permanently denied.
  if (current.status === 'denied' && Platform.OS === 'ios') return 'denied';

  const requested = await Notifications.requestPermissionsAsync();
  return requested.status === 'granted' ? 'granted' : 'denied';
};
