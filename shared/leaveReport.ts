export type LeaveReportRequest = {
  userId?: number | null;
  staffName?: string | null;
  staffEmail?: string | null;
  leaveType?: string | null;
  startDate: Date | string;
  endDate: Date | string;
  daysRequested?: number | string | null;
  status?: string | null;
};

export type LeaveReportRow = {
  staffId: number;
  name: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  days: number;
  status: string;
};

function formatReportDate(value: Date | string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "N/A" : date.toISOString().split("T")[0];
}

export function toLeaveReportRows(requests: LeaveReportRequest[]): LeaveReportRow[] {
  return requests.map((request) => ({
    staffId: request.userId ?? 0,
    name: request.staffName?.trim() || request.staffEmail?.trim() || `Staff ${request.userId ?? "Unknown"}`,
    leaveType: request.leaveType || "N/A",
    startDate: formatReportDate(request.startDate),
    endDate: formatReportDate(request.endDate),
    days: Number(request.daysRequested ?? 0),
    status: request.status || "pending",
  }));
}
