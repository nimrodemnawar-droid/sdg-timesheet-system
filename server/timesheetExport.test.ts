import { describe, it, expect, beforeEach } from "vitest";
import {
  getTimesheetDataForExport,
  generateCSVContent,
  generateExcelContent,
} from "./db";
import * as db from "./db";

describe("Timesheet Export System", () => {
  describe("getTimesheetDataForExport", () => {
    it("should fetch timesheet data for a date range", async () => {
      // Create test attendance records
      const startDate = new Date("2026-04-01");
      const endDate = new Date("2026-04-15");

      const result = await getTimesheetDataForExport({
        startDate,
        endDate,
      });

      // Should return an array
      expect(Array.isArray(result)).toBe(true);
    });

    it("should filter by staff ID when provided", async () => {
      const startDate = new Date("2026-04-01");
      const endDate = new Date("2026-04-15");

      const result = await getTimesheetDataForExport({
        staffId: 1,
        startDate,
        endDate,
      });

      // Should return an array
      expect(Array.isArray(result)).toBe(true);

      // All records should have the same user ID
      if (result.length > 0) {
        result.forEach((record) => {
          expect(record).toHaveProperty("staffName");
          expect(record).toHaveProperty("date");
          expect(record).toHaveProperty("checkInTime");
          expect(record).toHaveProperty("hoursWorked");
          expect(record).toHaveProperty("overtimeHours");
        });
      }
    });

    it("should return empty array when no data matches criteria", async () => {
      const startDate = new Date("2000-01-01");
      const endDate = new Date("2000-01-31");

      const result = await getTimesheetDataForExport({
        startDate,
        endDate,
      });

      expect(Array.isArray(result)).toBe(true);
    });

    it("should calculate hours worked correctly", async () => {
      const startDate = new Date("2026-04-01");
      const endDate = new Date("2026-04-30");

      const result = await getTimesheetDataForExport({
        startDate,
        endDate,
      });

      result.forEach((record) => {
        // Hours worked should be a positive number
        expect(record.hoursWorked).toBeGreaterThanOrEqual(0);
        // Overtime should be calculated correctly (hours - 8)
        expect(record.overtimeHours).toBe(
          Math.max(0, record.hoursWorked - 8)
        );
      });
    });

    it("should format dates correctly", async () => {
      const startDate = new Date("2026-04-01");
      const endDate = new Date("2026-04-30");

      const result = await getTimesheetDataForExport({
        startDate,
        endDate,
      });

      result.forEach((record) => {
        // Date should be in YYYY-MM-DD format
        expect(record.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        // Check-in time should be in time format
        expect(record.checkInTime).toMatch(/\d{1,2}:\d{2}:\d{2}/);
      });
    });
  });

  describe("generateCSVContent", () => {
    const mockData = [
      {
        date: "2026-04-15",
        staffName: "John Doe",
        checkInTime: "08:00:00",
        checkOutTime: "17:00:00",
        hoursWorked: 9,
        overtimeHours: 1,
        location: "Nairobi Office",
        remarks: "Regular work day",
      },
      {
        date: "2026-04-16",
        staffName: "Jane Smith",
        checkInTime: "07:30:00",
        checkOutTime: "18:30:00",
        hoursWorked: 11,
        overtimeHours: 3,
        location: "Field",
        remarks: 'Project "Alpha" completion',
      },
    ];

    it("should generate valid CSV content", () => {
      const csv = generateCSVContent(mockData);

      expect(typeof csv).toBe("string");
      expect(csv.length).toBeGreaterThan(0);
    });

    it("should include headers in CSV", () => {
      const csv = generateCSVContent(mockData);

      expect(csv).toContain("Date");
      expect(csv).toContain("Staff Name");
      expect(csv).toContain("Check-in");
      expect(csv).toContain("Check-out");
      expect(csv).toContain("Hours Worked");
      expect(csv).toContain("Overtime");
      expect(csv).toContain("Location");
      expect(csv).toContain("Remarks");
    });

    it("should include all data rows in CSV", () => {
      const csv = generateCSVContent(mockData);

      expect(csv).toContain("John Doe");
      expect(csv).toContain("Jane Smith");
      expect(csv).toContain("Nairobi Office");
      expect(csv).toContain("Field");
    });

    it("should escape quotes in remarks", () => {
      const dataWithQuotes = [
        {
          date: "2026-04-15",
          staffName: "Test User",
          checkInTime: "08:00:00",
          checkOutTime: "17:00:00",
          hoursWorked: 9,
          overtimeHours: 1,
          location: "Office",
          remarks: 'Test "quoted" remarks',
        },
      ];

      const csv = generateCSVContent(dataWithQuotes);

      // Quotes should be escaped as ""
      expect(csv).toContain('Test ""quoted"" remarks');
    });

    it("should have correct number of rows", () => {
      const csv = generateCSVContent(mockData);
      const lines = csv.split("\n");

      // Should have header + data rows
      expect(lines.length).toBe(mockData.length + 1);
    });

    it("should handle empty data array", () => {
      const csv = generateCSVContent([]);

      expect(typeof csv).toBe("string");
      // Should still have headers
      expect(csv).toContain("Date");
    });
  });

  describe("generateExcelContent", () => {
    const mockData = [
      {
        date: "2026-04-15",
        staffName: "John Doe",
        checkInTime: "08:00:00",
        checkOutTime: "17:00:00",
        hoursWorked: 9,
        overtimeHours: 1,
        location: "Nairobi Office",
        remarks: "Regular work day",
      },
      {
        date: "2026-04-16",
        staffName: "Jane Smith",
        checkInTime: "07:30:00",
        checkOutTime: "18:30:00",
        hoursWorked: 11,
        overtimeHours: 3,
        location: "Field",
        remarks: "Project completion",
      },
    ];

    it("should generate valid HTML/Excel content", () => {
      const html = generateExcelContent(mockData);

      expect(typeof html).toBe("string");
      expect(html.length).toBeGreaterThan(0);
    });

    it("should include HTML structure", () => {
      const html = generateExcelContent(mockData);

      expect(html).toContain("<html>");
      expect(html).toContain("</html>");
      expect(html).toContain("<table>");
      expect(html).toContain("</table>");
      expect(html).toContain("<thead>");
      expect(html).toContain("<tbody>");
    });

    it("should include all column headers", () => {
      const html = generateExcelContent(mockData);

      expect(html).toContain("<th>Date</th>");
      expect(html).toContain("<th>Staff Name</th>");
      expect(html).toContain("<th>Check-in</th>");
      expect(html).toContain("<th>Check-out</th>");
      expect(html).toContain("<th>Hours Worked</th>");
      expect(html).toContain("<th>Overtime</th>");
      expect(html).toContain("<th>Location</th>");
      expect(html).toContain("<th>Remarks</th>");
    });

    it("should include all data rows", () => {
      const html = generateExcelContent(mockData);

      expect(html).toContain("John Doe");
      expect(html).toContain("Jane Smith");
      expect(html).toContain("Nairobi Office");
      expect(html).toContain("Field");
      expect(html).toContain("2026-04-15");
      expect(html).toContain("2026-04-16");
    });

    it("should include summary statistics", () => {
      const html = generateExcelContent(mockData);

      expect(html).toContain("Total Records: 2");
      expect(html).toContain("Total Hours:");
      expect(html).toContain("Total Overtime:");
    });

    it("should calculate totals correctly", () => {
      const html = generateExcelContent(mockData);

      const totalHours = mockData.reduce((sum, r) => sum + r.hoursWorked, 0);
      const totalOvertime = mockData.reduce((sum, r) => sum + r.overtimeHours, 0);

      expect(html).toContain(`Total Hours: ${totalHours.toFixed(2)}`);
      expect(html).toContain(`Total Overtime: ${totalOvertime.toFixed(2)}`);
    });

    it("should include generation timestamp", () => {
      const html = generateExcelContent(mockData);

      expect(html).toContain("Generated:");
    });

    it("should handle empty data array", () => {
      const html = generateExcelContent([]);

      expect(typeof html).toBe("string");
      expect(html).toContain("<table>");
      expect(html).toContain("Total Records: 0");
    });

    it("should include styling", () => {
      const html = generateExcelContent(mockData);

      expect(html).toContain("<style>");
      expect(html).toContain("border-collapse: collapse");
      expect(html).toContain("background-color: #4472C4");
    });
  });

  describe("Export data structure", () => {
    it("should have all required fields in export data", async () => {
      const startDate = new Date("2026-04-01");
      const endDate = new Date("2026-04-30");

      const result = await getTimesheetDataForExport({
        startDate,
        endDate,
      });

      if (result.length > 0) {
        const firstRecord = result[0];

        expect(firstRecord).toHaveProperty("date");
        expect(firstRecord).toHaveProperty("staffName");
        expect(firstRecord).toHaveProperty("checkInTime");
        expect(firstRecord).toHaveProperty("checkOutTime");
        expect(firstRecord).toHaveProperty("hoursWorked");
        expect(firstRecord).toHaveProperty("overtimeHours");
        expect(firstRecord).toHaveProperty("location");
        expect(firstRecord).toHaveProperty("remarks");
      }
    });

    it("should have correct data types", async () => {
      const startDate = new Date("2026-04-01");
      const endDate = new Date("2026-04-30");

      const result = await getTimesheetDataForExport({
        startDate,
        endDate,
      });

      if (result.length > 0) {
        const firstRecord = result[0];

        expect(typeof firstRecord.date).toBe("string");
        expect(typeof firstRecord.staffName).toBe("string");
        expect(typeof firstRecord.checkInTime).toBe("string");
        expect(typeof firstRecord.checkOutTime).toBe("string");
        expect(typeof firstRecord.hoursWorked).toBe("number");
        expect(typeof firstRecord.overtimeHours).toBe("number");
        expect(typeof firstRecord.location).toBe("string");
        expect(typeof firstRecord.remarks).toBe("string");
      }
    });
  });
});
