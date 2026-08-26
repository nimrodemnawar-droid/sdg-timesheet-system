export interface AttendanceSummaryRecord {
  checkInTime?: Date | string | number | null;
  checkOutTime?: Date | string | number | null;
}

export function countCompletedAttendanceDays(records: AttendanceSummaryRecord[]): number {
  return new Set(
    records
      .filter((record) => record.checkInTime && record.checkOutTime)
      .map((record) => new Date(record.checkInTime as Date | string | number).toISOString().slice(0, 10)),
  ).size;
}
