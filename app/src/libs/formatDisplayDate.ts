export const formatDisplayDate = (date: Date) =>
  date.toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
});

