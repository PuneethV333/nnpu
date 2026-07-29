export const shiftDate = (date: Date, days: number) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};