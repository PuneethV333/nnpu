import React from "react";
import { View, Text, Modal, Pressable, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";

type AttendanceStatusModalProps = {
  visible: boolean;
  type: "success" | "error";
  title: string;
  message: string;
  onClose: () => void;
  onRetry?: () => void;
};

export const AttendanceStatusModal = ({
  visible,
  type,
  title,
  message,
  onClose,
  onRetry,
}: AttendanceStatusModalProps) => {
  const isSuccess = type === "success";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View
            style={[
              styles.iconCircle,
              { backgroundColor: isSuccess ? "#ECFDF5" : "#FEF2F2" },
            ]}
          >
            <Feather
              name={isSuccess ? "check-circle" : "alert-circle"}
              size={32}
              color={isSuccess ? "#10B981" : "#EF4444"}
            />
          </View>

          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          <View style={styles.actions}>
            {!isSuccess && onRetry && (
              <Pressable
                onPress={onRetry}
                style={({ pressed }) => [
                  styles.button,
                  styles.retryButton,
                  pressed && { backgroundColor: "#F3F4F6" },
                ]}
              >
                <Text style={styles.retryButtonText}>Try Again</Text>
              </Pressable>
            )}

            <Pressable
              onPress={onClose}
              style={({ pressed }) => [
                styles.button,
                isSuccess ? styles.successButton : styles.dismissButton,
                pressed && {
                  backgroundColor: isSuccess ? "#1D4ED8" : "#E5E7EB",
                },
              ]}
            >
              <Text
                style={
                  isSuccess ? styles.successButtonText : styles.dismissButtonText
                }
              >
                {isSuccess ? "Done" : "Dismiss"}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingVertical: 24,
    paddingHorizontal: 24,
    width: "100%",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 6,
    textAlign: "center",
  },
  message: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 20,
  },
  actions: {
    flexDirection: "row",
    width: "100%",
  },
  button: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  successButton: {
    backgroundColor: "#2563EB",
  },
  successButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 15,
  },
  dismissButton: {
    backgroundColor: "#F3F4F6",
  },
  dismissButtonText: {
    color: "#374151",
    fontWeight: "700",
    fontSize: 15,
  },
  retryButton: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginRight: 8,
  },
  retryButtonText: {
    color: "#374151",
    fontWeight: "700",
    fontSize: 15,
  },
});