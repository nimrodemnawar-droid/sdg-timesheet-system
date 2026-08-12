type LeaveBalanceKeyInput = {
  id?: number | string | null;
  leaveType?: string | null;
  year?: number | string | null;
};

type LeaveRequestKeyInput = {
  id?: number | string | null;
  leaveType?: string | null;
  startDate?: string | Date | null;
  endDate?: string | Date | null;
};

export function getLeaveBalanceKey(balance: LeaveBalanceKeyInput, index: number): string {
  return `leave-balance-${balance.id ?? `${balance.leaveType ?? "unknown"}-${balance.year ?? "unknown"}-${index}`}`;
}

export function getLeaveRequestKey(request: LeaveRequestKeyInput, index: number): string {
  return `leave-request-${request.id ?? `${request.leaveType ?? "unknown"}-${request.startDate ?? "unknown"}-${request.endDate ?? "unknown"}-${index}`}`;
}
