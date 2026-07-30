import { CheckCircle2 } from 'lucide-react-native';
import React from 'react'
import { View,Modal,Text,Pressable } from "react-native";

export const SuccessModal = ({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <View className="flex-1 bg-black/40 items-center justify-center px-8">
      <View className="bg-white rounded-2xl p-6 w-full items-center">
        <View className="w-14 h-14 rounded-full bg-green-50 items-center justify-center mb-4">
          <CheckCircle2 size={32} color="#10B981" />
        </View>
        <Text className="text-lg inter_bold text-gray-900 mb-1.5">
          Password changed successfully
        </Text>
        <Text className="text-sm text-gray-500 text-center mb-5">
          Your password has been updated.
        </Text>
        <Pressable
          onPress={onClose}
          className="bg-blue-600 rounded-xl py-3 px-8 w-full items-center"
        >
          <Text className="text-white inter_bold text-base">Done</Text>
        </Pressable>
      </View>
    </View>
  </Modal>
);
