import { describe, expect, it } from "vitest";
import { getNavigationItems } from "../shared/navigation";

describe("Top navigation", () => {
  it("removes duplicate operational links for staff", () => {
    const hrefs = getNavigationItems("user").map((item) => item.href);
    expect(hrefs).toEqual(["/dashboard", "/leave-balance", "/monthly-reports"]);
    expect(hrefs).not.toContain("/leave");
    expect(hrefs).not.toContain("/waypoint-history");
    expect(hrefs).not.toContain("/supervisor");
    expect(hrefs).not.toContain("/map");
  });

  it("keeps admin-only destinations without restoring duplicate operational links", () => {
    const hrefs = getNavigationItems("admin").map((item) => item.href);
    expect(hrefs).toContain("/admin");
    expect(hrefs).toContain("/analytics");
    expect(hrefs).toContain("/executive");
    expect(hrefs).not.toContain("/leave");
    expect(hrefs).not.toContain("/waypoint-history");
    expect(hrefs).not.toContain("/supervisor");
    expect(hrefs).not.toContain("/map");
  });
});
