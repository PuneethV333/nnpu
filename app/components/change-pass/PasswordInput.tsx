import { Eye, EyeOff } from "lucide-react-native";
import React, { useState } from "react";
import { View, Text, TextInput, Pressable } from "react-native";

export const PasswordInput = ({
  label,
  value,
  onChangeText,
  error,
  placeholder,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
  placeholder: string;
}) => {
  const [visible, setVisible] = useState(false);
  const [focused, setFocused] = useState(false);

  const borderColor = error ? "#EF4444" : focused ? "#2563EB" : "#E5E7EB";

  return (
    <View className="mb-4">
      <Text className="text-sm inter_medium text-gray-700 mb-1.5">
        {label}
      </Text>
      <View
        className="flex-row items-center bg-white border rounded-xl px-4"
        style={{ borderColor, borderWidth: focused ? 1.5 : 1 }}
      >
        <TextInput
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
          secureTextEntry={!visible}
          autoCapitalize="none"
          autoCorrect={false}
          className="flex-1 py-3.5 text-gray-900 text-base"
        />
        <Pressable onPress={() => setVisible((v) => !v)} hitSlop={10}>
          {visible ? (
            <EyeOff size={20} color="#9CA3AF" />
          ) : (
            <Eye size={20} color="#9CA3AF" />
          )}
        </Pressable>
      </View>
      {error ? (
        <Text className="text-red-500 text-xs mt-1.5">{error}</Text>
      ) : null}
    </View>
  );
};