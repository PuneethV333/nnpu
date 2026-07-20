import React from 'react'
import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ProfileHeader from './ProfileHeader';
import SettingsSection from './SettingsSection';

const dummyStudentProfile = {
  role: 'Student',
  language: 'Kannada',
  details: { name: 'Puneeth V', profilePic: null },
  school: { name: 'New National PU College' },
  combination: { name: 'PCMB', stream: 'Science' },
  section: {
    name: 'Section-I',
    class: { name: 'I PUC' },
    classTeacher: { details: { name: 'Mrs. Priya Sharma' } },
  },
};

const InfoRow = ({ label, value }: { label: string; value: string }) => (
  <View className="flex-row items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
    <Text className="text-sm text-gray-500">{label}</Text>
    <Text className="text-sm font-semibold text-gray-900">{value}</Text>
  </View>
);

const Student = () => {
  const data = dummyStudentProfile;

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <ProfileHeader
          name={data.details.name}
          profilePic={data.details.profilePic}
          role={data.role}
          schoolName={data.school.name}
        />

        <View className="mx-4 bg-white rounded-2xl border border-gray-100 px-4">
          <InfoRow label="Class" value={data.section.class.name} />
          <InfoRow label="Section" value={data.section.name} />
          <InfoRow label="Combination" value={`${data.combination.name} (${data.combination.stream})`} />
          <InfoRow label="Second Language" value={data.language} />
          <InfoRow label="Class Teacher" value={data.section.classTeacher.details.name} />
        </View>

        <SettingsSection />
      </ScrollView>
    </SafeAreaView>
  );
};

export default Student;