import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 12,
  },
  card: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111827",
  },
  // Press feedback: the card darkens instead of dimming or scaling, so the tap
  // reads as a highlight. `pressed` flips on touch-down, not on release, so it
  // lands the instant the finger goes down.
  //
  // The border darkens with the fill on purpose: left at #F3F4F6 it would be
  // lighter than the fill it outlines.
  cardPressed: {
    backgroundColor: "#E5E7EB",
    borderColor: "#E5E7EB",
  },
});