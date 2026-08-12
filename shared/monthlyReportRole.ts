export type MonthlyReportMode = "admin" | "staff";

export function getMonthlyReportMode(role?: string | null, requestedMode: MonthlyReportMode = "staff"): MonthlyReportMode {
  return requestedMode === "admin" && role === "admin" ? "admin" : "staff";
}
