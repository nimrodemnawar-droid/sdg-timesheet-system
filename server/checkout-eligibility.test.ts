import { describe, expect, it } from "vitest";
import { isTimesheetSubmittedForAttendance } from "../shared/checkoutEligibility";

describe("checkout eligibility after timesheet submission", () => {
  it("allows checkout immediately when the saved attendance query is still stale", () => {
    expect(isTimesheetSubmittedForAttendance({ id: 42, isSubmitted: false }, 42)).toBe(true);
  });

  it("allows checkout when the refreshed attendance record is submitted", () => {
    expect(isTimesheetSubmittedForAttendance({ id: 42, isSubmitted: true }, null)).toBe(true);
  });

  it("does not allow checkout for a different or missing attendance record", () => {
    expect(isTimesheetSubmittedForAttendance({ id: 42, isSubmitted: false }, 41)).toBe(false);
    expect(isTimesheetSubmittedForAttendance(undefined, 42)).toBe(false);
  });
});
