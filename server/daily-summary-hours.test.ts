import { describe, expect, it } from "vitest";
import { calculateDailySummaryHours } from "./db";

describe("daily scheduled summary hours", () => {
  it("uses persisted checkout duration for structured timesheets without AM/PM fields", () => {
    expect(calculateDailySummaryHours([
      { durationMinutes: 510 },
      { durationMinutes: 450 },
    ])).toBe(16);
  });

  it("retains legacy AM/PM session calculations when those fields exist", () => {
    expect(calculateDailySummaryHours([
      {
        amStartTime: new Date("2026-08-25T08:00:00Z"),
        amEndTime: new Date("2026-08-25T12:00:00Z"),
        pmStartTime: new Date("2026-08-25T13:00:00Z"),
        pmEndTime: new Date("2026-08-25T17:00:00Z"),
        durationMinutes: 999,
      },
    ])).toBe(8);
  });

  it("returns a rounded total for mixed legacy and structured records", () => {
    expect(calculateDailySummaryHours([
      {
        amStartTime: new Date("2026-08-25T08:00:00Z"),
        amEndTime: new Date("2026-08-25T11:30:00Z"),
      },
      { durationMinutes: 125 },
    ])).toBe(5.58);
  });
});

export {};
