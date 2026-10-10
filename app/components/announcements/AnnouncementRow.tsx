import React from 'react';
import { ActivityIndicator, Image, Pressable, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { Latest } from '@/src/types/announcement';
import { Pill } from '@/components/ui/Primitives';
import { TYPE_COPY } from './announcementMeta';

type Props = {
  item: Latest;
  onPress: () => void;
  /** Present only for admins — the server rejects these writes for everyone else. */
  onEdit?: () => void;
  onDelete?: () => void;
  deleting?: boolean;
};

/** Full-width list version of the home screen's announcement card. */
const AnnouncementRow = ({ item, onPress, onEdit, onDelete, deleting }: Props) => {
  const meta = TYPE_COPY[item.type] ?? TYPE_COPY.Normal;

  return (
    <Pressable
      onPress={onPress}
      className="mx-4 mb-3 bg-white rounded-2xl border border-gray-100 p-4"
      style={{ opacity: deleting ? 0.5 : 1 }}
    >
      <View className="flex-row items-center justify-between mb-2">
        <Pill label={meta.label} color={meta.color} />
        {onEdit || onDelete ? (
          <View className="flex-row" style={{ gap: 14 }}>
            {onEdit ? (
              <Pressable onPress={onEdit} hitSlop={10} accessibilityLabel="Edit announcement">
                <Feather name="edit-2" size={16} color="#6B7280" />
              </Pressable>
            ) : null}
            {onDelete ? (
              <Pressable
                onPress={onDelete}
                disabled={deleting}
                hitSlop={10}
                accessibilityLabel="Delete announcement"
              >
                {deleting ? (
                  <ActivityIndicator size="small" color="#DC2626" />
                ) : (
                  <Feather name="trash-2" size={16} color="#DC2626" />
                )}
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>

      <Text className="text-[15px] font-bold text-gray-900" numberOfLines={2}>
        {item.title}
      </Text>
      <Text className="text-[13px] text-gray-500 leading-[19px] mt-1" numberOfLines={3}>
        {item.body}
      </Text>

      <View className="flex-row items-center mt-3" style={{ gap: 8 }}>
        {item.profilePic ? (
          <Image
            source={{ uri: item.profilePic }}
            style={{ width: 22, height: 22, borderRadius: 11 }}
          />
        ) : (
          <View
            className="items-center justify-center"
            style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: '#E0E7FF' }}
          >
            <Text style={{ fontSize: 10, fontWeight: '600', color: '#4338CA' }}>
              {item.name.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        <Text className="text-xs font-medium text-gray-700 flex-1" numberOfLines={1}>
          {item.name}
        </Text>
      </View>
    </Pressable>
  );
};

export default AnnouncementRow;
