import React from 'react'
import { View, Text, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';

const SettingsSection = () => {
  const items: {
    icon: 'lock' | 'bell' | 'log-out'
    label: string
    onPress: () => void
    danger?: boolean
  }[] = [
    { icon: 'lock', label: 'Change Password', onPress: () => router.push('/') },
    { icon: 'bell', label: 'Notification Preferences', onPress: () => router.push('/') },
    { icon: 'log-out', label: 'Logout', onPress: () => {}, danger: true },
  ];

  return (
    <View className="mt-6 mx-4 bg-white rounded-2xl border border-gray-100">
      {items.map((item, idx) => (
        <Pressable
          key={item.label}
          onPress={item.onPress}
          className={`flex-row items-center px-4 py-4 ${
            idx !== items.length - 1 ? 'border-b border-gray-100' : ''
          }`}
        >
          <Feather
            name={item.icon}
            size={18}
            color={item.danger ? '#DC2626' : '#374151'}
          />
          <Text
            className={`ml-3 text-[15px] font-medium ${
              item.danger ? 'text-red-600' : 'text-gray-800'
            }`}
          >
            {item.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
};

export default SettingsSection;