import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  card: {
    width: 240,
    height:180,
    marginRight: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#F0F1F3",
  },
  typeBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    marginBottom: 8,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  title: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  body: {
    fontSize: 12,
    color: "#6B7280",
    lineHeight: 17,
    marginBottom: 12,
  },
  authorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  avatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  avatarFallback: {
    backgroundColor: "#E0E7FF",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: {
    fontSize: 10,
    fontWeight: "600",
    color: "#4338CA",
  },
  authorName: {
    fontSize: 12,
    fontWeight: "500",
    color: "#374151",
    flexShrink: 1,
  },
});