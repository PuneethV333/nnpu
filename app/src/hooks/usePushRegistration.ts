/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { useAuth } from './useAuth';
import { useRegisterDevice } from './useNotifications';

export const usePushRegistration = () => {
  const { isAuthenticated } = useAuth();
  const { mutate: registerDevice } = useRegisterDevice();

  useEffect(() => {
    if (!isAuthenticated) return;

    const register = async () => {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        return;
      }

      const { data: token } = await Notifications.getDevicePushTokenAsync();

      registerDevice({
        token,
        platform: Platform.OS === 'ios' ? 'ios' : 'android',
      });
    };

    register();
  }, [isAuthenticated]);


  Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});
};