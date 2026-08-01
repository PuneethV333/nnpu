import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  scrollContent: {
    paddingBottom: 104,
  },
  dayChip: {
    marginHorizontal: 16,
    marginTop: 12,
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  dayChipText: {
    fontSize: 12,
    fontWeight: "600",
  },
  dashCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  dashCardTitle: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 4,
  },
  dashCardValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
  },
  dashCardSubtext: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 2,
  },
  eventRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  eventLabel: {
    fontSize: 14,
    color: "#111827",
    flexShrink: 1,
  },
  eventPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  eventPillText: {
    fontSize: 11,
    fontWeight: "600",
  },
  loadingBox: {
    paddingVertical: 24,
    alignItems: "center",
  },
  errorBox: {
    backgroundColor: "#FEE2E2",
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginTop: 12,
  },
  errorText: {
    fontSize: 13,
    color: "#B91C1C",
  },
  emptyBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    paddingVertical: 24,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 13,
    color: "#6B7280",
  },
  announcementsRow: {
    gap: 12,
    paddingRight: 16,
  },
  announcementItem: {
    width: 260,
  },
});