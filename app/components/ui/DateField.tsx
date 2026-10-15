import React, { useState } from "react";
import { View, Text, Pressable, Platform } from "react-native";
import { Feather } from "@expo/vector-icons";
import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { FieldLabel } from "./Primitives";

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/**
 * "YYYY-MM-DD" <-> Date, in the device's local time.
 *
 * Deliberately not `toISOString()`: that converts to UTC, so a date picked at
 * local midnight in a UTC+ zone (India, UTC+5:30) serialises as the previous
 * day. The picker hands back a local Date, so format its local parts.
 */
const toYmd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;

const fromYmd = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};

const pretty = (s: string) => {
  const d = fromYmd(s);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};

/**
 * Tap-to-pick date field. `value` and `onChange` use "YYYY-MM-DD" (or "" for
 * no date) so callers keep sending the same string the API already expects.
 */
export const DateField = ({
  label,
  value,
  onChange,
  placeholder = "Select a date",
  clearable = true,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  clearable?: boolean;
}) => {
  const [open, setOpen] = useState(false);

  const handleChange = (event: DateTimePickerEvent, picked?: Date) => {
    if (Platform.OS === "android") {
      // Android shows a dialog that closes itself on both outcomes.
      setOpen(false);
      if (event.type === "set" && picked) onChange(toYmd(picked));
      return;
    }
    // iOS renders inline and reports every change; it stays open until Done.
    if (picked) onChange(toYmd(picked));
  };

  return (
    <View style={{ marginBottom: 16 }}>
      <FieldLabel>{label}</FieldLabel>

      <Pressable
        onPress={() => setOpen((o) => !o)}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value ? pretty(value) : "not set"}`}
        style={{
          flexDirection: "row",
          alignItems: "center",
          borderRadius: 12,
          borderWidth: 1,
          borderColor: open ? "#2563EB" : "#E5E7EB",
          backgroundColor: "#FFFFFF",
          paddingHorizontal: 12,
          paddingVertical: 10,
        }}
      >
        <Feather name="calendar" size={16} color="#6B7280" />
        <Text
          style={{
            flex: 1,
            marginLeft: 8,
            fontSize: 15,
            color: value ? "#111827" : "#9CA3AF",
          }}
        >
          {value ? pretty(value) : placeholder}
        </Text>

        {clearable && value ? (
          <Pressable
            onPress={() => {
              onChange("");
              setOpen(false);
            }}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={`Clear ${label}`}
          >
            <Feather name="x-circle" size={16} color="#9CA3AF" />
          </Pressable>
        ) : null}
      </Pressable>

      {open ? (
        <View>
          <DateTimePicker
            value={value ? fromYmd(value) : new Date()}
            mode="date"
            display={Platform.OS === "ios" ? "inline" : "default"}
            onChange={handleChange}
          />
          {Platform.OS === "ios" ? (
            <Pressable
              onPress={() => setOpen(false)}
              style={{ alignSelf: "flex-end", paddingVertical: 6 }}
            >
              <Text style={{ color: "#2563EB", fontWeight: "600", fontSize: 14 }}>
                Done
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
};