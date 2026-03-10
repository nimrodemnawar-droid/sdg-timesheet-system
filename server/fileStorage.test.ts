import { describe, it, expect } from "vitest";
import {
  generateAttendanceReportCSV,
  generateLeaveReportCSV,
  generateStaffOverviewCSV,
  validateFileSize,
  validateFileType,
  ALLOWED_MIME_TYPES,
} from "./fileStorage";

describe("File Storage", () => {
  describe("CSV Report Generation", () => {
    describe("generateAttendanceReportCSV", () => {
      it("should generate valid CSV with headers", () => {
        const records = [
          {
            staffName: "John Doe",
            staffEmail: "john@example.com",
            checkInTime: new Date("2026-03-10T08:00:00"),
            checkOutTime: new Date("2026-03-10T17:00:00"),
            duration: "9h 0m",
            checkInLat: "1.35208333",
            checkInLng: "103.81983333",
            checkOutLat: "1.35209000",
            checkOutLng: "103.81984000",
            distanceTraveled: "0.12",
          },
        ];

        const csv = generateAttendanceReportCSV(records);

        expect(csv).toContain("Staff Name");
        expect(csv).toContain("Email");
        expect(csv).toContain("Check-In Time");
        expect(csv).toContain("Check-Out Time");
        expect(csv).toContain("Duration");
        expect(csv).toContain("John Doe");
        expect(csv).toContain("john@example.com");
        expect(csv).toContain("9h 0m");
      });

      it("should handle missing check-out time", () => {
        const records = [
          {
            staffName: "Jane Smith",
            staffEmail: "jane@example.com",
            checkInTime: new Date("2026-03-10T08:00:00"),
            checkOutTime: null,
            duration: "In Progress",
            checkInLat: "1.35208333",
            checkInLng: "103.81983333",
          },
        ];

        const csv = generateAttendanceReportCSV(records);

        expect(csv).toContain("Jane Smith");
        expect(csv).toContain("N/A"); // For missing check-out time
      });

      it("should escape commas in CSV fields", () => {
        const records = [
          {
            staffName: "Doe, John",
            staffEmail: "john@example.com",
            checkInTime: new Date("2026-03-10T08:00:00"),
            checkOutTime: new Date("2026-03-10T17:00:00"),
            duration: "9h 0m",
            checkInLat: "1.35208333",
            checkInLng: "103.81983333",
          },
        ];

        const csv = generateAttendanceReportCSV(records);

        expect(csv).toContain('"Doe, John"'); // Should be quoted
      });

      it("should include GPS coordinates with 8-decimal precision", () => {
        const records = [
          {
            staffName: "John Doe",
            staffEmail: "john@example.com",
            checkInTime: new Date("2026-03-10T08:00:00"),
            checkOutTime: new Date("2026-03-10T17:00:00"),
            duration: "9h 0m",
            checkInLat: "1.35208333",
            checkInLng: "103.81983333",
            checkOutLat: "1.35209000",
            checkOutLng: "103.81984000",
            distanceTraveled: "0.12",
          },
        ];

        const csv = generateAttendanceReportCSV(records);

        expect(csv).toContain("1.35208333");
        expect(csv).toContain("103.81983333");
        expect(csv).toContain("1.35209000");
        expect(csv).toContain("103.81984000");
      });
    });

    describe("generateLeaveReportCSV", () => {
      it("should generate valid leave report CSV", () => {
        const records = [
          {
            staffName: "John Doe",
            staffEmail: "john@example.com",
            leaveType: "annual",
            startDate: new Date("2026-03-15"),
            endDate: new Date("2026-03-20"),
            daysRequested: "5",
            status: "approved",
            approvalReason: "Approved - enjoy your leave",
          },
        ];

        const csv = generateLeaveReportCSV(records);

        expect(csv).toContain("Staff Name");
        expect(csv).toContain("Leave Type");
        expect(csv).toContain("Status");
        expect(csv).toContain("John Doe");
        expect(csv).toContain("annual");
        expect(csv).toContain("approved");
        expect(csv).toContain("5");
      });

      it("should handle missing approval reason", () => {
        const records = [
          {
            staffName: "Jane Smith",
            staffEmail: "jane@example.com",
            leaveType: "sick",
            startDate: new Date("2026-03-10"),
            endDate: new Date("2026-03-10"),
            daysRequested: "1",
            status: "pending",
          },
        ];

        const csv = generateLeaveReportCSV(records);

        expect(csv).toContain("Jane Smith");
        expect(csv).toContain("N/A"); // For missing approval reason
      });
    });

    describe("generateStaffOverviewCSV", () => {
      it("should generate valid staff overview CSV", () => {
        const records = [
          {
            name: "John Doe",
            email: "john@example.com",
            role: "user",
            loginMethod: "manus",
            createdAt: new Date("2026-01-01"),
            lastSignedIn: new Date("2026-03-10"),
          },
          {
            name: "Jane Smith",
            email: "jane@example.com",
            role: "admin",
            loginMethod: "manus",
            createdAt: new Date("2026-01-05"),
            lastSignedIn: new Date("2026-03-09"),
          },
        ];

        const csv = generateStaffOverviewCSV(records);

        expect(csv).toContain("Name");
        expect(csv).toContain("Email");
        expect(csv).toContain("Role");
        expect(csv).toContain("John Doe");
        expect(csv).toContain("jane@example.com");
        expect(csv).toContain("admin");
        expect(csv).toContain("user");
      });
    });
  });

  describe("File Validation", () => {
    describe("validateFileSize", () => {
      it("should accept files under 10MB", () => {
        const result = validateFileSize(5 * 1024 * 1024); // 5MB
        expect(result).toBe(true);
      });

      it("should reject files over 10MB", () => {
        const result = validateFileSize(15 * 1024 * 1024); // 15MB
        expect(result).toBe(false);
      });

      it("should accept files exactly at limit", () => {
        const result = validateFileSize(10 * 1024 * 1024); // 10MB
        expect(result).toBe(true);
      });

      it("should support custom size limits", () => {
        const result = validateFileSize(5 * 1024 * 1024, 3); // 5MB with 3MB limit
        expect(result).toBe(false);
      });
    });

    describe("validateFileType", () => {
      it("should accept allowed image types", () => {
        const result = validateFileType("image/jpeg", ALLOWED_MIME_TYPES.images);
        expect(result).toBe(true);
      });

      it("should reject disallowed file types", () => {
        const result = validateFileType("application/exe", ALLOWED_MIME_TYPES.images);
        expect(result).toBe(false);
      });

      it("should validate document types", () => {
        expect(validateFileType("application/pdf", ALLOWED_MIME_TYPES.documents)).toBe(true);
        expect(validateFileType("application/msword", ALLOWED_MIME_TYPES.documents)).toBe(true);
      });

      it("should validate spreadsheet types", () => {
        expect(validateFileType("text/csv", ALLOWED_MIME_TYPES.spreadsheets)).toBe(true);
        expect(validateFileType("application/vnd.ms-excel", ALLOWED_MIME_TYPES.spreadsheets)).toBe(true);
      });
    });
  });

  describe("MIME Type Constants", () => {
    it("should have image MIME types defined", () => {
      expect(ALLOWED_MIME_TYPES.images).toContain("image/jpeg");
      expect(ALLOWED_MIME_TYPES.images).toContain("image/png");
      expect(ALLOWED_MIME_TYPES.images).toContain("image/gif");
      expect(ALLOWED_MIME_TYPES.images).toContain("image/webp");
    });

    it("should have document MIME types defined", () => {
      expect(ALLOWED_MIME_TYPES.documents).toContain("application/pdf");
      expect(ALLOWED_MIME_TYPES.documents).toContain("application/msword");
    });

    it("should have spreadsheet MIME types defined", () => {
      expect(ALLOWED_MIME_TYPES.spreadsheets).toContain("text/csv");
      expect(ALLOWED_MIME_TYPES.spreadsheets).toContain("application/vnd.ms-excel");
    });
  });

  describe("CSV Escaping", () => {
    it("should properly escape quotes in CSV", () => {
      const records = [
        {
          staffName: 'John "The Boss" Doe',
          staffEmail: "john@example.com",
          checkInTime: new Date("2026-03-10T08:00:00"),
          checkOutTime: new Date("2026-03-10T17:00:00"),
          duration: "9h 0m",
          checkInLat: "1.35208333",
          checkInLng: "103.81983333",
        },
      ];

      const csv = generateAttendanceReportCSV(records);

      expect(csv).toContain('"John ""The Boss"" Doe"');
    });

    it("should handle multiple special characters", () => {
      const records = [
        {
          staffName: 'Smith, "Jane" & Co.',
          staffEmail: "jane@example.com",
          checkInTime: new Date("2026-03-10T08:00:00"),
          checkOutTime: new Date("2026-03-10T17:00:00"),
          duration: "9h 0m",
          checkInLat: "1.35208333",
          checkInLng: "103.81983333",
        },
      ];

      const csv = generateAttendanceReportCSV(records);

      expect(csv).toContain('"Smith, ""Jane"" & Co."');
    });
  });
});
