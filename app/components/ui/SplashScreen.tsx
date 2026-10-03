import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Animated, Easing, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';

import { images } from '@/constants/image';

const SPLASH_BG = '#081126'; // matches app.json's splash backgroundColor

/**
 * Branded loading gate for the auth hand-off.
 *
 * `app/index.tsx` and `app/(auth)/_layout.tsx` both block on
 * `AuthContext.isLoading` while the stored access token is validated against
 * `GET /auth/me`. Previously that was a black spinner on white (and, in the
 * auth layout, a bare `null` — i.e. a blank white screen). Using the same
 * background as the native splash means no colour flash on hand-off.
 */
export const SplashScreen = ({
  message = 'Signing you in…',
  showSpinner = true,
}: {
  message?: string | null;
  showSpinner?: boolean;
}) => {
  // Held in state rather than a ref: interpolating a `useRef` value during
  // render trips the react-hooks/refs rule, and a state-held Animated.Value
  // behaves identically here (it is never set to a different object).
  const [pulse] = useState(() => new Animated.Value(0));

  const pulseStyle = useMemo(
    () => ({
      opacity: pulse.interpolate({
        inputRange: [0, 1],
        outputRange: [0.7, 1],
      }),
      transform: [
        {
          scale: pulse.interpolate({
            inputRange: [0, 1],
            outputRange: [0.97, 1.04],
          }),
        },
      ],
    }),
    [pulse],
  );

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <View
      className="flex-1 items-center justify-center px-8"
      style={{ backgroundColor: SPLASH_BG }}
    >
      <Animated.View style={pulseStyle}>
        <Image
          source={images.splashIcon}
          style={{ width: 96, height: 96 }}
          contentFit="contain"
          accessibilityLabel="NNPU Academy"
        />
      </Animated.View>

      <Text className="mt-6 text-lg font-bold tracking-wide text-white">
        NNPU Academy
      </Text>

      {message ? (
        <Text className="mt-2 text-sm text-gray-400">{message}</Text>
      ) : null}

      <View className="h-10" />

      {showSpinner ? <ActivityIndicator size="large" color="#60A5FA" /> : null}
    </View>
  );
};

export default SplashScreen;
