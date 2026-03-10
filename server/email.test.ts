import { describe, it, expect } from "vitest";
import {
  generateLeaveApprovalEmail,
  generateLeaveRejectionEmail,
  generateOvertimeAlertEmail,
  generateTimesheetReminderEmail,
  generateLeaveBalanceEmail,
} from "./email";

describe("Email Templates", () => {
  describe("generateLeaveApprovalEmail", () => {
    it("should generate approval email with correct subject and content", () => {
      const email = generateLeaveApprovalEmail(
        "John Doe",
        "annual",
        new Date("2026-03-15"),
        new Date("2026-03-20"),
        "Approved - enjoy your leave"
      );

      expect(email.subject).toContain("approved");
      expect(email.html).toContain("John Doe");
      expect(email.html).toContain("annual");
      expect(email.html).toContain("Approved - enjoy your leave");
      expect(email.html).toContain("#10b981"); // Green color for approval
    });

    it("should format dates correctly in approval email", () => {
      const email = generateLeaveApprovalEmail(
        "Jane Smith",
        "sick",
        new Date("2026-04-01"),
        new Date("2026-04-03"),
        "Approved"
      );

      expect(email.html).toContain("April");
    });
  });

  describe("generateLeaveRejectionEmail", () => {
    it("should generate rejection email with correct subject and content", () => {
      const email = generateLeaveRejectionEmail(
        "John Doe",
        "annual",
        new Date("2026-03-15"),
        new Date("2026-03-20"),
        "Insufficient coverage during this period"
      );

      expect(email.subject).toContain("rejected");
      expect(email.html).toContain("John Doe");
      expect(email.html).toContain("annual");
      expect(email.html).toContain("Insufficient coverage during this period");
      expect(email.html).toContain("#ef4444"); // Red color for rejection
    });
  });

  describe("generateOvertimeAlertEmail", () => {
    it("should generate overtime alert with correct details", () => {
      const email = generateOvertimeAlertEmail(
        "John Doe",
        2.5,
        new Date("2026-03-10")
      );

      expect(email.subject).toContain("Overtime Alert");
      expect(email.subject).toContain("John Doe");
      expect(email.subject).toContain("2.5h");
      expect(email.html).toContain("John Doe");
      expect(email.html).toContain("2.5");
      expect(email.html).toContain("#f59e0b"); // Orange color for alert
    });
  });

  describe("generateTimesheetReminderEmail", () => {
    it("should generate reminder email with action items", () => {
      const email = generateTimesheetReminderEmail("John Doe");

      expect(email.subject).toContain("Reminder");
      expect(email.subject).toContain("timesheet");
      expect(email.html).toContain("John Doe");
      expect(email.html).toContain("submit");
      expect(email.html).toContain("#3b82f6"); // Blue color for reminder
    });
  });

  describe("generateLeaveBalanceEmail", () => {
    it("should generate balance update email with correct numbers", () => {
      const email = generateLeaveBalanceEmail(
        "John Doe",
        "annual",
        20,
        5,
        15
      );

      expect(email.subject).toContain("balance");
      expect(email.subject).toContain("annual");
      expect(email.html).toContain("John Doe");
      expect(email.html).toContain("20"); // Allocated
      expect(email.html).toContain("5"); // Used
      expect(email.html).toContain("15"); // Remaining
      expect(email.html).toContain("#06b6d4"); // Cyan color for update
    });

    it("should highlight remaining days prominently", () => {
      const email = generateLeaveBalanceEmail(
        "Jane Smith",
        "sick",
        10,
        3,
        7
      );

      expect(email.html).toContain("7"); // Remaining days
      expect(email.html).toContain("#059669"); // Green highlight for remaining
    });
  });

  describe("Email HTML Structure", () => {
    it("should include proper HTML structure in all emails", () => {
      const emails = [
        generateLeaveApprovalEmail(
          "Test",
          "annual",
          new Date(),
          new Date(),
          "Test"
        ),
        generateLeaveRejectionEmail(
          "Test",
          "annual",
          new Date(),
          new Date(),
          "Test"
        ),
        generateOvertimeAlertEmail("Test", 2, new Date()),
        generateTimesheetReminderEmail("Test"),
        generateLeaveBalanceEmail("Test", "annual", 20, 5, 15),
      ];

      emails.forEach((email) => {
        expect(email.html).toContain("<div");
        expect(email.html).toContain("font-family");
        expect(email.html).toContain("SDG Timesheet System");
      });
    });

    it("should include footer with system name", () => {
      const email = generateLeaveApprovalEmail(
        "Test",
        "annual",
        new Date(),
        new Date(),
        "Test"
      );

      expect(email.html).toContain("SDG Timesheet System");
    });
  });
});
