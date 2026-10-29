import React, { useCallback, useState } from 'react'
import { View, Text, Image, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useDoubleTap } from '@/src/hooks/useDoubleTap';
import ProfilePicModal from './ProfilePicModal';

interface ProfileHeaderProps {
  name: string;
  profilePic?: string | null;
  role: string;
  schoolName: string;
}

const ProfileHeader = ({ name, profilePic, role, schoolName }: ProfileHeaderProps) => {
  const [picking, setPicking] = useState(false);

  const open = useCallback(() => setPicking(true), []);
  // Double tap, not a single one: the avatar is the first thing a thumb lands
  // on when scrolling this screen, and opening a photo picker on an accidental
  // brush is worse than the gesture being slightly hidden. The camera badge is
  // the affordance.
  const onAvatarPress = useDoubleTap(open);

  return (
    <View className="items-center pt-6 pb-8">
      <Pressable
        onPress={onAvatarPress}
        accessibilityRole="button"
        accessibilityLabel="Change profile picture"
        accessibilityHint="Double tap to choose a new picture"
        className="active:opacity-80"
      >
        {profilePic ? (
          <Image source={{ uri: profilePic }} className="w-24 h-24 rounded-full" />
        ) : (
          <View className="w-24 h-24 rounded-full bg-blue-100 items-center justify-center">
            <Text className="text-3xl font-bold text-blue-700">
              {name.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}

        <View className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-blue-600 border-2 border-white items-center justify-center">
          <Feather name="camera" size={14} color="#FFFFFF" />
        </View>
      </Pressable>

      <Text className="text-xl font-bold text-gray-900 mt-3">{name}</Text>

      <View className="flex-row items-center gap-2 mt-1">
        <View className="bg-blue-100 rounded-full px-3 py-1">
          <Text className="text-xs font-semibold text-blue-700">{role}</Text>
        </View>
      </View>

      <Text className="text-sm text-gray-500 mt-2">{schoolName}</Text>

      <ProfilePicModal visible={picking} onClose={() => setPicking(false)} />
    </View>
  );
};

export default ProfileHeader;
