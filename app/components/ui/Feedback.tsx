import React from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Skeleton, SkeletonCircle } from './Skeleton';

/**
 * Shared loading / empty / error presentation.
 *
 * These were previously copy-pasted into every screen, which meant the copy
 * drifted (some said "No records found", some "Nothing here yet", some had a
 * retry button and some didn't). One place to change them now.
 */

export const RetryButton = ({
  onPress,
  label = 'Try again',
}: {
  onPress: () => void;
  label?: string;
}) => (
  <Pressable
    onPress={onPress}
    accessibilityRole="button"
    className="mt-4 bg-blue-600 rounded-xl px-5 py-2.5 active:bg-blue-700"
  >
    <Text className="text-white text-sm font-semibold">{label}</Text>
  </Pressable>
);

/** Full-screen spinner, for when there is no content shape to mirror yet. */
export const CenteredLoader = ({
  label,
  color = '#2563EB',
}: {
  label?: string;
  color?: string;
}) => (
  <View className="flex-1 items-center justify-center py-16">
    <ActivityIndicator size="large" color={color} />
    {label ? (
      <Text className="text-sm text-gray-400 mt-3">{label}</Text>
    ) : null}
  </View>
);

/** Small inline spinner, for an action button that is submitting. */
export const InlineLoader = ({ color = '#FFFFFF' }: { color?: string }) => (
  <ActivityIndicator size="small" color={color} />
);

export const EmptyState = ({
  icon = 'inbox',
  title,
  subtitle,
  onRetry,
  retryLabel,
}: {
  icon?: keyof typeof Feather.glyphMap;
  title: string;
  subtitle?: string;
  onRetry?: () => void;
  retryLabel?: string;
}) => (
  <View className="items-center px-8 mt-16">
    <View className="w-16 h-16 rounded-full bg-gray-100 items-center justify-center">
      <Feather name={icon} size={26} color="#9CA3AF" />
    </View>
    <Text className="text-base font-semibold text-gray-700 mt-4 text-center">
      {title}
    </Text>
    {subtitle ? (
      <Text className="text-sm text-gray-400 mt-1 text-center">{subtitle}</Text>
    ) : null}
    {onRetry ? <RetryButton onPress={onRetry} label={retryLabel} /> : null}
  </View>
);

export const ErrorState = ({
  title = 'Something went wrong',
  subtitle = 'We couldn’t load this. Check your connection and try again.',
  onRetry,
}: {
  title?: string;
  subtitle?: string;
  onRetry?: () => void;
}) => (
  <View className="items-center px-8 mt-16">
    <View className="w-16 h-16 rounded-full bg-red-50 items-center justify-center">
      <Feather name="alert-circle" size={26} color="#DC2626" />
    </View>
    <Text className="text-base font-semibold text-gray-700 mt-4 text-center">
      {title}
    </Text>
    <Text className="text-sm text-gray-400 mt-1 text-center">{subtitle}</Text>
    {onRetry ? <RetryButton onPress={onRetry} /> : null}
  </View>
);

/** Tiny pulsing bar used where a pill/badge would be, e.g. a status chip. */
export const SkeletonPill = ({
  width = 64,
  phase = 0,
}: {
  width?: number;
  phase?: number;
}) => (
  <Skeleton width={width} height={22} radius="full" phase={phase} />
);

export const SkeletonAvatarRow = ({
  size = 36,
  phase = 0,
}: {
  size?: number;
  phase?: number;
}) => (
  <View className="flex-row items-center gap-3">
    <SkeletonCircle size={size} phase={phase} />
    <View style={{ flex: 1 }}>
      <Skeleton width="45%" height={12} radius="sm" phase={phase} />
      <Skeleton width="28%" height={10} radius="sm" phase={phase} />
    </View>
  </View>
);
