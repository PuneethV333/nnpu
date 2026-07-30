import React from 'react'
import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ProfileHeader from '../ProfileHeader';
import SettingsSection from '../SettingsSection';
import { useAuth } from '$/hooks/useAuth';

const getAcronym = (name: string) =>
  name
    .split(/[\s,]+/)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

const InfoRow = ({ label, value }: { label: string; value: string }) => (
  <View className="flex-row items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
    <Text className="text-sm text-gray-500">{label}</Text>
    <Text className="text-sm font-semibold text-gray-900">{value}</Text>
  </View>
);

const Student = () => {
  const { user } = useAuth();
  if (!user) return null;
  const data = user;
  

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <ProfileHeader
          name={data.details?.name ?? 'Student'}
          profilePic={data.details?.profilePic}
          role={data.role}
          schoolName={data.school?.name ?? ''}
        />

        <View className="mx-4 bg-white rounded-2xl border border-gray-100 px-4">
          <InfoRow label="Class" value={data.section?.class?.name ?? '-'} />
          <InfoRow label="Section" value={data.section?.name ?? '-'} />
          <InfoRow label="Combination" value={data.combination ? `${getAcronym(data.combination.name)} (${data.combination.stream})` : '-'} />
          <InfoRow label="Second Language" value={data.language ?? '-'} />
          <InfoRow label="Class Teacher" value={data.section?.classTeacher?.details?.name ?? '-'} />
        </View>

        <SettingsSection />
      </ScrollView>
    </SafeAreaView>
  );
};

export default Student;