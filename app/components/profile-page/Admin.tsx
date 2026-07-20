import React from 'react'
import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ProfileHeader from './ProfileHeader';
import SettingsSection from './SettingsSection';

const dummyAdminProfile = {
  role: 'Admin',
  details: { name: 'Mr. Suresh Rao', profilePic: null },
  school: {
    name: 'New National PU College',
    noOfStudents: 640,
    noOfTeacher: 42,
    noOfBoys: 350,
    noOfGirls: 290,
  },
};

const StatCard = ({ label, value }: { label: string; value: number }) => (
  <View className="flex-1 bg-white rounded-2xl border border-gray-100 items-center py-4 mx-1">
    <Text className="text-2xl font-bold text-gray-900">{value}</Text>
    <Text className="text-xs text-gray-500 mt-1">{label}</Text>
  </View>
);

const Admin = () => {
  const data = dummyAdminProfile;

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <ProfileHeader
          name={data.details.name}
          profilePic={data.details.profilePic}
          role={data.role}
          schoolName={data.school.name}
        />

        <View className="flex-row mx-3 mb-2">
          <StatCard label="Students" value={data.school.noOfStudents} />
          <StatCard label="Teachers" value={data.school.noOfTeacher} />
        </View>
        <View className="flex-row mx-3">
          <StatCard label="Boys" value={data.school.noOfBoys} />
          <StatCard label="Girls" value={data.school.noOfGirls} />
        </View>

        <SettingsSection />
      </ScrollView>
    </SafeAreaView>
  );
};

export default Admin;