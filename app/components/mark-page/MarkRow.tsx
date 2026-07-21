import React from 'react'
import { View, Text } from 'react-native';
import { Mark } from '@/src/types/marks';

const getBadgeColor = (percentage: number) => {
  if (percentage >= 85) return { bg: '#DCFCE7', text: '#16A34A', border: '#BBF7D0' };
  if (percentage >= 60) return { bg: '#DBEAFE', text: '#2563EB', border: '#BFDBFE' };
  return { bg: '#FEE2E2', text: '#DC2626', border: '#FECACA' };
};

const MarkRow = ({ mark }: { mark: Mark }) => {
  const percentage = Math.round((mark.marksObtained / mark.assessment.maxMarks) * 100);
  const colors = getBadgeColor(percentage);

  return (
    <View className="px-4 py-3 border-b border-gray-100 last:border-b-0">
      <Text className="text-[15px] font-bold text-gray-900">
        {mark.assessment.subject.name}
      </Text>
      {mark.remarks && (
        <Text className="text-sm text-gray-500 italic mt-0.5">
          Feedback: &quot;{mark.remarks}&quot;
        </Text>
      )}

      <View className="flex-row items-center justify-end gap-3 mt-2">
        <Text className="text-base font-bold text-gray-900">
          {mark.marksObtained}
          <Text className="text-sm font-normal text-gray-400"> / {mark.assessment.maxMarks}</Text>
        </Text>
        <View
          style={{ backgroundColor: colors.bg, borderColor: colors.border, borderWidth: 1 }}
          className="rounded-lg px-2.5 py-1"
        >
          <Text style={{ color: colors.text }} className="text-sm font-bold">
            {percentage}%
          </Text>
        </View>
      </View>
    </View>
  );
};

export default MarkRow;