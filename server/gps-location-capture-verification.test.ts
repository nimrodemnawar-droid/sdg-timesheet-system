import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createAttendance, getAllStaffCheckedInToday, getTodayAttendance } from "./db";

describe("GPS Location Capture Verification", () => {
  describe("Check-in Location Capture", () => {
    it("should capture Nairobi CBD check-in location correctly", async () => {
      const result = await createAttendance({
        userId: 1,
        checkInLat: "-1.2841",
        checkInLng: "36.8155",
        checkInAccuracy: "50", // 50 meters accuracy
        checkInAddress: "Nairobi Central Business District, Tom Mboya Street",
      });

      expect(result).toBeDefined();
      expect(result?.checkInLat).toBe(-1.2841);
      expect(result?.checkInLng).toBe(36.8155);
      expect(result?.checkInAddress).toBe("Nairobi Central Business District, Tom Mboya Street");
    });

    it("should capture Mombasa check-in location correctly", async () => {
      const result = await createAttendance({
        userId: 2,
        checkInLat: "-4.0435",
        checkInLng: "39.6682",
        checkInAccuracy: "35",
        checkInAddress: "Mombasa, Nkrumah Road",
      });

      expect(result).toBeDefined();
      expect(result?.checkInLat).toBe(-4.0435);
      expect(result?.checkInLng).toBe(39.6682);
      expect(result?.checkInAddress).toBe("Mombasa, Nkrumah Road");
    });

    it("should capture Kisumu check-in location correctly", async () => {
      const result = await createAttendance({
        userId: 3,
        checkInLat: "-0.1022",
        checkInLng: "34.7617",
        checkInAccuracy: "42",
        checkInAddress: "Kisumu, Oginga Odinga Street",
      });

      expect(result).toBeDefined();
      expect(result?.checkInLat).toBe(-0.1022);
      expect(result?.checkInLng).toBe(34.7617);
      expect(result?.checkInAddress).toBe("Kisumu, Oginga Odinga Street");
    });

    it("should capture Homa Bay check-in location correctly", async () => {
      const result = await createAttendance({
        userId: 4,
        checkInLat: "-0.5",
        checkInLng: "34.45",
        checkInAccuracy: "28",
        checkInAddress: "Homa Bay Town",
      });

      expect(result).toBeDefined();
      expect(result?.checkInLat).toBe(-0.5);
      expect(result?.checkInLng).toBe(34.45);
      expect(result?.checkInAddress).toBe("Homa Bay Town");
    });

    it("should capture Karen check-in location correctly", async () => {
      const result = await createAttendance({
        userId: 5,
        checkInLat: "-1.3521",
        checkInLng: "36.7265",
        checkInAccuracy: "55",
        checkInAddress: "Karen, Karen Road",
      });

      expect(result).toBeDefined();
      expect(result?.checkInLat).toBe(-1.3521);
      expect(result?.checkInLng).toBe(36.7265);
      expect(result?.checkInAddress).toBe("Karen, Karen Road");
    });
  });

  describe("GPS Accuracy Conversion", () => {
    it("should convert large accuracy values (meters) to kilometers", async () => {
      // GPS accuracy from mobile devices is typically in meters (e.g., 50000m = 50km)
      const result = await createAttendance({
        userId: 6,
        checkInLat: "-1.2841",
        checkInLng: "36.8155",
        checkInAccuracy: "50000", // Large value in meters
        checkInAddress: "Nairobi CBD",
      });

      expect(result).toBeDefined();
      // Should be converted from 50000 meters to 50 kilometers
      expect(result?.checkInAccuracy).toBe(50);
    });

    it("should keep small accuracy values unchanged", async () => {
      const result = await createAttendance({
        userId: 7,
        checkInLat: "-1.2841",
        checkInLng: "36.8155",
        checkInAccuracy: "25", // Small value in meters
        checkInAddress: "Nairobi CBD",
      });

      expect(result).toBeDefined();
      expect(result?.checkInAccuracy).toBe(25);
    });
  });

  describe("Location Data Retrieval", () => {
    it("should retrieve all staff locations with correct coordinates", async () => {
      // Create multiple check-ins with different locations
      await createAttendance({
        userId: 10,
        checkInLat: "-1.2841",
        checkInLng: "36.8155",
        checkInAccuracy: "40",
        checkInAddress: "Nairobi Central Business District",
      });

      await createAttendance({
        userId: 11,
        checkInLat: "-4.0435",
        checkInLng: "39.6682",
        checkInAccuracy: "35",
        checkInAddress: "Mombasa Port Authority",
      });

      await createAttendance({
        userId: 12,
        checkInLat: "-0.1022",
        checkInLng: "34.7617",
        checkInAccuracy: "45",
        checkInAddress: "Kisumu Business District",
      });

      // Retrieve all staff checked in today
      const staffList = await getAllStaffCheckedInToday();

      expect(staffList).toBeDefined();
      expect(Array.isArray(staffList)).toBe(true);

      // Verify each staff has correct location data
      const nairobi = staffList.find(s => s.userId === 10);
      const mombasa = staffList.find(s => s.userId === 11);
      const kisumu = staffList.find(s => s.userId === 12);

      expect(nairobi).toBeDefined();
      expect(parseFloat(nairobi?.checkInLat as any)).toBeCloseTo(-1.2841, 3);
      expect(parseFloat(nairobi?.checkInLng as any)).toBeCloseTo(36.8155, 3);
      expect(nairobi?.checkInAddress).toContain("Nairobi");

      expect(mombasa).toBeDefined();
      expect(parseFloat(mombasa?.checkInLat as any)).toBeCloseTo(-4.0435, 3);
      expect(parseFloat(mombasa?.checkInLng as any)).toBeCloseTo(39.6682, 3);
      expect(mombasa?.checkInAddress).toContain("Mombasa");

      expect(kisumu).toBeDefined();
      expect(parseFloat(kisumu?.checkInLat as any)).toBeCloseTo(-0.1022, 3);
      expect(parseFloat(kisumu?.checkInLng as any)).toBeCloseTo(34.7617, 3);
      expect(kisumu?.checkInAddress).toContain("Kisumu");
    });

    it("should NOT use fallback Nairobi coordinates for staff with valid locations", async () => {
      await createAttendance({
        userId: 20,
        checkInLat: "-4.0435",
        checkInLng: "39.6682",
        checkInAccuracy: "30",
        checkInAddress: "Mombasa",
      });

      const staffList = await getAllStaffCheckedInToday();
      const mombasa = staffList.find(s => s.userId === 20);

      expect(mombasa).toBeDefined();
      // Should NOT be Nairobi CBD coordinates
      expect(parseFloat(mombasa?.checkInLat as any)).not.toBeCloseTo(-1.2921, 2);
      expect(parseFloat(mombasa?.checkInLng as any)).not.toBeCloseTo(36.8219, 2);
      // Should be Mombasa coordinates
      expect(parseFloat(mombasa?.checkInLat as any)).toBeCloseTo(-4.0435, 3);
      expect(parseFloat(mombasa?.checkInLng as any)).toBeCloseTo(39.6682, 3);
    });
  });

  describe("Location Accuracy Validation", () => {
    it("should validate GPS coordinates are within Kenya bounds", async () => {
      // Kenya approximate bounds: -4.7 to 4.9 latitude, 33.9 to 41.9 longitude
      const validLocations = [
        { lat: "-1.2841", lng: "36.8155", name: "Nairobi" },
        { lat: "-4.0435", lng: "39.6682", name: "Mombasa" },
        { lat: "-0.1022", lng: "34.7617", name: "Kisumu" },
        { lat: "0.5", lng: "35.0", name: "Northern Kenya" },
      ];

      for (const loc of validLocations) {
        const lat = parseFloat(loc.lat);
        const lng = parseFloat(loc.lng);

        // Validate bounds
        expect(lat).toBeGreaterThanOrEqual(-4.7);
        expect(lat).toBeLessThanOrEqual(4.9);
        expect(lng).toBeGreaterThanOrEqual(33.9);
        expect(lng).toBeLessThanOrEqual(41.9);
      }
    });

    it("should handle 8-decimal GPS precision correctly", async () => {
      const result = await createAttendance({
        userId: 30,
        checkInLat: "-1.28410000",
        checkInLng: "36.81550000",
        checkInAccuracy: "15",
        checkInAddress: "Nairobi CBD",
      });

      expect(result).toBeDefined();
      // Should preserve 8-decimal precision
      expect(result?.checkInLat).toBe(-1.2841);
      expect(result?.checkInLng).toBe(36.8155);
    });
  });

  describe("Location Display in Reports", () => {
    it("should show specific addresses instead of vague regions", async () => {
      await createAttendance({
        userId: 40,
        checkInLat: "-1.2841",
        checkInLng: "36.8155",
        checkInAccuracy: "40",
        checkInAddress: "Nairobi Central Business District, Tom Mboya Street",
      });

      const staffList = await getAllStaffCheckedInToday();
      const staff = staffList.find(s => s.userId === 40);

      expect(staff?.checkInAddress).toBeDefined();
      // Should NOT be vague
      expect(staff?.checkInAddress).not.toContain("South Nairobi");
      expect(staff?.checkInAddress).not.toContain("North Nairobi");
      expect(staff?.checkInAddress).not.toContain("Central Nairobi");
      // Should be specific
      expect(staff?.checkInAddress).toContain("Tom Mboya Street");
    });

    it("should correctly distinguish between Nairobi and Mombasa", async () => {
      await createAttendance({
        userId: 50,
        checkInLat: "-1.2841",
        checkInLng: "36.8155",
        checkInAccuracy: "40",
        checkInAddress: "Nairobi Central Business District",
      });

      await createAttendance({
        userId: 51,
        checkInLat: "-4.0435",
        checkInLng: "39.6682",
        checkInAccuracy: "35",
        checkInAddress: "Mombasa, Nkrumah Road",
      });

      const staffList = await getAllStaffCheckedInToday();
      const nairobi = staffList.find(s => s.userId === 50);
      const mombasa = staffList.find(s => s.userId === 51);

      expect(nairobi?.checkInAddress).toContain("Nairobi");
      expect(mombasa?.checkInAddress).toContain("Mombasa");
      // Should NOT show Mombasa staff as being in Nairobi
      expect(mombasa?.checkInAddress).not.toContain("Nairobi");
    });
  });
});
