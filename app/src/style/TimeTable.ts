import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  sectionSpacing: {
    marginTop: 20,
  },
  timetableList: {
    flex: 1,
  },
  timetableListContent: {
    paddingBottom: 24,
  },
  slotCard: {
    flexDirection: "row",
    backgroundColor: "#F9FAFB",
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#F0F1F3",
  },
  slotBreak: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    paddingVertical: 12,
    marginBottom: 10,
  },
  slotBreakLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
    letterSpacing: 0.5,
  },
  slotBreakTime: {
    fontSize: 12,
    color: "#9CA3AF",
    marginLeft: 8,
  },
  slotTime: {
    width: 64,
    justifyContent: "center",
  },
  slotTimeStart: {
    fontSize: 12,
    fontWeight: "500",
    color: "#6B7280",
  },
  slotTimeEnd: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  slotBody: {
    flex: 1,
    marginLeft: 12,
  },
  slotOption: {
    marginTop: 0,
  },
  slotOptionDivider: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  slotSubject: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },
  slotTeacher: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 2,
  },
  slotFree: {
    fontSize: 14,
    fontStyle: "italic",
    color: "#9CA3AF",
  },
  emptyStateText: {
    fontSize: 13,
    color: "#9CA3AF",
    paddingHorizontal: 4,
  },
})