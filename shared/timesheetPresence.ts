export interface TimesheetPresenceRecord {
  date?: string | null;
  checkInTime?: string | Date | null;
  checkOutTime?: string | Date | null;
  isSubmitted?: boolean | string | number | null;
  userId?: number | string | null;
  staffNumber?: number | string | null;
}

export interface TimesheetPresenceSummary {
  presentDays: number;
  incompleteDays: number;
  totalDays: number;
  presentDates: string[];
  incompleteDates: string[];
}

function isSubmitted(value: TimesheetPresenceRecord["isSubmitted"]): boolean {
  return value === true || value === 1 || value === "true" || value === "1";
}

function getDateKey(record: TimesheetPresenceRecord): string {
  if (record.date && /^\d{4}-\d{2}-\d{2}$/.test(record.date)) return record.date;
  if (!record.checkInTime) return "unknown";
  const date = new Date(record.checkInTime);
  if (Number.isNaN(date.getTime())) return "unknown";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Nairobi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function getStaffKey(record: TimesheetPresenceRecord): string {
  return String(record.userId ?? record.staffNumber ?? "unknown");
}

/** Counts unique staff-days that have check-in, check-out, and submitted timesheet data. */
export function summarizeTimesheetPresence(records: TimesheetPresenceRecord[]): TimesheetPresenceSummary {
  const dayStates = new Map<string, { complete: boolean }>();

  for (const record of records) {
    const dateKey = getDateKey(record);
    if (dateKey === "unknown") continue;
    const key = `${getStaffKey(record)}|${dateKey}`;
    const complete = Boolean(record.checkInTime && record.checkOutTime && isSubmitted(record.isSubmitted));
    const existing = dayStates.get(key);
    dayStates.set(key, { complete: Boolean(existing?.complete || complete) });
  }

  const presentDates = Array.from(dayStates.entries())
    .filter(([, state]) => state.complete)
    .map(([key]) => key.split("|").slice(1).join("|"))
    .sort();
  const incompleteDates = Array.from(dayStates.entries())
    .filter(([, state]) => !state.complete)
    .map(([key]) => key.split("|").slice(1).join("|"))
    .sort();

  return {
    presentDays: presentDates.length,
    incompleteDays: incompleteDates.length,
    totalDays: dayStates.size,
    presentDates,
    incompleteDates,
  };
}
