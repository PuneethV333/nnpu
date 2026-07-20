import React from 'react'
import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ProfileHeader from './ProfileHeader';
import SettingsSection from './SettingsSection';

const dummyTeacherProfile = {
  role: 'Teacher',
  details: { name: 'Mrs. Priya Sharma', profilePic: null },
  school: { name: 'New National PU College' },
  teachingSubjects: [
    { subject: { name: 'Physics' }, section: { name: 'Section-I', class: { name: 'I PUC' } } },
    { subject: { name: 'Physics' }, section: { name: 'Section-II', class: { name: 'I PUC' } } },
    { subject: { name: 'Physics' }, section: { name: 'Section-I', class: { name: 'II PUC' } } },
  ],
  classTeacherOf: { name: 'Section-I', class: { name: 'I PUC' } },
};

const Teacher = () => {
  const data = dummyTeacherProfile;

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <ProfileHeader
          name={data.details.name}
          profilePic={data.details.profilePic}
          role={data.role}
          schoolName={data.school.name}
        />

        {data.classTeacherOf && (
          <View className="mx-4 mb-4 bg-blue-50 rounded-2xl border border-blue-100 px-4 py-3">
            <Text className="text-xs font-semibold text-blue-700 tracking-wide">
              CLASS TEACHER
            </Text>
            <Text className="text-base font-bold text-gray-900 mt-1">
              {data.classTeacherOf.class.name} - {data.classTeacherOf.name}
            </Text>
          </View>
        )}

        <View className="mx-4">
          <Text className="text-sm font-semibold text-gray-500 mb-2 px-1">
            Teaching Subjects
          </Text>
          <View className="bg-white rounded-2xl border border-gray-100">
            {data.teachingSubjects.map((ts, idx) => (
              <View
                key={idx}
                className={`flex-row items-center justify-between px-4 py-3 ${
                  idx !== data.teachingSubjects.length - 1 ? 'border-b border-gray-100' : ''
                }`}
              >
                <Text className="text-[15px] font-medium text-gray-900">
                  {ts.subject.name}
                </Text>
                <Text className="text-sm text-gray-500">
                  {ts.section.class.name} - {ts.section.name}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <SettingsSection />
      </ScrollView>
    </SafeAreaView>
  );
};

export default Teacher;