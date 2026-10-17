import React from 'react'
import { View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ProfileHeader from '../ProfileHeader';
import SettingsSection from '../SettingsSection';
import { useAuth } from '$/hooks/useAuth';
import { StatCard } from '../StatCard';
import { ProfileLoading, ProfileUnavailable } from '../ProfileStates';



const Admin = () => {
  const { user, isLoading, refreshUser } = useAuth();

  // Was `return null`: a blank screen for the whole of `/auth/me`, and a
  // permanently blank one if the session died with this tab already open, since
  // nothing guards the (tabs) group.
  if (isLoading) return <ProfileLoading />;
  if (!user) return <ProfileUnavailable onRetry={() => void refreshUser()} />;

  const data = user;
  const hasGenderStats = data.school?.noOfBoys != null || data.school?.noOfGirls != null;

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
        {hasGenderStats && (
          <View className="flex-row mx-3">
            <StatCard label="Boys" value={data.school?.noOfBoys ?? 0} />
            <StatCard label="Girls" value={data.school?.noOfGirls ?? 0} />
          </View>
        )}

        <SettingsSection />
      </ScrollView>
    </SafeAreaView>
  );
};

export default Admin;