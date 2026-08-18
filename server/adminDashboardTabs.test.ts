import { describe, expect, it } from "vitest";
import { ADMIN_DASHBOARD_VISIBLE_TABS, ADMIN_TAB_VALUES, DEFAULT_ADMIN_TAB, resolveAdminDashboardTab } from "../shared/adminDashboardTabs";

describe("Admin Dashboard tab navigation", () => {
  it("removes duplicate Overview, Overtime, and Scheduling entries", () => {
    expect(ADMIN_DASHBOARD_VISIBLE_TABS).not.toContain("overview");
    expect(ADMIN_DASHBOARD_VISIBLE_TABS).not.toContain("overtime");
    expect(ADMIN_DASHBOARD_VISIBLE_TABS).not.toContain("scheduling");
    expect(ADMIN_TAB_VALUES.has("staff")).toBe(true);
    expect(ADMIN_TAB_VALUES.has("monthly-reports")).toBe(true);
    expect(ADMIN_TAB_VALUES.has("data-management")).toBe(true);
  });

  it("falls back to Staff when a removed or unknown tab is requested", () => {
    expect(DEFAULT_ADMIN_TAB).toBe("staff");
    expect(resolveAdminDashboardTab("overview")).toBe("staff");
    expect(resolveAdminDashboardTab("overtime")).toBe("staff");
    expect(resolveAdminDashboardTab("scheduling")).toBe("staff");
    expect(resolveAdminDashboardTab("staff")).toBe("staff");
  });
});
