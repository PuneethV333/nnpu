import React, { useEffect } from 'react';
import { Animated, Easing, View, type ViewStyle } from 'react-native';

/**
 * Skeleton primitives.
 *
 * Every block shares ONE looping `Animated.Value` (see `pulse` below) instead
 * of each block running its own loop, so a screen showing 40 skeleton rows
 * still only schedules a single opacity animation on the native driver.
 * Deliberately no reanimated dependency — the built-in Animated API with
 * `useNativeDriver` is enough for opacity and keeps the bundle small.
 */

const DRIVER_MS = 700;
const MIN_OPACITY = 0.45;

const driver = new Animated.Value(0);
let driverStarted = false;

/**
 * Started lazily on the first mounted skeleton and intentionally never
 * stopped: a single native-driven opacity loop is effectively free, and
 * stop/start churn across route changes is a common source of skeletons
 * flashing at full opacity on re-entry.
 */
const ensureDriver = () => {
  if (driverStarted) return;
  driverStarted = true;
  Animated.loop(
    Animated.sequence([
      Animated.timing(driver, {
        toValue: 1,
        duration: DRIVER_MS,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(driver, {
        toValue: 0,
        duration: DRIVER_MS,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
    ]),
  ).start();
};

export const RADIUS = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  full: 999,
} as const;

export type SkeletonRadius = keyof typeof RADIUS;

type SkeletonProps = {
  width?: number | `${number}%`;
  height?: number;
  radius?: SkeletonRadius | number;
  /** Shifts this block's phase within the loop, to make a wave across rows. */
  phase?: number;
  style?: ViewStyle | ViewStyle[];
};

/** A single pulsing block. The base primitive everything else composes. */
export const Skeleton = ({
  width,
  height = 12,
  radius = 'md',
  phase = 0,
  style,
}: SkeletonProps) => {
  useEffect(() => {
    ensureDriver();
  }, []);

  // Offsetting the interpolation window per block staggers the pulse.
  const spread = 0.6;
  const start = Math.min(0.9, Math.max(0, phase * spread));

  const opacity = driver.interpolate({
    inputRange: [0, start, start + 0.001, 1],
    outputRange: [MIN_OPACITY, MIN_OPACITY, 1, MIN_OPACITY],
    extrapolate: 'clamp',
  });

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        {
          width: width ?? '100%',
          height,
          borderRadius: typeof radius === 'number' ? radius : RADIUS[radius],
          backgroundColor: '#E5E7EB',
          opacity,
        },
        style,
      ]}
    />
  );
};

/** One or more lines of "text", the last one optionally shorter. */
export const SkeletonText = ({
  lines = 1,
  width = '100%',
  height = 12,
  gap = 8,
  lastWidth = '60%',
  phase = 0,
}: {
  lines?: number;
  width?: number | `${number}%`;
  height?: number;
  gap?: number;
  lastWidth?: number | `${number}%`;
  phase?: number;
}) => (
  <View style={{ gap }}>
    {Array.from({ length: lines }).map((_, i) => (
      <Skeleton
        key={i}
        width={i === lines - 1 && lines > 1 ? lastWidth : width}
        height={height}
        radius="sm"
        phase={phase + i}
      />
    ))}
  </View>
);

export const SkeletonCircle = ({
  size = 40,
  phase = 0,
}: {
  size?: number;
  phase?: number;
}) => <Skeleton width={size} height={size} radius="full" phase={phase} />;

/** A white rounded card matching the app's `bg-white rounded-2xl border` look. */
export const SkeletonCard = ({
  children,
  style,
  gap = 12,
}: {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  gap?: number;
}) => (
  <View
    style={[
      {
        backgroundColor: '#FFFFFF',
        borderRadius: RADIUS.xl,
        borderWidth: 1,
        borderColor: '#F3F4F6',
        padding: 16,
      },
      style,
    ]}
  >
    <View style={{ gap }}>{children}</View>
  </View>
);

/** `count` rows shaped like a simple name + trailing meta list. */
export const SkeletonList = ({
  count = 5,
  lastWidth = '70%',
}: {
  count?: number;
  lastWidth?: number | `${number}%`;
}) => (
  <SkeletonCard gap={0} style={{ padding: 0, overflow: 'hidden' }}>
    {Array.from({ length: count }).map((_, i) => (
      <View
        key={i}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 16,
          paddingVertical: 14,
          borderTopWidth: i === 0 ? 0 : 1,
          borderTopColor: '#F3F4F6',
        }}
      >
        <View style={{ flex: 1, marginRight: 12 }}>
          <SkeletonText
            width={lastWidth}
            height={13}
            lastWidth={lastWidth}
            phase={i}
          />
        </View>
        <Skeleton width={64} height={20} radius="full" phase={i} />
      </View>
    ))}
  </SkeletonCard>
);

/** A row of equal stat tiles, matching `StatCard`. */
export const SkeletonStatRow = ({
  count = 2,
}: {
  count?: number;
}) => (
  <View style={{ flexDirection: 'row' }}>
    {Array.from({ length: count }).map((_, i) => (
      <View
        key={i}
        style={{
          flex: 1,
          marginHorizontal: 4,
          backgroundColor: '#FFFFFF',
          borderRadius: RADIUS.xl,
          borderWidth: 1,
          borderColor: '#F3F4F6',
          paddingVertical: 16,
          alignItems: 'center',
          gap: 8,
        }}
      >
        <Skeleton width={40} height={22} radius="sm" phase={i} />
        <Skeleton width={52} height={10} radius="sm" phase={i} />
      </View>
    ))}
  </View>
);
