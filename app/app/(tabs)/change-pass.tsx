import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useAuth } from "$/hooks/useAuth";
import { PasswordInput } from "../../components/change-pass/PasswordInput";
import { SuccessModal } from "../../components/change-pass/SuccessModal";

const MIN_PASSWORD_LENGTH = 8;

type FieldErrors = {
  oldPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
};

const ChangePassword = () => {
  const { changePassword } = useAuth();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const validate = (): boolean => {
    const next: FieldErrors = {};

    if (!oldPassword) {
      next.oldPassword = "Enter your current password";
    }

    if (!newPassword) {
      next.newPassword = "Enter a new password";
    } else if (newPassword.length < MIN_PASSWORD_LENGTH) {
      next.newPassword = `Must be at least ${MIN_PASSWORD_LENGTH} characters`;
    } else if (newPassword === oldPassword) {
      next.newPassword = "New password must be different from the old one";
    }

    if (!confirmPassword) {
      next.confirmPassword = "Confirm your new password";
    } else if (confirmPassword !== newPassword) {
      next.confirmPassword = "Passwords do not match";
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async () => {
    setSubmitError(null);
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      await changePassword(oldPassword, newPassword);
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setErrors({});
      setShowSuccess(true);
    } catch (err: any) {
      setSubmitError(
        err?.response?.data?.message ??
          "Couldn't change password. Check your current password and try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={{ flex: 1, paddingTop: insets.top }} className="bg-gray-50">
      {/* Header */}
      <View className="flex-row items-center px-4 pt-2 pb-1">
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          className="w-9 h-9 rounded-full bg-white border border-gray-100 items-center justify-center"
        >
          <Feather name="arrow-left" size={18} color="#374151" />
        </Pressable>
        <Text className="text-xl font-bold text-gray-900 ml-3">
          Change password
        </Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ paddingBottom: 135 }}
          keyboardShouldPersistTaps="handled"
        >
          <Text className="text-sm text-gray-500 px-4 pt-3 pb-2">
            Use at least {MIN_PASSWORD_LENGTH} characters, and pick something
            you haven&apos;t used before.
          </Text>

          <View className="bg-white rounded-2xl border border-gray-100 mx-4 p-4">
            <PasswordInput
              label="Current password"
              value={oldPassword}
              onChangeText={(t) => {
                setOldPassword(t);
                if (errors.oldPassword) {
                  setErrors((e) => ({ ...e, oldPassword: undefined }));
                }
              }}
              error={errors.oldPassword}
              placeholder="Enter current password"
            />

            <View className="h-px bg-gray-100 my-1" />

            <PasswordInput
              label="New password"
              value={newPassword}
              onChangeText={(t) => {
                setNewPassword(t);
                if (errors.newPassword) {
                  setErrors((e) => ({ ...e, newPassword: undefined }));
                }
              }}
              error={errors.newPassword}
              placeholder="Enter new password"
            />

            <PasswordInput
              label="Confirm new password"
              value={confirmPassword}
              onChangeText={(t) => {
                setConfirmPassword(t);
                if (errors.confirmPassword) {
                  setErrors((e) => ({ ...e, confirmPassword: undefined }));
                }
              }}
              error={errors.confirmPassword}
              placeholder="Re-enter new password"
            />
          </View>

          {submitError ? (
            <View className="flex-row items-start mx-4 mt-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <Feather
                name="alert-circle"
                size={16}
                color="#DC2626"
                style={{ marginTop: 2, marginRight: 8 }}
              />
              <Text className="text-red-600 text-sm font-semibold flex-1">
                {submitError}
              </Text>
            </View>
          ) : null}

          <Pressable
            onPress={handleSubmit}
            disabled={isSubmitting}
            className="bg-blue-600 rounded-xl py-3.5 items-center mx-4 mt-6 active:bg-blue-700"
            style={{ opacity: isSubmitting ? 0.6 : 1 }}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text className="text-white font-bold text-[15px]">
                Update Password
              </Text>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>

      <SuccessModal
        visible={showSuccess}
        onClose={() => {
          setShowSuccess(false);
          router.back();
        }}
      />
    </View>
  );
};

export default ChangePassword;