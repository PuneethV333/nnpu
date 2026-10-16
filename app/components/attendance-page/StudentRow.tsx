import React from "react";
import { View, Text, Pressable } from "react-native";
import { MarkStatus, STATUS_OPTIONS, RosterItem } from "@/src/types/attendance";

const StudentRowBase = ({
  item,
  status,
  onChange,
  disabled,
}: {
  item: RosterItem;
  status: MarkStatus;
  onChange: (studentId: string, status: MarkStatus) => void;
  disabled: boolean;
}) => (
  <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-100">
    <View className="flex-1 pr-3">
      <Text className="text-base inter_medium text-gray-900" numberOfLines={1}>
        {item.name ?? item.studentId}
      </Text>
    </View>

    <View className="flex-row">
      {STATUS_OPTIONS.map((opt) => {
        const selected = status === opt.value;
        return (
          <Pressable
            key={opt.value}
            disabled={disabled}
            onPress={() => onChange(item.studentId, opt.value)}
            // No `className` on this Pressable on purpose. NativeWind wraps a
            // Pressable that has one and does not reliably forward a
            // function-valued `style`, so the whole style below (fill, size,
            // radius) was dropped. The unselected buttons lost their grey
            // circle and the selected one lost its fill, leaving white text
            // on the white card - the "P/A/L disappears" bug. Size and shape
            // live in the style object so nothing depends on that merge.
            style={({ pressed }) => ({
              width: 36,
              height: 36,
              borderRadius: 18,
              marginLeft: 8,
              alignItems: "center",
              justifyContent: "center",
              // Press feedback is a darker fill, not a fade. Fading the selected
              // button pulled its white label toward the white card, which is
              // the same vanished-button class of bug the comment above guards
              // against - and it bit hardest on the button the teacher had just
              // picked. The small scale stays as a second, tactile cue.
              backgroundColor:
                pressed && !disabled
                  ? selected
                    ? opt.pressedColor
                    : "#D1D5DB"
                  : selected
                    ? opt.color
                    : "#F3F4F6",
              opacity: disabled ? 0.5 : 1,
              transform: [{ scale: pressed && !disabled ? 0.94 : 1 }],
              borderWidth: selected ? 2 : 1,
              borderColor: selected ? "#FFFFFF" : "#E5E7EB",
              shadowColor: selected ? opt.color : "transparent",
              shadowOpacity: selected ? 0.85 : 0,
              shadowRadius: selected ? 6 : 0,
              shadowOffset: { width: 0, height: 0 },
              elevation: selected ? 6 : 0,
            })}
            accessibilityRole="button"
            accessibilityState={{ selected, disabled }}
            accessibilityLabel={`Mark ${item.name ?? item.studentId} ${opt.label === "P" ? "present" : opt.label === "A" ? "absent" : "late"}`}
          >
            <Text
              className="inter_bold text-sm"
              style={{ color: selected ? "#FFFFFF" : "#6B7280" }}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  </View>
);

/**
 * Memoised because the draft lives in the parent: without this, one tap
 * re-renders all N rows in the roster.
 *
 * Each row holds seven classed elements (the row, two wrappers, the name and
 * three button labels), and react-native-css re-resolves a classed element
 * whenever any prop it guards on changes identity - it compares with `!==`.
 * Every one of those elements passes an inline `style` literal, so that guard
 * trips on every render and the class names are re-parsed. Across a 50-student
 * section a single tap was re-resolving hundreds of style objects, which is
 * where the ~1s delay came from.
 *
 * `onChange` takes the student id so the parent can hand over one stable
 * callback. A per-row arrow would be a fresh prop identity every render and
 * would defeat this memo entirely.
 */
export const StudentRow = React.memo(StudentRowBase);
