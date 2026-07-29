import { toISODate } from "./week";

export const getYearRange = () => {
  const now = new Date();
  // Academic year: June of previous year to May of current year,
  // or adjust to your school's actual academic year bounds
  const currentMonth = now.getMonth();
  const academicStart = currentMonth >= 5
    ? new Date(now.getFullYear(), 5, 1)   // June this year
    : new Date(now.getFullYear() - 1, 5, 1); // June last year
  const academicEnd = new Date(academicStart.getFullYear() + 1, 4, 31); // May 31
  return {
    from: toISODate(academicStart),
    to: toISODate(academicEnd),
  };
};
