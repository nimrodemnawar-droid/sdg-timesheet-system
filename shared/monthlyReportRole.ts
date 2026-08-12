export type MonthlyReportMode = "admin" | "staff";

export function getMonthlyReportMode(role?: string | null): MonthlyReportMode {
  return role === "admin" ? "admin" : "staff";
}
