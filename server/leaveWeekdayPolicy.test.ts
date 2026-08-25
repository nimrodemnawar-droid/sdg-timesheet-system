import { describe, expect, it } from "vitest";
import {
  ANNUAL_LEAVE_ENTITLEMENT_DAYS,
  countKenyaWorkingDays,
  countWorkingDays,
} from "../shared/leave";

describe("weekday-only leave policy", () => {
  it("uses 21 days for annual leave", () => {
    expect(ANNUAL_LEAVE_ENTITLEMENT_DAYS).toBe(21);
  });

  it("excludes Saturday and Sunday from an inclusive request", () => {
    expect(countWorkingDays(new Date(2026, 7, 21), new Date(2026, 7, 24))).toBe(2);
  });

  it("excludes configured public holidays from the count", () => {
    expect(countWorkingDays(new Date(2026, 4, 1), new Date(2026, 4, 4), ["2026-05-01"])).toBe(1);
  });

  it("excludes Good Friday and Easter Monday in Kenya", () => {
    expect(countKenyaWorkingDays(new Date(2026, 3, 3), new Date(2026, 3, 6))).toBe(0);
  });
});
