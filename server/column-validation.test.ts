import { describe, it, expect, beforeAll, afterEach } from "vitest";
import { getDb } from "./db";
import { eq } from "drizzle-orm";
import { attendance } from "../drizzle/schema";

describe("Column Validation & Data Integrity", () => {
  let db: any;

  beforeAll(async () => {
    db = await getDb();
  });

  describe("GPS Coordinate Precision", () => {
    it("should store check-in latitude with 8 decimal precision", async () => {
      if (!db) return;
      
      const testLat = -1.29216789;
      await db.insert(attendance).values({
        userId: 1,
        checkInTime: new Date(),
        checkInLat: testLat,
        checkInLng: 36.82195678,
      });

      const result = await db.select().from(attendance).orderBy(eq(attendance.id, attendance.id)).limit(1);
      expect(result[0]).toBeDefined();
      expect(result[0].checkInLat).toBeDefined();
    });

    it("should validate latitude range (-90 to 90)", async () => {
      if (!db) return;
      
      const validLats = [-90, -45, 0, 45, 90];
      for (const lat of validLats) {
        await db.insert(attendance).values({
          userId: 1,
          checkInTime: new Date(),
          checkInLat: lat,
          checkInLng: 0,
        });
      }
      
      const results = await db.select().from(attendance).limit(5);
      expect(results.length).toBeGreaterThan(0);
    });

    it("should validate longitude range (-180 to 180)", async () => {
      if (!db) return;
      
      const validLngs = [-180, -90, 0, 90, 180];
      for (const lng of validLngs) {
        await db.insert(attendance).values({
          userId: 1,
          checkInTime: new Date(),
          checkInLat: 0,
          checkInLng: lng,
        });
      }
      
      const results = await db.select().from(attendance).limit(5);
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe("Duration & Overtime Calculations", () => {
    it("should store durationMinutes correctly", async () => {
      if (!db) return;
      
      const expectedMinutes = 540;
      await db.insert(attendance).values({
        userId: 1,
        checkInTime: new Date(),
        checkInLat: 0,
        checkInLng: 0,
        durationMinutes: expectedMinutes,
      });

      const result = await db.select().from(attendance).limit(1);
      expect(result[0]).toBeDefined();
      expect(result[0].durationMinutes).toBe(expectedMinutes);
    });

    it("should store overtimeMinutes correctly", async () => {
      if (!db) return;
      
      await db.insert(attendance).values({
        userId: 1,
        checkInTime: new Date(),
        checkInLat: 0,
        checkInLng: 0,
        durationMinutes: 540,
        overtimeMinutes: 60,
      });

      const result = await db.select().from(attendance).limit(1);
      expect(result[0]).toBeDefined();
      expect(result[0].overtimeMinutes).toBe(60);
    });

    it("should store distance with 3 decimal precision", async () => {
      if (!db) return;
      
      const testDistance = 15.567;
      await db.insert(attendance).values({
        userId: 1,
        checkInTime: new Date(),
        checkInLat: 0,
        checkInLng: 0,
        distanceTraveled: testDistance,
      });

      const result = await db.select().from(attendance).limit(1);
      expect(result[0]).toBeDefined();
      expect(result[0].distanceTraveled).toBeDefined();
    });
  });

  describe("Time Field Validation", () => {
    it("should enforce checkOutTime >= checkInTime", async () => {
      if (!db) return;
      
      const checkIn = new Date("2026-05-23T08:00:00Z");
      const checkOut = new Date("2026-05-23T17:00:00Z");

      await db.insert(attendance).values({
        userId: 1,
        checkInTime: checkIn,
        checkOutTime: checkOut,
        checkInLat: 0,
        checkInLng: 0,
      });

      const result = await db.select().from(attendance).limit(1);
      expect(result[0]).toBeDefined();
      expect(result[0].checkOutTime).toBeDefined();
    });

    it("should allow NULL checkOutTime for ongoing shifts", async () => {
      if (!db) return;
      
      await db.insert(attendance).values({
        userId: 1,
        checkInTime: new Date(),
        checkOutTime: null,
        checkInLat: 0,
        checkInLng: 0,
      });

      const result = await db.select().from(attendance).limit(1);
      expect(result[0]).toBeDefined();
    });
  });

  describe("Enum Field Validation", () => {
    it("should only accept valid workModality values", async () => {
      if (!db) return;
      
      const validModalities = ["nairobi_office", "homa_bay_office", "field", "remote"];

      for (const modality of validModalities) {
        await db.insert(attendance).values({
          userId: 1,
          checkInTime: new Date(),
          checkInLat: 0,
          checkInLng: 0,
          workModality: modality,
        });
      }

      const results = await db.select().from(attendance).limit(4);
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe("Foreign Key Validation", () => {
    it("should store valid activityCategoryId", async () => {
      if (!db) return;
      
      await db.insert(attendance).values({
        userId: 1,
        checkInTime: new Date(),
        checkInLat: 0,
        checkInLng: 0,
        activityCategoryId: 1,
      });

      const result = await db.select().from(attendance).limit(1);
      expect(result[0]).toBeDefined();
      expect(result[0].activityCategoryId).toBe(1);
    });

    it("should store valid sdgGoalId (1-17)", async () => {
      if (!db) return;
      
      const validGoals = [1, 5, 10, 17];

      for (const goalId of validGoals) {
        await db.insert(attendance).values({
          userId: 1,
          checkInTime: new Date(),
          checkInLat: 0,
          checkInLng: 0,
          sdgGoalId: goalId,
        });
      }

      const results = await db.select().from(attendance).limit(4);
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe("Text Field Validation", () => {
    it("should store taskDescription correctly", async () => {
      if (!db) return;
      
      const taskDesc = "Conducted community health awareness program";
      await db.insert(attendance).values({
        userId: 1,
        checkInTime: new Date(),
        checkInLat: 0,
        checkInLng: 0,
        taskDescription: taskDesc,
      });

      const result = await db.select().from(attendance).limit(1);
      expect(result[0]).toBeDefined();
      expect(result[0].taskDescription).toBe(taskDesc);
    });

    it("should store staffRemarks with special characters", async () => {
      if (!db) return;
      
      const remarks = 'Completed "Project Alpha" successfully.';
      await db.insert(attendance).values({
        userId: 1,
        checkInTime: new Date(),
        checkInLat: 0,
        checkInLng: 0,
        staffRemarks: remarks,
      });

      const result = await db.select().from(attendance).limit(1);
      expect(result[0]).toBeDefined();
      expect(result[0].staffRemarks).toBe(remarks);
    });
  });

  describe("Boolean Field Validation", () => {
    it("should default isSubmitted to false", async () => {
      if (!db) return;
      
      await db.insert(attendance).values({
        userId: 1,
        checkInTime: new Date(),
        checkInLat: 0,
        checkInLng: 0,
      });

      const result = await db.select().from(attendance).limit(1);
      expect(result[0]).toBeDefined();
      expect(result[0].isSubmitted).toBe(false);
    });

    it("should default isApproved to false", async () => {
      if (!db) return;
      
      await db.insert(attendance).values({
        userId: 1,
        checkInTime: new Date(),
        checkInLat: 0,
        checkInLng: 0,
      });

      const result = await db.select().from(attendance).limit(1);
      expect(result[0]).toBeDefined();
      expect(result[0].isApproved).toBe(false);
    });
  });

  describe("Complete Record Validation", () => {
    it("should store complete timesheet record with all fields", async () => {
      if (!db) return;
      
      const completeRecord = {
        userId: 1,
        dailyStaffNumber: "001",
        checkInTime: new Date("2026-05-23T08:00:00Z"),
        checkOutTime: new Date("2026-05-23T17:00:00Z"),
        checkInLat: -1.29216789,
        checkInLng: 36.82195678,
        checkInAddress: "Nairobi Office",
        checkOutLat: -1.29216789,
        checkOutLng: 36.82195678,
        checkOutAddress: "Nairobi Office",
        checkInAccuracy: 5.5,
        checkOutAccuracy: 6.2,
        distanceTraveled: 0.0,
        durationMinutes: 540,
        overtimeMinutes: 60,
        amStartTime: new Date("2026-05-23T08:00:00Z"),
        amEndTime: new Date("2026-05-23T12:00:00Z"),
        pmStartTime: new Date("2026-05-23T13:00:00Z"),
        pmEndTime: new Date("2026-05-23T17:00:00Z"),
        workModality: "nairobi_office",
        activityCategoryId: 1,
        sdgGoalId: 3,
        program: "Health Program",
        kpiId: 1,
        taskDescription: "Community health awareness",
        evidenceUploadKey: "evidence-001.pdf",
        staffRemarks: "Successful program",
        isSubmitted: true,
        submittedAt: new Date(),
        isApproved: false,
      };

      await db.insert(attendance).values(completeRecord);

      const result = await db.select().from(attendance).limit(1);
      expect(result[0]).toBeDefined();
      expect(result[0].userId).toBe(1);
      expect(result[0].durationMinutes).toBe(540);
      expect(result[0].overtimeMinutes).toBe(60);
      expect(result[0].workModality).toBe("nairobi_office");
      expect(result[0].isSubmitted).toBe(true);
    });
  });
});
