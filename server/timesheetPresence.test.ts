import { describe, expect, it } from "vitest";
import { summarizeTimesheetPresence } from "../shared/timesheetPresence";

describe("Timesheet presence summary", () => {
  it("counts a day as present only when check-in, check-out, and submission are complete", () => {
    const summary = summarizeTimesheetPresence([
      { userId: 7, date: "2026-10-01", checkInTime: "08:00", checkOutTime: "17:00", isSubmitted: true },
      { userId: 7, date: "2026-10-02", checkInTime: "08:00", checkOutTime: null, isSubmitted: true },
      { userId: 7, date: "2026-10-03", checkInTime: "08:00", checkOutTime: "17:00", isSubmitted: false },
    ]);

    expect(summary.presentDays).toBe(1);
    expect(summary.incompleteDays).toBe(2);
    expect(summary.totalDays).toBe(3);
    expect(summary.presentDates).toEqual(["2026-10-01"]);
    expect(summary.incompleteDates).toEqual(["2026-10-02", "2026-10-03"]);
  });

  it("counts duplicate task rows for one staff-day only once", () => {
    const summary = summarizeTimesheetPresence([
      { userId: 7, date: "2026-10-01", checkInTime: "08:00", checkOutTime: "17:00", isSubmitted: "true" },
      { userId: 7, date: "2026-10-01", checkInTime: "08:00", checkOutTime: "17:00", isSubmitted: 1 },
      { userId: 8, date: "2026-10-01", checkInTime: "08:00", checkOutTime: "17:00", isSubmitted: true },
    ]);

    expect(summary.presentDays).toBe(2);
    expect(summary.totalDays).toBe(2);
  });
});
