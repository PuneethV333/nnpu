import React from 'react'
import type { SectionDto } from '$/api/sections';
import { FlatList,Text, Pressable } from "react-native";

export const SectionPicker = ({
  sections,
  selectedId,
  onSelect,
}: {
  sections: SectionDto[];
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
          className="px-3 py-2 rounded-full border"
          style={{
            backgroundColor: selected ? "#2563EB" : "#FFFFFF",
            borderColor: selected ? "#2563EB" : "#E5E7EB",
          }}
        >
          <Text
            className="inter_medium text-sm"
            style={{ color: selected ? "#FFFFFF" : "#374151" }}
          >
            {item.className} {item.name}
            {item.isClassTeacher ? " ★" : ""}
          </Text>
        </Pressable>
      );
    }}
  />
);
