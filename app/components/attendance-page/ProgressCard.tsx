import React from 'react';
import { View, Text } from 'react-native';

interface ProgressCardProps {
  title: string;
  percentage: number;
  subtitle: string;
  color: string; // hex, e.g. '#2563EB' or '#16A34A'
}

const ProgressCard = ({ title, percentage, subtitle, color }: ProgressCardProps) => (
  <View className="bg-white rounded-2xl border border-gray-100 p-4 mx-4 mb-3">
    <Text className="text-xs font-semibold text-gray-400 tracking-wide">
      {title.toUpperCase()}
    </Text>

    <View className="flex-row items-baseline mt-1">
      <Text className="text-4xl font-extrabold text-gray-900">{percentage}%</Text>
      <Text className="text-sm text-gray-400 ml-2">{subtitle}</Text>
    </View>

    <View className="h-2 rounded-full bg-gray-100 mt-3 overflow-hidden">
      <View
        style={{ width: `${percentage}%`, backgroundColor: color }}
        className="h-full rounded-full"
      />
    </View>
  </View>
);

export default ProgressCard;