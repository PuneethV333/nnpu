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
  cardPressed: {
    opacity: 0.85,
    // Gentler than the 0.97 used on buttons and half-width cards. This one spans
    // the screen, so 0.97 would pull each edge in by roughly 5px and read as the
    // row detaching from the list rather than being pressed.
    transform: [{ scale: 0.98 }],
  },
});