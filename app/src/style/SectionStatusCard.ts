import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 1,
  },
  className: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },
  classTeacherStar: {
    marginLeft: 6,
    fontSize: 13,
    color: "#D97706",
  },
  pill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  pillText: {
    fontSize: 12,
    fontWeight: "600",
  },
  // Darkens rather than scaling, matching the QuickActions cards. The border
  // darkens with the fill so it is never lighter than what it outlines.
  cardPressed: {
    backgroundColor: "#E5E7EB",
    borderColor: "#E5E7EB",
  },
});