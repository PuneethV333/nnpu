import React, { useMemo, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { TeacherOption } from '@/src/hooks/useSections';
import { BottomSheet } from '@/components/ui/Primitives';

type Props = {
  title: string;
  subtitle?: string;
  teachers: TeacherOption[];
  /** Ids currently assigned. For the class-teacher picker this holds at most one. */
  selectedIds: string[];
  /** Label of the "nobody" row, e.g. "Leave unstaffed". */
  noneLabel: string;
  /**
   * Taps toggle instead of picking-and-closing, so the sheet stays open while
   * several teachers are added to one subject. The caller closes it.
   */
  multiple?: boolean;
  isLoading?: boolean;
  onToggle: (teacherId: string | null) => void;
  onClose: () => void;
};

/**
 * One row of the sheet.
 *
 * `className` is deliberately absent: NativeWind wraps a className'd Pressable
 * and drops a function-valued `style`, which is exactly the press feedback this
 * row needs. The geometry lives in the style function instead.
 */
const PickerRow = ({
  label,
  selected,
  icon,
  onPress,
}: {
  label: string;
  selected: boolean;
  icon: React.ReactNode;
  onPress: () => void;
}) => (
  <Pressable
    onPress={onPress}
    accessibilityRole="button"
    accessibilityState={{ selected }}
    style={({ pressed }) => ({
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 8,
      marginHorizontal: -8,
      borderRadius: 12,
      borderBottomWidth: 1,
      borderBottomColor: '#F3F4F6',
      backgroundColor: pressed ? '#F3F4F6' : 'transparent',
    })}
  >
    {icon}
    <Text style={{ marginLeft: 12, flex: 1, fontSize: 15, fontWeight: '500' }} className="text-gray-900">
      {label}
    </Text>
    {selected ? <Feather name="check" size={18} color="#4F46E5" /> : null}
  </Pressable>
);

const TeacherPickerSheet = ({
  title,
  subtitle,
  teachers,
  selectedIds,
  noneLabel,
  multiple = false,
  isLoading,
  onToggle,
  onClose,
}: Props) => {
  const [query, setQuery] = useState('');

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? teachers.filter((t) => t.name.toLowerCase().includes(q)) : teachers;
  }, [teachers, query]);

  const isSelected = (id: string) => selectedIds.includes(id);

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

      <PickerRow
        label={noneLabel}
        selected={selectedIds.length === 0}
        onPress={() => onToggle(null)}
        icon={
          <View className="w-9 h-9 rounded-full bg-gray-100 items-center justify-center">
            <Feather name="slash" size={15} color="#6B7280" />
          </View>
        }
      />

      {shown.map((t) => (
        <PickerRow
          key={t.id}
          label={t.name}
          selected={isSelected(t.id)}
          onPress={() => onToggle(t.id)}
          icon={
            <View className="w-9 h-9 rounded-full bg-indigo-50 items-center justify-center">
              <Text className="text-xs font-bold text-indigo-700">
                {t.name.charAt(0).toUpperCase()}
              </Text>
            </View>
          }
        />
      ))}

      {isLoading ? (
        <Text className="text-xs text-gray-400 mt-3">Loading more teachers…</Text>
      ) : shown.length === 0 ? (
        <Text className="text-sm text-gray-400 mt-3">No teachers found.</Text>
      ) : null}

      <Text className="text-xs text-gray-400 leading-5 mt-4">
        {multiple
          ? 'Tap to add or remove teachers. The change is kept when you save.'
          : 'Only teachers already staffed somewhere in the school are listed.'}
      </Text>
    </BottomSheet>
  );
};

export default TeacherPickerSheet;
