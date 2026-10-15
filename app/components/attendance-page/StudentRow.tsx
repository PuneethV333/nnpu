import React from "react";
import { View, Text, Pressable } from "react-native";
import { MarkStatus, STATUS_OPTIONS, RosterItem } from "@/src/types/attendance";

export const StudentRow = ({
  item,
  status,
  onChange,
  disabled,
}: {
  item: RosterItem;
  status: MarkStatus;
  onChange: (status: MarkStatus) => void;
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
            onPress={() => onChange(opt.value)}
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
              backgroundColor: selected ? opt.color : "#F3F4F6",
              opacity: disabled ? 0.5 : pressed ? 0.6 : 1,
              transform: [{ scale: pressed && !disabled ? 0.88 : 1 }],
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
