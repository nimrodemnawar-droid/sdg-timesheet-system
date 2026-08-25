import { describe, expect, it } from "vitest";
import { formatCoordinates } from "../shared/location";

describe("Admin detailed timesheet GPS coordinates", () => {
  it("formats valid numeric and string coordinates to six decimals", () => {
    expect(formatCoordinates(-1.286389, 36.817223)).toBe("-1.286389, 36.817223");
    expect(formatCoordinates("-1.286389", "36.817223")).toBe("-1.286389, 36.817223");
  });

  it("uses a safe fallback when a location is unavailable or malformed", () => {
    expect(formatCoordinates(null, 36.817223)).toBe("N/A");
    expect(formatCoordinates(-1.286389, undefined)).toBe("N/A");
    expect(formatCoordinates("not-a-latitude", "36.817223")).toBe("N/A");
  });
});

export {};
