import React from 'react';
import {View,Text, Pressable} from 'react-native'
import { MarkStatus, STATUS_OPTIONS,RosterItem } from "@/src/types/attendance";

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
            className="w-9 h-9 rounded-full items-center justify-center ml-2"
            style={{
              backgroundColor: selected ? opt.color : "#F3F4F6",
              opacity: disabled ? 0.5 : 1,
            }}
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