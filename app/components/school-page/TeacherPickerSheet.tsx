import React, { useMemo, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { TeacherOption } from '@/src/hooks/useSections';
import { BottomSheet } from '@/components/ui/Primitives';

type Props = {
  title: string;
  subtitle?: string;
  teachers: TeacherOption[];
  currentId: string | null;
  /** Label of the "nobody" row, e.g. "Leave unstaffed". */
  noneLabel: string;
  isLoading?: boolean;
  onPick: (teacherId: string | null) => void;
  onClose: () => void;
};

const TeacherPickerSheet = ({
  title,
  subtitle,
  teachers,
  currentId,
  noneLabel,
  isLoading,
  onPick,
  onClose,
}: Props) => {
  const [query, setQuery] = useState('');

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? teachers.filter((t) => t.name.toLowerCase().includes(q)) : teachers;
  }, [teachers, query]);

  return (
    <BottomSheet title={title} subtitle={subtitle} onClose={onClose}>
      {teachers.length > 8 ? (
        <View className="mb-3 flex-row items-center rounded-xl border border-gray-200 bg-white px-3">
          <Feather name="search" size={16} color="#9CA3AF" />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search teachers"
            placeholderTextColor="#9CA3AF"
            className="flex-1 py-2.5 px-2 text-[15px] text-gray-900"
          />
        </View>
      ) : null}

      <Pressable
        onPress={() => onPick(null)}
        className="flex-row items-center py-3.5 border-b border-gray-100"
      >
        <View className="w-9 h-9 rounded-full bg-gray-100 items-center justify-center">
          <Feather name="slash" size={15} color="#6B7280" />
        </View>
        <Text className="text-[15px] font-medium text-gray-700 ml-3 flex-1">{noneLabel}</Text>
        {currentId === null ? <Feather name="check" size={18} color="#4F46E5" /> : null}
      </Pressable>

      {shown.map((t) => (
        <Pressable
          key={t.id}
          onPress={() => onPick(t.id)}
          className="flex-row items-center py-3.5 border-b border-gray-100"
        >
          <View className="w-9 h-9 rounded-full bg-indigo-50 items-center justify-center">
            <Text className="text-xs font-bold text-indigo-700">
              {t.name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text className="text-[15px] font-medium text-gray-900 ml-3 flex-1">{t.name}</Text>
          {currentId === t.id ? <Feather name="check" size={18} color="#4F46E5" /> : null}
        </Pressable>
      ))}

      {isLoading ? (
        <Text className="text-xs text-gray-400 mt-3">Loading more teachers…</Text>
      ) : shown.length === 0 ? (
        <Text className="text-sm text-gray-400 mt-3">No teachers found.</Text>
      ) : null}

      <Text className="text-xs text-gray-400 leading-5 mt-4">
        Only teachers already staffed somewhere in the school are listed.
      </Text>
    </BottomSheet>
  );
};

export default TeacherPickerSheet;
