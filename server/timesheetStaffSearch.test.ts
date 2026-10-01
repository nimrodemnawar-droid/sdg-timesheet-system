import { describe, expect, it } from "vitest";
import {
  buildCompleteTimesheetQuery,
  filterTimesheetRecords,
  findMatchingStaff,
} from "../shared/timesheetStaffSearch";

describe("Admin staff-centric timesheet search", () => {
  const staff = [
    { id: 7, name: "Amina Otieno", email: "amina@example.org", staffNumber: 7 },
    { id: 8, name: "Brian Kato", email: "brian@example.org", staffNumber: 8 },
  ];

  it("matches staff by name, number, or email", () => {
    expect(findMatchingStaff(staff, "amina").map((entry) => entry.id)).toEqual([7]);
    expect(findMatchingStaff(staff, "8").map((entry) => entry.id)).toEqual([8]);
    expect(findMatchingStaff(staff, "brian@example.org").map((entry) => entry.id)).toEqual([8]);
  });

  it("requests all history after a staff member is selected", () => {
    expect(buildCompleteTimesheetQuery("2026-09-01", "2026-09-30", 7)).toEqual({
      startDate: "2026-09-01",
      endDate: "2026-09-30",
      staffId: 7,
      allHistory: true,
    });
  });

  it("keeps every matching attendance record for the selected staff member", () => {
    const records = [
      { id: 1, userId: 7, staffName: "Amina Otieno", staffNumber: 7, staffEmail: "amina@example.org" },
      { id: 2, userId: 7, staffName: "Amina Otieno", staffNumber: 7, staffEmail: "amina@example.org" },
      { id: 3, userId: 8, staffName: "Brian Kato", staffNumber: 8, staffEmail: "brian@example.org" },
    ];

    expect(filterTimesheetRecords(records, "Amina Otieno", 7).map((record) => record.id)).toEqual([1, 2]);
    expect(filterTimesheetRecords(records, "brian@example.org").map((record) => record.id)).toEqual([3]);
  });
});
