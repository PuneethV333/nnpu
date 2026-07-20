// Returns Monday and Saturday of the week `offset` weeks from today.
// offset: 0 = this week, -1 = last week, +1 = next week.
export const getWeekRange = (offset: number) => {
  const now = new Date();
  const day = now.getDay(); // 0 = Sun, 1 = Mon, ... 6 = Sat

  // days since most recent Monday (Sunday counts as 6 days after Monday)
  const diffToMonday = day === 0 ? 6 : day - 1;

  const monday = new Date(now);
  monday.setDate(now.getDate() - diffToMonday + offset * 7);
  monday.setHours(0, 0, 0, 0);

  const saturday = new Date(monday);
  saturday.setDate(monday.getDate() + 5);

  return { monday, saturday };
};

export const toISODate = (d: Date) => d.toISOString().slice(0, 10);

export const formatDayLabel = (d: Date) =>
  d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });

export const formatRangeLabel = (monday: Date, saturday: Date) => {
  const m = monday.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  const s = saturday.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  return `${m} - ${s}`;
};

// Mon..Sat as 6 Date objects for a given week
export const getWeekDays = (monday: Date): Date[] =>
  Array.from({ length: 6 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });