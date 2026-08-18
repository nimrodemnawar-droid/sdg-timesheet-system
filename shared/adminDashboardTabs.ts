export const ADMIN_DASHBOARD_VISIBLE_TABS = [
  "staff",
  "leave",
  "attendance",
  "reports",
  "export",
  "gpsmap",
  "timesheet",
  "admin-management",
  "monthly-reports",
  "data-management",
] as const;

export const ADMIN_TAB_VALUES = new Set<string>(ADMIN_DASHBOARD_VISIBLE_TABS);
export const DEFAULT_ADMIN_TAB = "staff";

export function resolveAdminDashboardTab(tab: string | null | undefined): string {
  return tab && ADMIN_TAB_VALUES.has(tab) ? tab : DEFAULT_ADMIN_TAB;
}
