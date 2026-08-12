import { describe, expect, it } from "vitest";
import { getMonthlyReportMode } from "../shared/monthlyReportRole";

describe("Monthly Reports role separation", () => {
  it("assigns the admin control-center mode only to admin users", () => {
    expect(getMonthlyReportMode("admin")).toBe("admin");
    expect(getMonthlyReportMode("user")).toBe("staff");
    expect(getMonthlyReportMode(null)).toBe("staff");
    expect(getMonthlyReportMode(undefined)).toBe("staff");
  });

  it("does not expose admin mode to unknown or inactive role values", () => {
    expect(getMonthlyReportMode("supervisor")).toBe("staff");
    expect(getMonthlyReportMode("")).toBe("staff");
  });
});
