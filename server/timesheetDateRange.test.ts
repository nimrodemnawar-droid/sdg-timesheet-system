import { describe, expect, it } from "vitest";
import { getInclusiveNairobiDateRange, parseNairobiDateOnly } from "../shared/timesheetDateRange";

describe("timesheet date range handling", () => {
  it("starts at Nairobi midnight", () => {
    expect(parseNairobiDateOnly("2026-10-09").toISOString()).toBe("2026-10-08T21:00:00.000Z");
  });

  it("includes the complete Nairobi end date", () => {
    const range = getInclusiveNairobiDateRange("2026-10-09", "2026-10-09");
    expect(range.startDate?.toISOString()).toBe("2026-10-08T21:00:00.000Z");
    expect(range.endDate?.toISOString()).toBe("2026-10-09T20:59:59.999Z");
  });

  it("rejects a reversed date range", () => {
    expect(() => getInclusiveNairobiDateRange("2026-10-10", "2026-10-09")).toThrow(
      "Start date must be on or before end date",
    );
  });

  it("rejects impossible calendar dates", () => {
    expect(() => parseNairobiDateOnly("2026-02-30")).toThrow("Invalid calendar date");
  });
});
