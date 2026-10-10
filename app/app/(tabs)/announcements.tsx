import React, { useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/src/hooks/useAuth';
import {
  useDeleteAnnouncement,
  useGetAnnouncements,
} from '@/src/hooks/useAnnouncement';
import { useTabBarClearance } from '@/src/hooks/useTabBarClearance';
import type { AnnouncementType, Latest } from '@/src/types/announcement';
import { errorMessage } from '@/src/libs/errorMessage';
import { EmptyState, ErrorState } from '@/components/ui/Feedback';
import { SkeletonList } from '@/components/ui/skeletons';
import { PillTabs } from '@/components/ui/Primitives';
import AnnouncementRow from '@/components/announcements/AnnouncementRow';
import AnnouncementForm from '@/components/announcements/AnnouncementForm';
import AnnouncementDetailSheet from '@/components/announcements/AnnouncementDetailSheet';
import { TYPE_COPY, TYPE_ORDER } from '@/components/announcements/announcementMeta';

const PAGE_SIZE = 10;

type Filter = 'All' | AnnouncementType;

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'All', label: 'All' },
  ...TYPE_ORDER.map((t) => ({ value: t as Filter, label: TYPE_COPY[t].label })),
];

type ChunkProps = {
  page: number;
  filter: Filter;
  isLast: boolean;
  onLoadMore: () => void;
  onOpen: (item: Latest) => void;
  onEdit?: (item: Latest) => void;
  onDelete?: (item: Latest) => void;
  deletingId: string | null;
};

/**
 * One page of the feed. Each page is its own query so cache, refetch and the
 * mutations' `['announcements']` invalidation all work per page without any
 * merge-and-dedupe state in the screen.
 */
const PageChunk = ({
  page,
  filter,
  isLast,
  onLoadMore,
  onOpen,
  onEdit,
  onDelete,
  deletingId,
}: ChunkProps) => {
  const { data, isLoading, isError, refetch } = useGetAnnouncements(page, PAGE_SIZE);

  if (isLoading) {
    return <SkeletonList count={page === 1 ? 4 : 2} lastWidth="60%" />;
  }

  if (isError || !data) {
    return (
      <ErrorState
        title="Couldn't load announcements"
        subtitle="Check your connection and try again."
        onRetry={() => refetch()}
      />
    );
  }

  if (page === 1 && data.length === 0) {
    return (
      <EmptyState
        icon="volume-2"
        title="No announcements yet"
        subtitle="Holiday notices, timetable and result updates will appear here."
      />
    );
  }

  const visible = filter === 'All' ? data : data.filter((a) => a.type === filter);
  const hasMore = data.length === PAGE_SIZE;

  return (
    <>
      {visible.map((item) => (
        <AnnouncementRow
          key={item.id}
          item={item}
          onPress={() => onOpen(item)}
          onEdit={onEdit ? () => onEdit(item) : undefined}
          onDelete={onDelete ? () => onDelete(item) : undefined}
          deleting={deletingId === item.id}
        />
      ))}

      {visible.length === 0 && page === 1 ? (
        <Text className="text-sm text-gray-400 text-center mt-8 mb-3">
          No {filter === 'All' ? '' : TYPE_COPY[filter].label.toLowerCase() + ' '}
          announcements on this page.
        </Text>
      ) : null}

      {isLast && hasMore ? (
        <Pressable
          onPress={onLoadMore}
          className="mx-4 mb-2 rounded-xl border border-gray-200 bg-white py-3 items-center"
        >
          <Text className="text-sm font-semibold text-gray-700">Load older</Text>
        </Pressable>
      ) : null}
    </>
  );
};

const Announcements = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const tabBarClearance = useTabBarClearance();
  const { role } = useAuth();
  const isAdmin = role === 'Admin';

  const [filter, setFilter] = useState<Filter>('All');
  const [pages, setPages] = useState(1);
  const [refreshing, setRefreshing] = useState(false);

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Latest | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);

  const { mutate: remove, variables: deletingVars, isPending: deleting } =
    useDeleteAnnouncement();
  const deletingId = deleting ? deletingVars ?? null : null;

  const confirmDelete = (item: Latest) => {
    Alert.alert(
      'Delete announcement?',
      `"${item.title}" will be removed for everyone it was sent to.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () =>
            remove(item.id, {
              onError: (err) => Alert.alert('Could not delete', errorMessage(err)),
            }),
        },
      ],
    );
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await queryClient.invalidateQueries({ queryKey: ['announcements'] });
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      <View className="flex-row items-center px-4 pt-4 pb-3" style={{ gap: 10 }}>
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/home'))}
          hitSlop={10}
          accessibilityLabel="Back"
        >
          <Feather name="chevron-left" size={24} color="#111827" />
        </Pressable>
        <Text className="text-2xl font-bold text-gray-900 flex-1">Announcements</Text>
        {isAdmin ? (
          <Pressable
            onPress={() => setCreating(true)}
            className="flex-row items-center rounded-full bg-indigo-600 px-3.5 py-2"
            style={{ gap: 6, backgroundColor: '#4F46E5' }}
          >
            <Feather name="plus" size={15} color="#FFFFFF" />
            <Text className="text-sm font-semibold text-white">New</Text>
          </Pressable>
        ) : null}
      </View>

      <View className="pb-3">
        <PillTabs options={FILTERS} value={filter} onChange={setFilter} activeColor="#2563EB" />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563EB" />
        }
        contentContainerStyle={{ paddingBottom: tabBarClearance }}
      >
        {Array.from({ length: pages }, (_, i) => i + 1).map((page) => (
          <PageChunk
            key={page}
            page={page}
            filter={filter}
            isLast={page === pages}
            onLoadMore={() => setPages((p) => p + 1)}
            onOpen={(item) => setViewingId(item.id)}
            onEdit={isAdmin ? setEditing : undefined}
            onDelete={isAdmin ? confirmDelete : undefined}
            deletingId={deletingId}
          />
        ))}
      </ScrollView>

      {viewingId ? (
        <AnnouncementDetailSheet id={viewingId} onClose={() => setViewingId(null)} />
      ) : null}
      {isAdmin && creating ? <AnnouncementForm onClose={() => setCreating(false)} /> : null}
      {isAdmin && editing ? (
        <AnnouncementForm key={editing.id} initial={editing} onClose={() => setEditing(null)} />
      ) : null}
    </SafeAreaView>
  );
};

export default Announcements;
