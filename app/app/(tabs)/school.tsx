import React, { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/src/hooks/useAuth';
import { useTabBarClearance } from '@/src/hooks/useTabBarClearance';
import { StatCard } from '@/components/profile-page/StatCard';
import { PillTabs } from '@/components/ui/Primitives';
import OverviewTab from '@/components/school-page/OverviewTab';
import StudentsTab from '@/components/school-page/StudentsTab';
import StaffingTab from '@/components/school-page/StaffingTab';
import YearEndTab from '@/components/school-page/YearEndTab';

type SchoolTab = 'overview' | 'students' | 'staffing' | 'year-end';

const TABS: { value: SchoolTab; label: string }[] = [
  { value: 'overview', label: 'Overview' },
  { value: 'students', label: 'Students' },
  { value: 'staffing', label: 'Staffing' },
  { value: 'year-end', label: 'Year-end' },
];

const School = () => {
  const tabBarClearance = useTabBarClearance();
  const { user } = useAuth();
  const [tab, setTab] = useState<SchoolTab>('overview');

  const school = user?.school ?? null;

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: tabBarClearance }}
      >
        <Text className="text-2xl font-bold text-gray-900 px-4 pt-4 pb-1">School</Text>
        <Text className="text-sm text-gray-500 px-4 mb-3">{school?.name ?? 'Your school'}</Text>

        <View className="flex-row mx-3 mb-3">
          <StatCard label="Students" value={school?.noOfStudents ?? 0} />
          <StatCard label="Teachers" value={school?.noOfTeacher ?? 0} />
        </View>
        {school?.noOfBoys != null || school?.noOfGirls != null ? (
          <View className="flex-row mx-3 mb-4">
            <StatCard label="Boys" value={school?.noOfBoys ?? 0} />
            <StatCard label="Girls" value={school?.noOfGirls ?? 0} />
          </View>
        ) : null}

        <View className="mt-1">
          <PillTabs options={TABS} value={tab} onChange={setTab} />
        </View>

        {tab === 'overview' ? <OverviewTab /> : null}
        {tab === 'students' ? <StudentsTab /> : null}
        {tab === 'staffing' ? <StaffingTab /> : null}
        {tab === 'year-end' ? <YearEndTab /> : null}
      </ScrollView>
    </SafeAreaView>
  );
};

export default School;
