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

// Local calendar date (YYYY-MM-DD), NOT UTC. The rest of this app builds
// "day" Dates at local midnight (getWeekRange/getWeekDays/getMonthRange), and
// backend @db.Date values come back as UTC-midnight Dates — using
// toISOString() here would convert local midnight to the previous UTC day and
// shift every attendance record one row forward (e.g. 31st → 1st) for
// timezones east of UTC.
export const toISODate = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

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