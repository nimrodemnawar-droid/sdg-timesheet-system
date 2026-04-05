import { describe, it, expect, beforeAll, afterAll } from "vitest";
import * as db from "./db";

describe("Overtime Approval Workflow", () => {
  describe("calculatePayoutAmount", () => {
    it("should calculate payout with 1.5x multiplier", () => {
      const payout = db.calculatePayoutAmount(2, 20, 1.5);
      expect(payout).toBe(60); // 2 hours * $20 * 1.5
    });

    it("should calculate payout with 2x multiplier", () => {
      const payout = db.calculatePayoutAmount(3, 25, 2);
      expect(payout).toBe(150); // 3 hours * $25 * 2
    });

    it("should handle decimal hours correctly", () => {
      const payout = db.calculatePayoutAmount(2.5, 20, 1.5);
      expect(payout).toBe(75); // 2.5 hours * $20 * 1.5
    });

    it("should round to 2 decimal places", () => {
      const payout = db.calculatePayoutAmount(1.33, 15.5, 1.5);
      // 1.33 * 15.5 * 1.5 = 30.9225, rounded to 30.92
      expect(payout).toBeCloseTo(30.92, 2);
    });

    it("should use default multiplier of 1.5 if not provided", () => {
      const payout = db.calculatePayoutAmount(2, 20);
      expect(payout).toBe(60); // 2 hours * $20 * 1.5 (default)
    });

    it("should handle zero overtime hours", () => {
      const payout = db.calculatePayoutAmount(0, 20, 1.5);
      expect(payout).toBe(0);
    });

    it("should handle zero hourly rate", () => {
      const payout = db.calculatePayoutAmount(2, 0, 1.5);
      expect(payout).toBe(0);
    });
  });

  describe("OvertimeRecord interface", () => {
    it("should have all required fields", () => {
      const record: db.OvertimeRecord = {
        attendanceId: 1,
        staffId: 1,
        staffName: "John Doe",
        overtimeHours: 2,
        checkInTime: new Date("2026-04-05T08:00:00"),
        checkOutTime: new Date("2026-04-05T18:00:00"),
        overtimeDate: "2026-04-05",
        status: "PENDING",
      };

      expect(record.attendanceId).toBe(1);
      expect(record.staffId).toBe(1);
      expect(record.staffName).toBe("John Doe");
      expect(record.overtimeHours).toBe(2);
      expect(record.status).toBe("PENDING");
    });

    it("should support optional fields", () => {
      const record: db.OvertimeRecord = {
        attendanceId: 1,
        staffId: 1,
        staffName: "Jane Doe",
        overtimeHours: 1.5,
        checkInTime: new Date(),
        checkOutTime: new Date(),
        overtimeDate: "2026-04-05",
        status: "APPROVED",
        approvalNotes: "Approved for project deadline",
        payoutMultiplier: 2,
        payoutAmount: 100,
      };

      expect(record.approvalNotes).toBe("Approved for project deadline");
      expect(record.payoutMultiplier).toBe(2);
      expect(record.payoutAmount).toBe(100);
    });
  });

  describe("Overtime approval logic", () => {
    it("should calculate overtime hours correctly for 10-hour workday", () => {
      const checkIn = new Date("2026-04-05T08:00:00");
      const checkOut = new Date("2026-04-05T18:00:00");
      const hoursWorked = (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60);
      const overtimeHours = Math.max(0, hoursWorked - 8);

      expect(hoursWorked).toBe(10);
      expect(overtimeHours).toBe(2);
    });

    it("should return 0 overtime for 8-hour workday", () => {
      const checkIn = new Date("2026-04-05T08:00:00");
      const checkOut = new Date("2026-04-05T16:00:00");
      const hoursWorked = (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60);
      const overtimeHours = Math.max(0, hoursWorked - 8);

      expect(hoursWorked).toBe(8);
      expect(overtimeHours).toBe(0);
    });

    it("should return 0 overtime for less than 8-hour workday", () => {
      const checkIn = new Date("2026-04-05T08:00:00");
      const checkOut = new Date("2026-04-05T14:00:00");
      const hoursWorked = (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60);
      const overtimeHours = Math.max(0, hoursWorked - 8);

      expect(hoursWorked).toBe(6);
      expect(overtimeHours).toBe(0);
    });

    it("should handle partial hours correctly", () => {
      const checkIn = new Date("2026-04-05T08:00:00");
      const checkOut = new Date("2026-04-05T17:30:00"); // 9.5 hours
      const hoursWorked = (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60);
      const overtimeHours = Math.max(0, hoursWorked - 8);

      expect(hoursWorked).toBe(9.5);
      expect(overtimeHours).toBe(1.5);
    });
  });

  describe("Payroll calculation scenarios", () => {
    it("should calculate regular overtime payout", () => {
      // 2 hours overtime at $20/hour with 1.5x multiplier
      const payout = db.calculatePayoutAmount(2, 20, 1.5);
      expect(payout).toBe(60);
    });

    it("should calculate weekend overtime payout", () => {
      // 3 hours overtime at $20/hour with 2x multiplier
      const payout = db.calculatePayoutAmount(3, 20, 2);
      expect(payout).toBe(120);
    });

    it("should calculate holiday overtime payout", () => {
      // 4 hours overtime at $25/hour with 2.5x multiplier
      const payout = db.calculatePayoutAmount(4, 25, 2.5);
      expect(payout).toBe(250);
    });

    it("should handle multiple staff overtime calculations", () => {
      const staff1 = db.calculatePayoutAmount(2, 20, 1.5); // $60
      const staff2 = db.calculatePayoutAmount(1.5, 22, 1.5); // $49.50
      const staff3 = db.calculatePayoutAmount(3, 18, 1.5); // $81

      const totalPayout = staff1 + staff2 + staff3;
      expect(totalPayout).toBeCloseTo(190.5, 2);
    });
  });

  describe("Overtime status transitions", () => {
    it("should support PENDING status", () => {
      const record: db.OvertimeRecord = {
        attendanceId: 1,
        staffId: 1,
        staffName: "John",
        overtimeHours: 2,
        checkInTime: new Date(),
        checkOutTime: new Date(),
        overtimeDate: "2026-04-05",
        status: "PENDING",
      };

      expect(record.status).toBe("PENDING");
    });

    it("should support APPROVED status", () => {
      const record: db.OvertimeRecord = {
        attendanceId: 1,
        staffId: 1,
        staffName: "John",
        overtimeHours: 2,
        checkInTime: new Date(),
        checkOutTime: new Date(),
        overtimeDate: "2026-04-05",
        status: "APPROVED",
        payoutAmount: 60,
      };

      expect(record.status).toBe("APPROVED");
      expect(record.payoutAmount).toBe(60);
    });

    it("should support REJECTED status", () => {
      const record: db.OvertimeRecord = {
        attendanceId: 1,
        staffId: 1,
        staffName: "John",
        overtimeHours: 2,
        checkInTime: new Date(),
        checkOutTime: new Date(),
        overtimeDate: "2026-04-05",
        status: "REJECTED",
        approvalNotes: "Overtime not authorized",
      };

      expect(record.status).toBe("REJECTED");
      expect(record.approvalNotes).toBe("Overtime not authorized");
    });
  });
});
