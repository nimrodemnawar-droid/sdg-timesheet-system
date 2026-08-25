import { describe, expect, it } from "vitest";
import { generateCSVContent } from "./db";

describe("Check-in to timesheet export workflow", () => {
  it("keeps check-in location, organisation context, and every structured task in the exported row", () => {
    const submittedRecord = {
      staffNumber: 7,
      staffName: "Amina Staff",
      staffEmail: "amina@example.org",
      date: "2026-08-25",
      checkInTime: "08:30 AM",
      checkOutTime: "05:00 PM",
      checkInCoordinates: "-1.286389, 36.817223",
      checkInAddress: "Nairobi Office",
      checkOutCoordinates: "-1.280000, 36.820000",
      checkOutAddress: "Nairobi Office",
      workModality: "nairobi_office",
      organization: "ICY Africa",
      departmentFunction: "Programme",
      programProject: "Community Coaching",
      activityCategory: "Meeting",
      structuredTasks: [
        "Task 1: Meeting | 2 hours | Partner planning meeting | Target: County coaches | Platform: Zoom | Output: Agreed action plan | Reached: 12 | Outcome: Roles confirmed | Follow-up: Yes | Evidence: Report | Status: Completed",
        "Task 2: Mobilisation | 3 hours | School outreach | Target: School leaders | Platform: School | Output: Outreach register | Reached: 48 | Outcome: New schools engaged | Follow-up: No | Evidence: Registration List | Status: Ongoing",
      ].join(" || "),
      hoursWorked: 8.5,
      overtimeHours: 0.5,
      isSubmitted: true,
    };

    const csv = generateCSVContent([submittedRecord]);
    const lines = csv.split("\n");

    expect(lines).toHaveLength(2);
    expect(csv).toContain("ICY Africa");
    expect(csv).toContain("Programme");
    expect(csv).toContain("Community Coaching");
    expect(csv).toContain("Nairobi Office");
    expect(csv).toContain("Task 1: Meeting");
    expect(csv).toContain("Task 2: Mobilisation");
    expect(csv).toContain("Status: Ongoing");
    expect(csv).toContain("48");
  });
});
