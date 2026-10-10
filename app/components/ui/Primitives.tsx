import React from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Small building blocks that reproduce the card / pill / button look already
 * used across the app (white rounded-2xl cards on gray-50, gray-400 tracking
 * labels, blue/indigo primary buttons), so new screens stop re-typing the same
 * class strings.
 */

export const SectionTitle = ({
  title,
  right,
}: {
  title: string;
  right?: React.ReactNode;
}) => (
  <View className="px-4 mt-5 mb-2 flex-row items-center justify-between">
    <Text className="text-base font-semibold text-gray-900">{title}</Text>
    {right}
  </View>
);

export const Card = ({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <View
    className={`mx-4 bg-white rounded-2xl border border-gray-100 ${className}`}
  >
    {children}
  </View>
);

export const FieldLabel = ({ children }: { children: string }) => (
  <Text className="text-xs font-semibold text-gray-400 tracking-wide mb-2">
    {children.toUpperCase()}
  </Text>
);

export type Tone = 'indigo' | 'blue' | 'green' | 'red' | 'neutral';

const TONE: Record<Tone, { bg: string; fg: string; border: string }> = {
  indigo: { bg: '#4F46E5', fg: '#FFFFFF', border: '#4F46E5' },
  blue: { bg: '#2563EB', fg: '#FFFFFF', border: '#2563EB' },
  green: { bg: '#16A34A', fg: '#FFFFFF', border: '#16A34A' },
  red: { bg: '#DC2626', fg: '#FFFFFF', border: '#DC2626' },
  neutral: { bg: '#FFFFFF', fg: '#374151', border: '#E5E7EB' },
};

export const PrimaryButton = ({
  label,
  onPress,
  loading = false,
  disabled = false,
  tone = 'indigo',
  icon,
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  tone?: Tone;
  icon?: keyof typeof Feather.glyphMap;
}) => {
  const t = TONE[tone];
  const inactive = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      className={`rounded-xl py-3 px-4 items-center justify-center flex-row border ${
        inactive ? 'opacity-40' : ''
      }`}
      style={{ backgroundColor: t.bg, borderColor: t.border, gap: 8 }}
    >
      {loading ? (
        <ActivityIndicator size="small" color={t.fg} />
      ) : (
        <>
          {icon ? <Feather name={icon} size={16} color={t.fg} /> : null}
          <Text className="text-sm font-semibold" style={{ color: t.fg }}>
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
};

/** Pill row used for the School screen's tabs and for filters. */
export const PillTabs = <T extends string>({
  options,
  value,
  onChange,
  activeColor = '#4F46E5',
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (next: T) => void;
  activeColor?: string;
}) => (
  <ScrollView
    horizontal
    showsHorizontalScrollIndicator={false}
    contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
  >
    {options.map((o) => {
      const active = o.value === value;
      return (
        <Pressable
          key={o.value}
          onPress={() => onChange(o.value)}
          className="rounded-full px-4 py-2 border"
          style={{
            backgroundColor: active ? activeColor : '#FFFFFF',
            borderColor: active ? activeColor : '#E5E7EB',
          }}
        >
          <Text
            className="text-sm font-semibold"
            style={{ color: active ? '#FFFFFF' : '#374151' }}
          >
            {o.label}
          </Text>
        </Pressable>
      );
    })}
  </ScrollView>
);

export const Pill = ({ label, color }: { label: string; color: string }) => (
  <View
    className="rounded-full px-2 py-0.5 self-start"
    style={{ backgroundColor: color + '1A' }}
  >
    <Text className="text-[11px] font-semibold" style={{ color }}>
      {label}
    </Text>
  </View>
);

export const Field = ({
  label,
  ...inputProps
}: { label: string } & TextInputProps) => (
  <View className="mb-4">
    <FieldLabel>{label}</FieldLabel>
    <TextInput
      placeholderTextColor="#9CA3AF"
      {...inputProps}
      className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-[15px] text-gray-900"
      style={[
        inputProps.multiline ? { minHeight: 110, textAlignVertical: 'top' } : null,
        inputProps.style,
      ]}
    />
  </View>
);

export const Banner = ({
  tone,
  title,
  children,
}: {
  tone: 'warning' | 'danger' | 'success' | 'info';
  title?: string;
  children?: React.ReactNode;
}) => {
  const palette = {
    warning: { bg: '#FFFBEB', border: '#FDE68A', fg: '#92400E', icon: 'alert-triangle' },
    danger: { bg: '#FEF2F2', border: '#FECACA', fg: '#B91C1C', icon: 'alert-octagon' },
    success: { bg: '#F0FDF4', border: '#BBF7D0', fg: '#166534', icon: 'check-circle' },
    info: { bg: '#EFF6FF', border: '#BFDBFE', fg: '#1D4ED8', icon: 'info' },
  }[tone] as {
    bg: string;
    border: string;
    fg: string;
    icon: keyof typeof Feather.glyphMap;
  };

  return (
    <View
      className="rounded-xl border p-3 flex-row"
      style={{ backgroundColor: palette.bg, borderColor: palette.border, gap: 10 }}
    >
      <Feather name={palette.icon} size={16} color={palette.fg} style={{ marginTop: 2 }} />
      <View className="flex-1">
        {title ? (
          <Text className="text-sm font-semibold" style={{ color: palette.fg }}>
            {title}
          </Text>
        ) : null}
        {typeof children === 'string' ? (
          <Text className="text-xs leading-5 mt-0.5" style={{ color: palette.fg }}>
            {children}
          </Text>
        ) : (
          children
        )}
      </View>
    </View>
  );
};

/**
 * Bottom sheet built on RN's Modal so it needs no extra native dependency.
 * Callers mount it only while open, which also resets any form state inside.
 */
export const BottomSheet = ({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}) => {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1, justifyContent: 'flex-end' }}
      >
        <Pressable
          onPress={onClose}
          style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.4)' }]}
        />
        <View
          className="bg-white rounded-t-3xl"
          style={{ maxHeight: '88%', paddingBottom: Math.max(insets.bottom, 16) }}
        >
          <View className="items-center pt-2">
            <View className="w-10 h-1 rounded-full bg-gray-200" />
          </View>
          <View className="flex-row items-center px-4 pt-3 pb-1">
            <View className="flex-1 pr-3">
              <Text className="text-lg font-bold text-gray-900">{title}</Text>
              {subtitle ? (
                <Text className="text-xs text-gray-500 mt-0.5">{subtitle}</Text>
              ) : null}
            </View>
            <Pressable
              onPress={onClose}
              hitSlop={10}
              accessibilityLabel="Close"
              className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center"
            >
              <Feather name="x" size={16} color="#374151" />
            </Pressable>
          </View>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ padding: 16 }}
          >
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};
