export const ANNUAL_LEAVE_ENTITLEMENT_DAYS = 21;

const toDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const easterSunday = (year: number) => {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
};

/** The centrally maintained Kenya public-holiday set used by leave calculations. */
export const getKenyaPublicHolidayDates = (year: number): string[] => {
  const easter = easterSunday(year);
  const goodFriday = new Date(easter);
  goodFriday.setDate(easter.getDate() - 2);
  const easterMonday = new Date(easter);
  easterMonday.setDate(easter.getDate() + 1);

  return [
    `${year}-01-01`, // New Year's Day
    `${year}-05-01`, // Labour Day
    `${year}-06-01`, // Madaraka Day
    `${year}-10-20`, // Mashujaa Day
    `${year}-12-12`, // Jamhuri Day
    `${year}-12-25`, // Christmas Day
    `${year}-12-26`, // Boxing Day
    toDateKey(goodFriday),
    toDateKey(easterMonday),
  ];
};

/**
 * Count inclusive working days, excluding Saturdays, Sundays, and supplied holidays.
 * The optional holiday list makes the calculation easy to extend for gazetted holidays.
 */
export const countWorkingDays = (
  startDate: Date,
  endDate: Date,
  holidayDates: string[] = [],
): number => {
  const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
  if (start > end) return 0;

  const holidays = new Set(holidayDates);
  let count = 0;
  const cursor = new Date(start);
  while (cursor <= end) {
    const day = cursor.getDay();
    if (day !== 0 && day !== 6 && !holidays.has(toDateKey(cursor))) count += 1;
    cursor.setDate(cursor.getDate() + 1);
  }
  return count;
};

export const countKenyaWorkingDays = (startDate: Date, endDate: Date): number => {
  const holidays = new Set<string>();
  for (let year = startDate.getFullYear(); year <= endDate.getFullYear(); year += 1) {
    getKenyaPublicHolidayDates(year).forEach((holiday) => holidays.add(holiday));
  }
  return countWorkingDays(startDate, endDate, Array.from(holidays));
};
