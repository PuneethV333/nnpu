import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useGetNotifications, useMarkNotificationRead } from '@/src/hooks/useNotifications';
import { Notification, NotificationArray } from '@/src/types/notification';
import { EmptyState, ErrorState } from '@/components/ui/Feedback';
import { NotificationListSkeleton } from '@/components/ui/skeletons';
import { useTabBarClearance } from '@/src/hooks/useTabBarClearance';

const TYPE_ICON: Record<Notification['type'], keyof typeof Feather.glyphMap> = {
  AttendancePending: 'clock',
  AttendanceUpdated: 'check-circle',
  MarksPublished: 'award',
  NewAnnouncement: 'volume-2',
  TimetableUpdated: 'calendar',
  FeeDue: 'credit-card',
  PaymentSuccessful: 'check-circle',
};

const formatTimestamp = (d: Date) => {
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();

  if (sameDay) {
    return d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
  }

  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

const NotificationRow = ({
  item,
  onPress,
}: {
  item: Notification;
  onPress: () => void;
}) => (
  <Pressable
    onPress={onPress}
    android_ripple={{ color: '#E5E7EB' }}
    className={`flex-row items-start gap-3 px-4 py-4 ${
      item.isRead ? 'bg-white' : 'bg-blue-50'
    }`}
  >
    <View className="w-9 h-9 rounded-full bg-white border border-gray-200 items-center justify-center mt-0.5">
      <Feather name={TYPE_ICON[item.type] ?? 'bell'} size={16} color="#374151" />
    </View>
    <View className="flex-1">
      <Text
        className={`text-[15px] ${
          item.isRead ? 'font-medium text-gray-700' : 'font-semibold text-gray-900'
        }`}
      >
        {item.title}
      </Text>
      <Text className="text-sm text-gray-500 mt-0.5">{item.body}</Text>
      <Text className="text-xs text-gray-400 mt-1">
        {formatTimestamp(item.createdAt)}
      </Text>
    </View>
    {!item.isRead && <View className="w-2 h-2 rounded-full bg-blue-500 mt-2" />}
  </Pressable>
);

const NotificationsPage = () => {
  const tabBarClearance = useTabBarClearance();
  const { data, isLoading, isError, refetch, isRefetching } = useGetNotifications();
  const { mutate: markRead } = useMarkNotificationRead();
  const [onlyUnread, setOnlyUnread] = useState(false);

  const notifications: NotificationArray = useMemo(() => data ?? [], [data]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.isRead).length,
    [notifications],
  );

  const visible = useMemo(
    () => (onlyUnread ? notifications.filter((n) => !n.isRead) : notifications),
    [notifications, onlyUnread],
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      <View className="flex-row items-center justify-between px-4 pt-4 pb-3">
        <View className="flex-row items-center gap-2">
          <Text className="text-xl font-bold text-gray-900">Notifications</Text>
          {unreadCount > 0 && (
            <View className="bg-blue-600 rounded-full px-2 py-0.5 min-w-[22px] items-center">
              <Text className="text-[11px] font-bold text-white">
                {unreadCount}
              </Text>
            </View>
          )}
        </View>

        {unreadCount > 0 && (
          <Pressable
            onPress={() => setOnlyUnread((v) => !v)}
            hitSlop={8}
            className={`rounded-full px-3 py-1.5 ${
              onlyUnread ? 'bg-blue-600' : 'bg-gray-100'
            }`}
          >
            <Text
              className={`text-xs font-semibold ${
                onlyUnread ? 'text-white' : 'text-gray-600'
              }`}
            >
              Unread
            </Text>
          </Pressable>
        )}
      </View>

      {isLoading ? (
        <NotificationListSkeleton />
      ) : isError ? (
        <ErrorState
          title="Couldn't load notifications"
          subtitle="Check your connection and try again."
          onRetry={() => refetch()}
        />
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <NotificationRow
              item={item}
              onPress={() => {
                if (!item.isRead) markRead(item.id);
              }}
            />
          )}
          ItemSeparatorComponent={() => (
            <View className="h-px bg-gray-100" />
          )}
          ListEmptyComponent={
            <EmptyState
              icon={onlyUnread ? 'check' : 'bell-off'}
              title={onlyUnread ? "You're all caught up" : 'No notifications yet'}
              subtitle={
                onlyUnread
                  ? 'Nothing unread right now.'
                  : 'Fee reminders, marks results and announcements will show up here.'
              }
            />
          }
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor="#2563EB"
            />
          }
          contentContainerStyle={{ paddingBottom: tabBarClearance }}
        />
      )}
    </SafeAreaView>
  );
};

export default NotificationsPage;
