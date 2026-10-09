const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const NAIROBI_OFFSET = "+03:00";

export function parseNairobiDateOnly(value: string, endOfDay = false): Date {
  if (!DATE_ONLY_PATTERN.test(value)) {
    throw new Error("Date must use YYYY-MM-DD format");
  }

  const [year, month, day] = value.split("-").map(Number);
  const calendarCheck = new Date(Date.UTC(year, month - 1, day));
  if (
    calendarCheck.getUTCFullYear() !== year ||
    calendarCheck.getUTCMonth() !== month - 1 ||
    calendarCheck.getUTCDate() !== day
  ) {
    throw new Error("Invalid calendar date");
  }

  const suffix = endOfDay ? "T23:59:59.999" : "T00:00:00";
  const parsed = new Date(`${value}${suffix}${NAIROBI_OFFSET}`);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Invalid calendar date");
  }
  return parsed;
}

export function getInclusiveNairobiDateRange(startDate?: string, endDate?: string) {
  if (!startDate && !endDate) return {};

  const start = startDate ? parseNairobiDateOnly(startDate) : undefined;
  const end = endDate ? parseNairobiDateOnly(endDate, true) : undefined;
  if (start && end && start.getTime() > end.getTime()) {
    throw new Error("Start date must be on or before end date");
  }

  return { startDate: start, endDate: end };
}
