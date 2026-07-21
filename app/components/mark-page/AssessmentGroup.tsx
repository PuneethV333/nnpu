import React from 'react';
import { View, Text } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Mark, AssessmentCategory } from '@/src/types/marks';
import MarkRow from './MarkRow';
import PendingRow from './PendingRow';

const CATEGORY_LABEL: Record<AssessmentCategory, string> = {
  UnitTest: 'Unit Test',
  MidTerm: 'Mid Term',
  FinalTheory: 'Final Theory',
  FinalPractical: 'Final Practical',
  Internal: 'Internal Assessment',
};

interface AssessmentGroupProps {
  category: AssessmentCategory;
  marks: Mark[];
  pendingSubjects: string[]; // subjects with an assessment created but no mark entered yet
}

const AssessmentGroup = ({ category, marks, pendingSubjects }: AssessmentGroupProps) => {
  const hasNothing = marks.length === 0 && pendingSubjects.length === 0;

  return (
    <View className="bg-white rounded-2xl border border-gray-100 mx-4 mb-4 overflow-hidden">
      <View className="flex-row items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
        <View className="flex-row items-center gap-2">
          <Feather name="award" size={16} color="#2563EB" />
          <Text className="text-[15px] font-bold text-gray-900">
            {CATEGORY_LABEL[category]}
          </Text>
        </View>
        {marks.length > 0 && (
          <View className="bg-blue-50 rounded-full px-3 py-1">
            <Text className="text-xs font-bold text-blue-700">
              {marks.length} RECORD{marks.length !== 1 ? 'S' : ''} PUBLISHED
            </Text>
          </View>
        )}
      </View>

      {hasNothing ? (
        <Text className="text-sm text-gray-400 italic px-4 py-4">
          No exam conducted yet for this term.
        </Text>
      ) : (
        <>
          {marks.map((m) => <MarkRow key={m.id} mark={m} />)}
          {pendingSubjects.map((s) => <PendingRow key={s} subjectName={s} />)}
        </>
      )}
    </View>
  );
};

export default AssessmentGroup;