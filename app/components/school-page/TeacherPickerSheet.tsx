import React, { useMemo, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { TeacherOption } from '@/src/types/users';
import { BottomSheet } from '@/components/ui/Primitives';
import { colors } from '@/constants/theme';

type Props = {
  title: string;
  subtitle?: string;
  teachers: TeacherOption[];
  /** Ids currently assigned. For the class-teacher picker this holds at most one. */
  selectedIds: string[];
  /**
   * The subject being staffed, when there is one. Teachers recorded as teaching
   * it are marked, which is the only place those recorded subjects are used —
   * the marker is a hint, not a filter or a restriction.
   */
  subjectId?: string;
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
  hint,
  selected,
  icon,
  onPress,
}: {
  label: string;
  hint?: string;
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
    <View style={{ marginLeft: 12, flex: 1 }}>
      <Text style={{ fontSize: 15, fontWeight: '500' }} className="text-gray-900">
        {label}
      </Text>
      {hint ? (
        <Text className="text-xs text-blue-600 mt-0.5">{hint}</Text>
      ) : null}
    </View>
    {selected ? <Feather name="check" size={18} color={colors.accent} /> : null}
  </Pressable>
);

const TeacherPickerSheet = ({
  title,
  subtitle,
  teachers,
  selectedIds,
  subjectId,
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

  const footer = multiple
    ? subjectId
      ? 'Tap to add or remove teachers. The change is kept when you save. The ones marked in blue were recorded as teaching this subject.'
      : 'Tap to add or remove teachers. The change is kept when you save.'
    : 'Every active teacher is listed, whether or not they are staffed yet.';

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
          hint={
            subjectId && t.subjectIds.includes(subjectId)
              ? 'Recorded as teaching this subject'
              : undefined
          }
          selected={isSelected(t.id)}
          onPress={() => onToggle(t.id)}
          icon={
            <View className="w-9 h-9 rounded-full bg-blue-50 items-center justify-center">
              <Text className="text-xs font-bold text-blue-700">
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

      <Text className="text-xs text-gray-400 leading-5 mt-4">{footer}</Text>
    </BottomSheet>
  );
};

export default TeacherPickerSheet;
