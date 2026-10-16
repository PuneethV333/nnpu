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

const MarkEntryRowBase = ({
  studentId,
  name,
  value,
  maxMarks,
  onChange,
  readOnly = false,
}: {
  /**
   * Identifies the row to its parent's handler. Kept separate, alongside a
   * handler that is fixed for the life of the screen (`useCallback` in
   * MarkEntry), so this row's props stay referentially equal while a sibling is
   * being edited — which is what lets the `React.memo` at the bottom of this
   * file actually skip the rest of the roster.
   */
  studentId: string;
  name: string;
  value: string;
  maxMarks: number;
  onChange: (studentId: string, next: string) => void;
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
            onChangeText={
              readOnly ? undefined : (next) => onChange(studentId, next)
            }
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
        {MARK_PRESETS.filter((p) => p <= maxMarks).map((p) => {
          // Lit when the box already holds exactly this value. Without it the
          // chips all look alike and the teacher has to read the number back
          // out of the input to know whether a preset is what is in there.
          const selected = value !== "" && !invalid && !over && numeric === p;
          return (
            <Pressable
              key={p}
              onPress={() => onChange(studentId, String(p))}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={`Set ${p}`}
              // Same reason as the pills: `className` plus a function `style`
              // silently drops the function, so the geometry is inline here.
              // These are also the most numerous pressables on the screen (up
              // to 11 per student), so dropping the className is a small win
              // too - NativeWind re-resolves every classed element on render.
              style={({ pressed }) => ({
                borderRadius: 9999,
                borderWidth: 1,
                paddingHorizontal: 10,
                paddingVertical: 4,
                backgroundColor: selected
                  ? pressed
                    ? '#1D4ED8'
                    : '#2563EB'
                  : pressed
                    ? '#E5E7EB'
                    : '#F9FAFB',
                borderColor: selected
                  ? pressed
                    ? '#1D4ED8'
                    : '#2563EB'
                  : pressed
                    ? '#D1D5DB'
                    : '#E5E7EB',
              })}
            >
              {/* No `text-gray-600` here: a className colour beats an object
                  `style` colour in NativeWind's merge, which would pin the
                  label grey on the selected chip too. */}
              <Text
                className="text-[11px] font-medium"
                style={{ color: selected ? '#FFFFFF' : '#4B5563' }}
              >
                {p}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
      )}
    </View>
  );
};

/**
 * Memoised because a roster is one row per student and every keystroke or chip
 * tap writes to the single `draft` object on the screen, which re-renders all
 * of them. Each row is a TextInput plus up to 11 pressables, so on a 60-student
 * section that was ~700 elements re-rendering per tap — which is what the chip
 * tap felt like. With a stable `onChange` and a primitive-only prop set, only
 * the edited row re-renders now.
 */
export const MarkEntryRow = React.memo(MarkEntryRowBase);