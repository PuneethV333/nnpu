import React from 'react'
import type { Section } from '@/src/types/section';
import { FlatList,Text, Pressable } from "react-native";

export const SectionPicker = ({
  sections,
  selectedId,
  onSelect,
}: {
  sections: Section[];
  selectedId: string;
  onSelect: (id: string) => void;
}) => (
  <FlatList
    horizontal
    showsHorizontalScrollIndicator={false}
    data={sections}
    keyExtractor={(s) => s.id}
    contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
    renderItem={({ item }) => {
      const selected = item.id === selectedId;
      return (
        <Pressable
          onPress={() => onSelect(item.id)}
          accessibilityRole="button"
          accessibilityState={{ selected }}
          // No `className` on this Pressable, for the reason spelled out in
          // components/attendance-page/StudentRow.tsx: NativeWind wraps a
          // Pressable that has one and silently drops a function-valued
          // `style`, which here would cost the pill its selected fill. The
          // padding and radius that came from `px-3 py-2 rounded-full border`
          // are in the style object below instead.
          style={({ pressed }) => ({
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 999,
            borderWidth: 1,
            // A selected pill darkens from the accent, an unselected one from
            // white. #1D4ED8 is the token the Save button already uses.
            backgroundColor: selected
              ? pressed
                ? "#1D4ED8"
                : "#2563EB"
              : pressed
                ? "#E5E7EB"
                : "#FFFFFF",
            borderColor: selected
              ? pressed
                ? "#1D4ED8"
                : "#2563EB"
              : "#E5E7EB",
          })}
        >
          <Text
            className="inter_medium text-sm"
            style={{ color: selected ? "#FFFFFF" : "#374151" }}
          >
            {item.name}
            {item.isClassTeacher ? " ★" : ""}
          </Text>
          <Text
            className="text-[10px]"
            style={{ color: selected ? "#DBEAFE" : "#9CA3AF" }}
          >
            {item.academicYearLabel}
          </Text>
        </Pressable>
      );
    }}
  />
);
