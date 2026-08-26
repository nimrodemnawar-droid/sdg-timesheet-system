import { describe, expect, it } from "vitest";
import { countCompletedAttendanceDays } from "../shared/attendanceSummary";

describe("Staff dashboard refinements", () => {
  it("counts each completed attendance date once and ignores open attendance", () => {
    expect(countCompletedAttendanceDays([
      { checkInTime: "2026-08-01T06:00:00.000Z", checkOutTime: "2026-08-01T14:00:00.000Z" },
      { checkInTime: "2026-08-01T15:00:00.000Z", checkOutTime: "2026-08-01T16:00:00.000Z" },
      { checkInTime: "2026-08-02T06:00:00.000Z", checkOutTime: null },
      { checkInTime: "2026-08-03T06:00:00.000Z", checkOutTime: "2026-08-03T14:00:00.000Z" },
    ])).toBe(2);
  });

  it("counts no days when all attendance records are incomplete", () => {
    expect(countCompletedAttendanceDays([{ checkInTime: "2026-08-01T06:00:00.000Z" }, {}])).toBe(0);
  });
});
