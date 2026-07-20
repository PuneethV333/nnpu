import React from 'react'
import { View, Text, Image } from 'react-native';

interface ProfileHeaderProps {
  name: string;
  profilePic?: string | null;
  role: string;
  schoolName: string;
}

const ProfileHeader = ({ name, profilePic, role, schoolName }: ProfileHeaderProps) => {
  return (
    <View className="items-center pt-6 pb-8">
      {profilePic ? (
        <Image source={{ uri: profilePic }} className="w-24 h-24 rounded-full" />
      ) : (
        <View className="w-24 h-24 rounded-full bg-indigo-100 items-center justify-center">
          <Text className="text-3xl font-bold text-indigo-700">
            {name.charAt(0).toUpperCase()}
          </Text>
        </View>
      )}

      <Text className="text-xl font-bold text-gray-900 mt-3">{name}</Text>

      <View className="flex-row items-center gap-2 mt-1">
        <View className="bg-blue-100 rounded-full px-3 py-1">
          <Text className="text-xs font-semibold text-blue-700">{role}</Text>
        </View>
      </View>

      <Text className="text-sm text-gray-500 mt-2">{schoolName}</Text>
    </View>
  );
};

export default ProfileHeader;