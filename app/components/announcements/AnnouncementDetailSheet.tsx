import React from 'react';
import { Image, Text, View } from 'react-native';
import { useGetAnnouncementDetails } from '@/src/hooks/useAnnouncement';
import { BottomSheet, Pill } from '@/components/ui/Primitives';
import { ErrorState } from '@/components/ui/Feedback';
import { SkeletonList } from '@/components/ui/skeletons';
import { TYPE_COPY } from './announcementMeta';

const AnnouncementDetailSheet = ({
  id,
  onClose,
}: {
  id: string;
  onClose: () => void;
}) => {
  const { data, isLoading, isError, refetch } = useGetAnnouncementDetails(id);
  const meta = data ? TYPE_COPY[data.type] ?? TYPE_COPY.Normal : null;

  return (
    <BottomSheet title="Announcement" onClose={onClose}>
      {isLoading ? (
        <SkeletonList count={3} lastWidth="60%" />
      ) : isError || !data || !meta ? (
        <ErrorState
          title="Couldn't load this announcement"
          subtitle="It may have been removed."
          onRetry={() => refetch()}
        />
      ) : (
        <View>
          <Pill label={meta.label} color={meta.color} />
          <Text className="text-xl font-bold text-gray-900 mt-3">{data.title}</Text>
          <View className="flex-row items-center mt-2" style={{ gap: 8 }}>
            {data.profilePic ? (
              <Image
                source={{ uri: data.profilePic }}
                style={{ width: 22, height: 22, borderRadius: 11 }}
              />
            ) : null}
            <Text className="text-xs text-gray-500">Posted by {data.name}</Text>
          </View>
          <Text className="text-[15px] text-gray-700 leading-6 mt-4">{data.body}</Text>
        </View>
      )}
    </BottomSheet>
  );
};

export default AnnouncementDetailSheet;
