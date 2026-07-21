import React from 'react'
import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useGetNotifications, useMarkNotificationRead } from '@/src/hooks/useNotifications';
import { Notification, NotificationArray } from '@/src/types/notification';

const TYPE_ICON: Record<Notification['type'], keyof typeof Feather.glyphMap> = {
  AttendancePending: 'clock',
  AttendanceUpdated: 'check-circle',
  MarksPublished: 'award',
  NewAnnouncement: 'megaphone' as any,
  TimetableUpdated: 'calendar',
  FeeDue: 'credit-card',
  PaymentSuccessful: 'check-circle',
};

const dummyNotifications: NotificationArray = [
  { id: '1', userId: 'u1', type: 'FeeDue', title: 'Fee Due Reminder', body: 'Term 2 fees are due by 25th July.', isRead: false, createdAt: new Date('2026-07-19T09:00:00') },
  { id: '2', userId: 'u1', type: 'MarksPublished', title: 'Marks Published', body: 'Your Unit Test 1 marks are now available.', isRead: false, createdAt: new Date('2026-07-18T14:30:00') },
  { id: '3', userId: 'u1', type: 'NewAnnouncement', title: 'New Announcement', body: 'Independence Day holiday on 15th August.', isRead: true, createdAt: new Date('2026-07-17T11:00:00') },
];

const USE_DUMMY = true;

const NotificationRow = ({ item, onPress }: { item: Notification; onPress: () => void }) => (
  <Pressable
    onPress={onPress}
    className={`flex-row items-start gap-3 px-4 py-4 border-b border-gray-100 ${
      !item.isRead ? 'bg-blue-50' : 'bg-white'
    }`}
  >
    <View className="w-9 h-9 rounded-full bg-white border border-gray-200 items-center justify-center mt-0.5">
      <Feather name={TYPE_ICON[item.type] ?? 'bell'} size={16} color="#374151" />
    </View>
    <View className="flex-1">
      <Text className="text-[15px] font-semibold text-gray-900">{item.title}</Text>
      <Text className="text-sm text-gray-500 mt-0.5">{item.body}</Text>
      <Text className="text-xs text-gray-400 mt-1">
        {item.createdAt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
      </Text>
    </View>
    {!item.isRead && <View className="w-2 h-2 rounded-full bg-blue-500 mt-2" />}
  </Pressable>
);

const NotificationsPage = () => {
  const { data } = useGetNotifications();
  const { mutate: markRead } = useMarkNotificationRead();

  const notifications = USE_DUMMY ? dummyNotifications : data;

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      <Text className="text-xl font-bold text-gray-900 px-4 pt-4 pb-3">
        Notifications
      </Text>

      <ScrollView showsVerticalScrollIndicator={false}>
        {notifications && notifications.length === 0 && (
          <Text className="text-gray-400 text-sm px-4">No notifications yet.</Text>
        )}

        {notifications?.map((item) => (
          <NotificationRow
            key={item.id}
            item={item}
            onPress={() => !USE_DUMMY && markRead(item.id)}
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

export default NotificationsPage;