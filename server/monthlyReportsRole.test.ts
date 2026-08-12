import { describe, expect, it } from "vitest";
import { getMonthlyReportMode } from "../shared/monthlyReportRole";

describe("Monthly Reports role separation", () => {
  it("allows the admin control-center mode only for admin users with an admin request", () => {
    expect(getMonthlyReportMode("admin", "admin")).toBe("admin");
    expect(getMonthlyReportMode("user", "admin")).toBe("staff");
    expect(getMonthlyReportMode("supervisor", "admin")).toBe("staff");
  });

  it("defaults every route and unknown role to the staff experience", () => {
    expect(getMonthlyReportMode("admin")).toBe("staff");
    expect(getMonthlyReportMode(null, "admin")).toBe("staff");
    expect(getMonthlyReportMode(undefined, "admin")).toBe("staff");
    expect(getMonthlyReportMode("user", "staff")).toBe("staff");
  });
});
