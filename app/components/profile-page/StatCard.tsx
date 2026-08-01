import React from 'react'
import {View,Text} from 'react-native'

export const StatCard = ({ label, value }: { label: string; value: number }) => (
  <View className="flex-1 bg-white rounded-2xl border border-gray-100 items-center py-4 mx-1">
    <Text className="text-2xl font-bold text-gray-900">{value}</Text>
    <Text className="text-xs text-gray-500 mt-1">{label}</Text>
  </View>
);