import { describe, expect, it } from "vitest";
import {
  ANNUAL_LEAVE_ENTITLEMENT_DAYS,
  countWorkingDays,
  countKenyaWorkingDays,
  getKenyaPublicHolidayDates,
} from "./leave";

describe("leave working-day policy", () => {
  it("uses a 21 working-day annual entitlement", () => {
    expect(ANNUAL_LEAVE_ENTITLEMENT_DAYS).toBe(21);
  });

  it("excludes weekends from an inclusive date range", () => {
    expect(countWorkingDays(new Date(2026, 7, 21), new Date(2026, 7, 24))).toBe(2);
  });

  it("excludes configured public holidays from weekdays", () => {
    expect(countWorkingDays(new Date(2026, 4, 1), new Date(2026, 4, 4), ["2026-05-01"])).toBe(1);
  });

  it("includes the Kenya fixed and Easter holiday dates", () => {
    const holidays = getKenyaPublicHolidayDates(2026);
    expect(holidays).toContain("2026-01-01");
    expect(holidays).toContain("2026-04-03");
    expect(countKenyaWorkingDays(new Date(2026, 3, 3), new Date(2026, 3, 6))).toBe(0);
  });
});
