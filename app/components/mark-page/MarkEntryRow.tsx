import React from "react";
import { View, Text, ScrollView, Pressable, TextInput } from "react-native";

/**
 * Quick-tap marks shortcuts, filtered to what the assessment allows.
 *
 * Lives here rather than being passed in because it is the row's affordance,
 * not the screen's: a caller rendering one row wants the presets with it, and
 * making them a prop would mean every caller re-declares the same list.
 *
 * The upper bound is filtered against `maxMarks`, so a 10-mark internal
 * assessment does not offer a "100" button that the screen would then reject
 * as out of range.
 */
const MARK_PRESETS = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

export const MarkEntryRow = ({
  name,
  value,
  maxMarks,
  onChange,
  readOnly = false,
}: {
  name: string;
  value: string;
  maxMarks: number;
  onChange: (next: string) => void;
  /** View mode: shows the saved mark without offering the quick-tap presets. */
  readOnly?: boolean;
}) => {
  const numeric = Number(value);
  const invalid = value !== "" && (Number.isNaN(numeric) || numeric < 0);
  const over = !invalid && numeric > maxMarks;

  return (
    <View className="px-4 py-3 border-b border-gray-100">
      <View className="flex-row items-center justify-between">
        <Text
          className="text-[15px] font-medium text-gray-900 flex-1 mr-3"
          numberOfLines={1}
        >
          {name}
        </Text>

        <View className="flex-row items-center">
          <TextInput
            value={value}
            onChangeText={readOnly ? undefined : onChange}
            editable={!readOnly}
            selectTextOnFocus={!readOnly}
            placeholder="-"
            placeholderTextColor="#D1D5DB"
            keyboardType="numeric"
            className="w-16 text-center text-[15px] font-semibold rounded-lg border bg-white"
            style={{
              borderColor: invalid || over ? "#DC2626" : "#E5E7EB",
              paddingVertical: 6,
              paddingHorizontal: 8,
              color: invalid || over ? "#DC2626" : "#111827",
            }}
          />
          <Text className="text-sm text-gray-400 ml-2 w-8 text-right">
            /{maxMarks}
          </Text>
        </View>
      </View>

      {over && (
        <Text className="text-xs text-red-500 mt-1">
          Marks can&apos;t exceed {maxMarks}.
        </Text>
      )}

      {!readOnly && (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 6, paddingTop: 8, paddingRight: 8 }}
      >
        {MARK_PRESETS.filter((p) => p <= maxMarks).map((p) => (
          <Pressable
            key={p}
            onPress={() => onChange(String(p))}
            className="px-2.5 py-1 rounded-full border border-gray-200 bg-gray-50"
          >
            <Text className="text-[11px] font-medium text-gray-600">{p}</Text>
          </Pressable>
        ))}
      </ScrollView>
      )}
    </View>
  );
};