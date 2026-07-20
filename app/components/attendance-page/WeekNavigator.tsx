import React from 'react'
import { View, Text, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';

interface WeekNavigatorProps {
  label: string;
  onPrev: () => void;
  onNext: () => void;
  isCurrentWeek: boolean;
  disableNext: boolean;
}

const WeekNavigator = ({ label, onPrev, onNext, isCurrentWeek, disableNext }: WeekNavigatorProps) => (
  <View className="flex-row items-center justify-between mx-4 mb-3">
    <Pressable
      onPress={onPrev}
      hitSlop={10}
      className="w-9 h-9 rounded-full bg-white border border-gray-200 items-center justify-center"
    >
      <Feather name="chevron-left" size={18} color="#374151" />
    </Pressable>

    <View className="items-center">
      <Text className="text-sm font-semibold text-gray-900">{label}</Text>
      {isCurrentWeek && <Text className="text-xs text-blue-600 mt-0.5">This week</Text>}
    </View>

    <Pressable
      onPress={onNext}
      hitSlop={10}
      disabled={disableNext}
      className={`w-9 h-9 rounded-full items-center justify-center border ${
        disableNext ? 'bg-gray-50 border-gray-100' : 'bg-white border-gray-200'
      }`}
    >
      <Feather name="chevron-right" size={18} color={disableNext ? '#D1D5DB' : '#374151'} />
    </Pressable>
  </View>
);

export default WeekNavigator;