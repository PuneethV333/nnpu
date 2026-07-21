import React from 'react'
import { View, Text, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { MarkArray } from '@/src/types/marks';

const CHART_HEIGHT = 140;

const PerformanceChart = ({ marks }: { marks: MarkArray }) => {
  if (marks.length === 0) return null;

  return (
    <View className="bg-white rounded-2xl border border-gray-100 p-4 mx-4 mb-4">
      <View className="flex-row items-center gap-2 mb-4">
        <Feather name="bar-chart-2" size={18} color="#2563EB" />
        <Text className="text-base font-bold text-gray-900">
          Performance Summary Chart
        </Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View className="flex-row items-end" style={{ height: CHART_HEIGHT*1.5 }}>
          {marks.map((m) => {
            const obtainedHeight = (m.marksObtained / m.assessment.maxMarks) * CHART_HEIGHT;
            const maxHeight = CHART_HEIGHT;

            return (
              <View key={m.id} className="items-center mx-3" style={{ width: 56 }}>
                <View className="flex-row items-end gap-1" style={{ height: CHART_HEIGHT }}>
                  <View
                    style={{ height: obtainedHeight, width: 14, backgroundColor: '#2563EB', borderRadius: 4 }}
                  />
                  <View
                    style={{ height: maxHeight, width: 14, backgroundColor: '#E5E7EB', borderRadius: 4 }}
                  />
                </View>
                <Text className="text-[10px] text-gray-500 mt-2 text-center" numberOfLines={2}>
                  {m.assessment.subject.name} ({m.assessment.name})
                </Text>
              </View>
            );
          })}
        </View>
      </ScrollView>

      <View className="flex-row items-center justify-center gap-4 mt-3 pt-3 border-t border-gray-100">
        <View className="flex-row items-center gap-1.5">
          <View className="w-2.5 h-2.5 rounded-sm bg-blue-600" />
          <Text className="text-xs text-gray-600">Marks Obtained</Text>
        </View>
        <View className="flex-row items-center gap-1.5">
          <View className="w-2.5 h-2.5 rounded-sm bg-gray-300" />
          <Text className="text-xs text-gray-600">Max Possible</Text>
        </View>
      </View>
    </View>
  );
};

export default PerformanceChart;