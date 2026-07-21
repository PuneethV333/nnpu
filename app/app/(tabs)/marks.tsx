import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useGetMyMarks } from '@/src/hooks/useMarks';
import { AssessmentCategory } from '@/src/types/marks';
import { dummyMarks,dummyPendingAssessments} from '@/constants/dummy/marks'
import PerformanceChart from '@/components/mark-page/PerformanceChart'
import AssessmentGroup from '@/components/mark-page/AssessmentGroup'

const USE_DUMMY = true;

// Categories shown on the student marks screen, in display order.
// A category with zero marks AND zero pending assessments renders its
// "no exam conducted" empty state automatically.
const VISIBLE_CATEGORIES: AssessmentCategory[] = ['UnitTest', 'MidTerm', 'FinalTheory', 'FinalPractical'];

const MarksPage = () => {
  const { data } = useGetMyMarks();
  const marks = USE_DUMMY ? dummyMarks : data;
  const pending = USE_DUMMY ? dummyPendingAssessments : [];

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top','bottom']}>
      <View className="flex-row items-center justify-between px-4 pt-4 pb-3">
        <Text className="text-2xl font-bold text-gray-900">Marks</Text>
        <View className="flex-row items-center gap-3">
          <Feather name="bell" size={22} color="#111827" />
        </View>
      </View>

      {!marks ? (
        <Text className="text-gray-400 text-sm px-4">Loading...</Text>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 135 }}>
          <PerformanceChart marks={marks} />

          {VISIBLE_CATEGORIES.map((category) => (
            <AssessmentGroup
              key={category}
              category={category}
              marks={marks.filter((m) => m.assessment.category === category)}
              pendingSubjects={pending
                .filter((p) => p.category === category)
                .map((p) => p.subjectName)}
            />
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

export default MarksPage;