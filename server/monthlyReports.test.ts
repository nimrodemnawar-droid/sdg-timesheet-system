import { describe, expect, it } from "vitest";
import { filterMonthlyReports, generateMonthlyReportCSV, generateMonthlyReportPDF } from "./db";

describe("Monthly Reports Admin Features", () => {
  const sampleReport = {
    staffName: "Amina Staff",
    staffNumber: 12,
    staffEmail: "amina@example.com",
    reportingMonth: new Date("2026-08-01T00:00:00.000Z"),
    keyActivities: "Completed field visits",
    challenges: "Transport delays",
    solutions: "Adjusted the field schedule",
    plannedActivities: "Prepare September work plan",
    supportRequired: "Vehicle scheduling support",
    additionalComments: "No additional comments",
    submissionStatus: "locked",
    reviewStatus: "approved",
    submittedAt: new Date("2026-08-28T10:00:00.000Z"),
    reviewedAt: new Date("2026-08-30T10:00:00.000Z"),
    supervisorComments: "Approved after review",
  };

  it("generates a CSV with staff, month, and approval fields", async () => {
    const csv = await generateMonthlyReportCSV([sampleReport]);

    expect(csv).toContain("Staff Name,Staff Number,Email,Reporting Month");
    expect(csv).toContain("Amina Staff");
    expect(csv).toContain("approved");
    expect(csv).toContain("locked");
    expect(csv.split("\n")).toHaveLength(2);
  });

  it("escapes commas and quotes in report text for CSV export", async () => {
    const csv = await generateMonthlyReportCSV([
      { ...sampleReport, keyActivities: 'Visits, meetings, and "briefings"' },
    ]);

    expect(csv).toContain('"Visits, meetings, and ""briefings"""');
  });

  it("returns a downloadable Buffer for PDF export", async () => {
    const pdf = await generateMonthlyReportPDF([sampleReport]);

    expect(Buffer.isBuffer(pdf)).toBe(true);
    expect(pdf.length).toBeGreaterThan(0);
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
  });

  it("filters reports by staff search, month range, and review status", () => {
    const reports = [
      { ...sampleReport, id: 1, reportingMonth: new Date("2026-08-01"), user: { name: "Amina Staff", email: "amina@example.com" } },
      { ...sampleReport, id: 2, reportingMonth: new Date("2026-09-01"), reviewStatus: "pending_review", user: { name: "Brian Staff", email: "brian@example.com" } },
      { ...sampleReport, id: 3, reportingMonth: new Date("2026-08-01"), reviewStatus: "rejected", user: { name: "Caroline Staff", email: "caroline@example.com" } },
    ];

    const filtered = filterMonthlyReports(reports, {
      searchTerm: "amina",
      startMonth: "2026-08-01",
      endMonth: "2026-08-31",
      reviewStatus: "approved",
    });

    expect(filtered.map(report => report.id)).toEqual([1]);
  });

  it("supports submission status filtering and returns all reports by default", () => {
    const reports = [
      { ...sampleReport, id: 1, submissionStatus: "locked" },
      { ...sampleReport, id: 2, submissionStatus: "submitted" },
    ];

    expect(filterMonthlyReports(reports)).toHaveLength(2);
    expect(filterMonthlyReports(reports, { submissionStatus: "submitted" }).map(report => report.id)).toEqual([2]);
  });
});
