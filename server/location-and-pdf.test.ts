import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { generateTimesheetPDFContent } from "./db";
import { summarizeLocationPoints } from "../shared/locationAnalytics";

describe("location-aware reporting", () => {
  it("generates a readable PDF containing both GPS coordinates and addresses", async () => {
    const encoded = await generateTimesheetPDFContent([{
      staffNumber: 4,
      staffName: "Amina Otieno",
      staffEmail: "amina@example.com",
      date: "2026-08-25",
      checkInTime: "08:00 AM",
      checkOutTime: "05:00 PM",
      checkInCoordinates: "-1.286389, 36.817223",
      checkInAddress: "Nairobi Office",
      checkOutCoordinates: "-1.300000, 36.820000",
      checkOutAddress: "Westlands Field Site",
      hoursWorked: 8,
      overtimeHours: 0,
      distanceTraveled: "3.20 km",
      workModality: "field",
      organization: "africa_for_sdgs",
      departmentFunction: "programme",
      programProject: "Health Initiative",
      activityCategory: "Meeting",
      sdgGoal: "",
      kpi: "",
      taskDescription: "",
      structuredTasks: "Task 1 [3_hours]: Partner meeting",
      staffRemarks: "Completed",
      amStartTime: "",
      amEndTime: "",
      pmStartTime: "",
      pmEndTime: "",
      program: "Health Initiative",
      evidenceUploadKey: "",
      isSubmitted: true,
      submittedAt: "2026-08-25T14:00:00.000Z",
    }]);
    const bytes = Uint8Array.from(Buffer.from(encoded, "base64"));
    expect(bytes.slice(0, 5).toString()).toBe("37,80,68,70,45");
    const document = await PDFDocument.load(bytes);
    expect(document.getPageCount()).toBeGreaterThan(0);
  });

  it("aggregates real GPS points into normalized hotspot cells", () => {
    const summary = summarizeLocationPoints([
      { latitude: -1.28, longitude: 36.81, staffId: 1, accuracy: 10 },
      { latitude: -1.28, longitude: 36.81, staffId: 2, accuracy: 20 },
      { latitude: -1.30, longitude: 36.82, staffId: 1, accuracy: 30 },
      { latitude: null, longitude: 36.8, staffId: 3 },
    ]);
    expect(summary.validPoints).toBe(3);
    expect(summary.uniqueStaff).toBe(2);
    expect(summary.averageAccuracy).toBe(20);
    expect(summary.cells.reduce((total, cell) => total + cell.count, 0)).toBe(3);
    expect(Math.max(...summary.cells.map((cell) => cell.intensity))).toBe(1);
  });
});
