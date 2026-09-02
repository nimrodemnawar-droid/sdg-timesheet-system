export function isTimesheetSubmittedForAttendance(
  attendance: { id?: number | string | null; isSubmitted?: boolean | null } | null | undefined,
  submittedAttendanceId: number | null | undefined,
): boolean {
  if (!attendance?.id) return false;
  return Boolean(attendance.isSubmitted) || submittedAttendanceId === Number(attendance.id);
}
