import React from 'react';
import { Pressable, Text, View } from 'react-native';
import type { Section } from '@/src/types/section';

type Props = {
  sections: Section[];
  selectedIds: string[];
  onToggle: (sectionId: string) => void;
  activeColor?: string;
};

/**
 * Wrapping chip list of sections. `Section.name` carries no year, so once more
 * than one academic year exists two chips can both read "2-SCI-A" — the year
 * label is rendered beside the name for that reason (same treatment the CSV
 * import already used).
 *
 * Single vs. multi select is the caller's decision: this only reports taps.
 */
const SectionChips = ({
  sections,
  selectedIds,
  onToggle,
  activeColor = '#4F46E5',
}: Props) => (
  <View className="flex-row flex-wrap" style={{ gap: 8 }}>
    {sections.map((section) => {
      const active = selectedIds.includes(section.id);
      return (
        <Pressable
          key={section.id}
          onPress={() => onToggle(section.id)}
          className="px-3 py-2 rounded-full border flex-row items-center"
          style={{
            gap: 6,
            backgroundColor: active ? activeColor : '#FFFFFF',
            borderColor: active ? activeColor : '#E5E7EB',
          }}
        >
          <Text
            className="text-sm font-medium"
            style={{ color: active ? '#FFFFFF' : '#374151' }}
          >
            {section.name}
          </Text>
          <Text
            className="text-[10px]"
            style={{ color: active ? '#E0E7FF' : '#9CA3AF' }}
          >
            {section.academicYearLabel}
          </Text>
        </Pressable>
      );
    })}
  </View>
);

export default SectionChips;
