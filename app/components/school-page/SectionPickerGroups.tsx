import React, { useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';
import type { Section } from '@/src/types/section';
import SectionChips from '@/components/ui/SectionChips';

type Props = {
  sections: Section[];
  selectedIds: string[];
  onChange: (next: string[]) => void;
  activeColor?: string;
};

/**
 * Multi-select grouped by class, with a "select all" per group. Promotion and
 * pass-out both act on whole cohorts, and tapping 8 chips one by one is how
 * a section gets forgotten.
 */
const SectionPickerGroups = ({ sections, selectedIds, onChange, activeColor }: Props) => {
  const groups = useMemo(() => {
    const map = new Map<string, Section[]>();
    sections.forEach((s) => {
      map.set(s.className, [...(map.get(s.className) ?? []), s]);
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [sections]);

  const toggle = (id: string) =>
    onChange(selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id]);

  return (
    <View style={{ gap: 14 }}>
      {groups.map(([className, list]) => {
        const ids = list.map((s) => s.id);
        const allSelected = ids.every((id) => selectedIds.includes(id));

        return (
          <View key={className}>
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-sm font-semibold text-gray-700">Class {className}</Text>
              <Pressable
                hitSlop={8}
                onPress={() =>
                  onChange(
                    allSelected
                      ? selectedIds.filter((id) => !ids.includes(id))
                      : Array.from(new Set([...selectedIds, ...ids])),
                  )
                }
              >
                <Text className="text-xs font-semibold text-indigo-600">
                  {allSelected ? 'Clear' : 'Select all'}
                </Text>
              </Pressable>
            </View>
            <SectionChips
              sections={list}
              selectedIds={selectedIds}
              onToggle={toggle}
              activeColor={activeColor}
            />
          </View>
        );
      })}
    </View>
  );
};

export default SectionPickerGroups;
