import { describe, expect, it } from "vitest";
import { getLeaveBalanceKey, getLeaveRequestKey } from "../shared/leaveBalanceKeys";

describe("LeaveBalanceDashboard list keys", () => {
  it("uses the persistent balance ID when available", () => {
    expect(getLeaveBalanceKey({ id: 42, leaveType: "annual", year: 2026 }, 0)).toBe("leave-balance-42");
  });

  it("creates a deterministic fallback balance key when ID is missing", () => {
    expect(getLeaveBalanceKey({ leaveType: "sick", year: 2026 }, 1)).toBe("leave-balance-sick-2026-1");
  });

  it("uses the persistent request ID when available", () => {
    expect(getLeaveRequestKey({ id: 7, leaveType: "annual" }, 0)).toBe("leave-request-7");
  });

  it("creates a deterministic fallback request key when ID is missing", () => {
    expect(getLeaveRequestKey({ leaveType: "annual", startDate: "2026-08-12", endDate: "2026-08-14" }, 2)).toBe(
      "leave-request-annual-2026-08-12-2026-08-14-2",
    );
  });
});
