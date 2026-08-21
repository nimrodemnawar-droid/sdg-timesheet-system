import { describe, expect, it } from "vitest";
import { toLeaveReportRows } from "../shared/leaveReport";

describe("Leave report mapping", () => {
  it("uses staff name first, email fallback, actual requested days, and real status", () => {
    const rows = toLeaveReportRows([
      {
        userId: 12,
        staffName: "  Amina Otieno  ",
        staffEmail: "amina@example.com",
        leaveType: "annual",
        startDate: "2026-09-02T00:00:00.000Z",
        endDate: "2026-09-04T00:00:00.000Z",
        daysRequested: "3.5",
        status: "approved",
      },
      {
        userId: 13,
        staffName: "",
        staffEmail: "brian@example.com",
        leaveType: "sick",
        startDate: "2026-10-10T00:00:00.000Z",
        endDate: "2026-10-10T00:00:00.000Z",
        daysRequested: 1,
        status: "pending",
      },
    ]);

    expect(rows).toEqual([
      {
        staffId: 12,
        name: "Amina Otieno",
        leaveType: "annual",
        startDate: "2026-09-02",
        endDate: "2026-09-04",
        days: 3.5,
        status: "approved",
      },
      {
        staffId: 13,
        name: "brian@example.com",
        leaveType: "sick",
        startDate: "2026-10-10",
        endDate: "2026-10-10",
        days: 1,
        status: "pending",
      },
    ]);
  });
});
