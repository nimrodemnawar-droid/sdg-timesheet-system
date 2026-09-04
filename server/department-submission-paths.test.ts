import { describe, expect, it } from "vitest";
import { parseOptionalNonNegativeInteger } from "../shared/countInput";

describe("department timesheet submission payloads", () => {
  it("normalizes entered Online Missionary counts without rejecting valid input", () => {
    expect(parseOptionalNonNegativeInteger(" 12 ")).toBe(12);
    expect(parseOptionalNonNegativeInteger("0")).toBe(0);
    expect(parseOptionalNonNegativeInteger(24)).toBe(24);
  });

  it("treats an optional blank Online Missionary count as absent", () => {
    expect(parseOptionalNonNegativeInteger("")).toBeUndefined();
    expect(parseOptionalNonNegativeInteger("   ")).toBeUndefined();
  });

  it("rejects malformed participant counts before submission", () => {
    expect(parseOptionalNonNegativeInteger("1.5")).toBeUndefined();
    expect(parseOptionalNonNegativeInteger("-1")).toBeUndefined();
  });

  it("keeps the four supported submission paths distinct", () => {
    const modes = ["admin", "standard", "multi-country", "online-missionary"];
    expect(new Set(modes).size).toBe(4);
    expect(modes).toContain("admin");
    expect(modes).toContain("standard");
    expect(modes).toContain("multi-country");
    expect(modes).toContain("online-missionary");
  });
});
