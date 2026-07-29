import { toISODate } from "./week";

export const getMonthRange = (year: number, month: number) => {
  const from = toISODate(new Date(year, month, 1));
  const to = toISODate(new Date(year, month + 1, 0)); // last day of month
  return { from, to };
};