import { describe, expect, it } from "vitest";
import { generateCSVContent, generateExcelContent, type TimesheetExportData } from "./db";

const structuredSubmission: TimesheetExportData = {
  staffNumber: 7,
  staffName: "Amina Otieno",
  staffEmail: "amina@example.org",
  date: "2026-08-24",
  checkInTime: "08:00 AM",
  checkOutTime: "05:00 PM",
  checkInCoordinates: "-1.286389, 36.817223",
  checkInAddress: "Nairobi Office",
  checkOutCoordinates: "-1.286400, 36.817240",
  checkOutAddress: "Nairobi Office",
  hoursWorked: 8.5,
  overtimeHours: 0.5,
  distanceTraveled: "1200m",
  workModality: "nairobi_office",
  activityCategory: "Coordination",
  sdgGoal: "N/A",
  kpi: "Global coaching sessions",
  taskDescription: "Coordinate Global Coaches",
  structuredTasks:
    "Task 1 (Training): Coordinate Global Coaches [3_hours]; Challenges: Calendar conflicts; Countries: Kenya (12), Uganda (8)\nTask 2 (Follow Up): Prepare follow-up brief [2_hours]; Countries: Tanzania (5)",
  staffRemarks: "Follow-up scheduled",
  amStartTime: "N/A",
  amEndTime: "N/A",
  pmStartTime: "N/A",
  pmEndTime: "N/A",
  program: "Coaching",
  evidenceUploadKey: "N/A",
  isSubmitted: true,
  submittedAt: "8/24/2026, 5:10:00 PM",
};

describe("structured timesheet export fidelity", () => {
  it("keeps every submitted task, challenge, country, and participant count in CSV output", () => {
    const csv = generateCSVContent([structuredSubmission]);

    expect(csv).toContain("Structured Tasks");
    expect(csv).toContain("Task 1 (Training): Coordinate Global Coaches [3_hours]");
    expect(csv).toContain("Training");
    expect(csv).toContain("Challenges: Calendar conflicts");
    expect(csv).toContain("Kenya (12)");
    expect(csv).toContain("Uganda (8)");
    expect(csv).toContain("Task 2 (Follow Up): Prepare follow-up brief [2_hours]");
    expect(csv).toContain("Tanzania (5)");
  });

  it("keeps the same structured-task details in Excel-compatible output", () => {
    const excel = generateExcelContent([structuredSubmission]);

    expect(excel).toContain("<th>Structured Tasks</th>");
    expect(excel).toContain("Task 1 (Training): Coordinate Global Coaches [3_hours]");
    expect(excel).toContain("Follow Up");
    expect(excel).toContain("Challenges: Calendar conflicts");
    expect(excel).toContain("Kenya (12)");
    expect(excel).toContain("Task 2 (Follow Up): Prepare follow-up brief [2_hours]");
    expect(excel).toContain("Tanzania (5)");
  });

  it("does not lose the submitted record when structured tasks are absent for legacy rows", () => {
    const legacyRow = { ...structuredSubmission, structuredTasks: undefined };
    const csv = generateCSVContent([legacyRow]);

    expect(csv).toContain("Amina Otieno");
    expect(csv).toContain("Coordination");
    expect(csv).toContain("Structured Tasks");
  });
});

export {};
