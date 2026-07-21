import React from 'react';
import { View, Text } from 'react-native';
import { Feather } from '@expo/vector-icons';

const PendingRow = ({ subjectName }: { subjectName: string }) => (
  <View className="px-4 py-3 border-b border-gray-100 last:border-b-0 flex-row items-center justify-between">
    <Text className="text-[15px] font-semibold text-gray-500">{subjectName}</Text>
    <View className="flex-row items-center gap-1.5">
      <Feather name="clock" size={13} color="#9CA3AF" />
      <Text className="text-xs text-gray-400">Not updated yet</Text>
    </View>
  </View>
);

export default PendingRow;