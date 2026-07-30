import React from 'react'
import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ProfileHeader from '../ProfileHeader';
import SettingsSection from '../SettingsSection';
import { useAuth } from '$/hooks/useAuth';

const StatCard = ({ label, value }: { label: string; value: number }) => (
  <View className="flex-1 bg-white rounded-2xl border border-gray-100 items-center py-4 mx-1">
    <Text className="text-2xl font-bold text-gray-900">{value}</Text>
    <Text className="text-xs text-gray-500 mt-1">{label}</Text>
  </View>
);

const Admin = () => {
  const { user } = useAuth();
  if (!user) return null;
  const data = user;

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <ProfileHeader
          name={data.details?.name ?? 'Admin'}
          profilePic={data.details?.profilePic}
          role={data.role}
          schoolName={data.school?.name ?? ''}
        />

        <View className="flex-row mx-3 mb-2">
          <StatCard label="Students" value={data.school?.noOfStudents ?? 0} />
          <StatCard label="Teachers" value={data.school?.noOfTeacher ?? 0} />
        </View>
        <View className="flex-row mx-3">
          <StatCard label="Boys" value={data.school?.noOfBoys ?? 0} />
          <StatCard label="Girls" value={data.school?.noOfGirls ?? 0} />
        </View>

        <SettingsSection />
      </ScrollView>
    </SafeAreaView>
  );
};

export default Admin;