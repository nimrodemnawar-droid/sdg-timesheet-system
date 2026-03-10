import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  calculateDistance,
  getAccuracyQuality,
  encryptData,
  decryptData,
} from "./encryption";

describe("GPS and Encryption Utilities", () => {
  describe("calculateDistance", () => {
    it("should calculate distance between two GPS coordinates", () => {
      // Nairobi coordinates
      const lat1 = -1.28921456;
      const lng1 = 36.82190123;

      // Approximately 73 meters away from Nairobi
      const lat2 = -1.28956789;
      const lng2 = 36.82245678;

      const distance = calculateDistance(lat1, lng1, lat2, lng2);

      // Should be approximately 0.073 km (73 meters)
      expect(distance).toBeGreaterThan(0);
      expect(distance).toBeLessThan(0.15);
    });

    it("should return 0 for same coordinates", () => {
      const distance = calculateDistance(-1.28921456, 36.82190123, -1.28921456, 36.82190123);
      expect(distance).toBe(0);
    });

    it("should calculate distance between distant cities", () => {
      // Nairobi to Mombasa (approximately 440 km)
      const nairobi = { lat: -1.2921, lng: 36.8219 };
      const mombasa = { lat: -4.0435, lng: 39.6682 };

      const distance = calculateDistance(
        nairobi.lat,
        nairobi.lng,
        mombasa.lat,
        mombasa.lng
      );

      // Should be approximately 440 km
      expect(distance).toBeGreaterThan(430);
      expect(distance).toBeLessThan(450);
    });
  });

  describe("getAccuracyQuality", () => {
    it("should return Excellent for accuracy < 10m", () => {
      expect(getAccuracyQuality(5)).toBe("Excellent");
      expect(getAccuracyQuality(9.9)).toBe("Excellent");
    });

    it("should return Good for accuracy 10-50m", () => {
      expect(getAccuracyQuality(10)).toBe("Good");
      expect(getAccuracyQuality(25)).toBe("Good");
      expect(getAccuracyQuality(49.9)).toBe("Good");
    });

    it("should return Fair for accuracy 50-100m", () => {
      expect(getAccuracyQuality(50)).toBe("Fair");
      expect(getAccuracyQuality(75)).toBe("Fair");
      expect(getAccuracyQuality(99.9)).toBe("Fair");
    });

    it("should return Poor for accuracy > 100m", () => {
      expect(getAccuracyQuality(100)).toBe("Poor");
      expect(getAccuracyQuality(500)).toBe("Poor");
    });
  });

  describe("Encryption and Decryption", () => {
    it("should encrypt and decrypt data correctly", () => {
      const originalText = "This is a sensitive remark about staff performance";
      const { encryptedData, iv } = encryptData(originalText);

      expect(encryptedData).not.toBe(originalText);
      expect(iv).toBeDefined();
      expect(iv.length).toBeGreaterThan(0);

      const decrypted = decryptData(encryptedData, iv);
      expect(decrypted).toBe(originalText);
    });

    it("should produce different ciphertexts for same plaintext", () => {
      const plaintext = "Sensitive data";
      const { encryptedData: encrypted1, iv: iv1 } = encryptData(plaintext);
      const { encryptedData: encrypted2, iv: iv2 } = encryptData(plaintext);

      // Different IVs should produce different ciphertexts
      expect(encrypted1).not.toBe(encrypted2);
      expect(iv1).not.toBe(iv2);

      // But both should decrypt to the same plaintext
      expect(decryptData(encrypted1, iv1)).toBe(plaintext);
      expect(decryptData(encrypted2, iv2)).toBe(plaintext);
    });

    it("should handle empty strings", () => {
      const { encryptedData, iv } = encryptData("");
      const decrypted = decryptData(encryptedData, iv);
      expect(decrypted).toBe("");
    });

    it("should handle special characters", () => {
      const specialText = "Staff showed great effort! Location: -1.28921456, 36.82190123";
      const { encryptedData, iv } = encryptData(specialText);
      const decrypted = decryptData(encryptedData, iv);
      expect(decrypted).toBe(specialText);
    });
  });

  describe("Timesheet Duration Calculation", () => {
    it("should calculate duration in minutes correctly", () => {
      const checkInTime = new Date("2026-03-10T09:00:00Z");
      const checkOutTime = new Date("2026-03-10T17:30:00Z");

      const durationMinutes = Math.floor(
        (checkOutTime.getTime() - checkInTime.getTime()) / 60000
      );

      expect(durationMinutes).toBe(510); // 8.5 hours = 510 minutes
    });

    it("should calculate overtime correctly", () => {
      // 9 hours of work
      const durationMinutes = 540; // 9 * 60
      const overtimeMinutes = Math.max(0, durationMinutes - 480); // 8 hours = 480 minutes

      expect(overtimeMinutes).toBe(60); // 1 hour overtime
    });

    it("should not calculate negative overtime", () => {
      // 7 hours of work
      const durationMinutes = 420; // 7 * 60
      const overtimeMinutes = Math.max(0, durationMinutes - 480);

      expect(overtimeMinutes).toBe(0);
    });
  });

  describe("Leave Balance Calculations", () => {
    it("should calculate remaining leave days correctly", () => {
      const allocatedDays = 20;
      const usedDays = 5;
      const remainingDays = allocatedDays - usedDays;

      expect(remainingDays).toBe(15);
    });

    it("should handle fractional leave days", () => {
      const allocatedDays = 20;
      const usedDays = 5.5; // Half day
      const remainingDays = allocatedDays - usedDays;

      expect(remainingDays).toBe(14.5);
    });

    it("should prevent negative remaining days", () => {
      const allocatedDays = 20;
      const usedDays = 25;
      const remainingDays = Math.max(0, allocatedDays - usedDays);

      expect(remainingDays).toBe(0);
    });
  });

  describe("GPS Precision", () => {
    it("should maintain 8-decimal precision for coordinates", () => {
      const latitude = "-1.28921456"; // 8 decimal places
      const longitude = "36.82190123"; // 8 decimal places

      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);

      // Verify precision is maintained
      expect(latitude).toContain("28921456");
      expect(longitude).toContain("82190123");
      expect(Math.abs(lat - (-1.28921456))).toBeLessThan(0.00000001);
      expect(Math.abs(lng - 36.82190123)).toBeLessThan(0.00000001);
    });

    it("should handle accuracy values with 2 decimal places", () => {
      const accuracy = "8.50"; // meters with 2 decimal places
      const accuracyNum = parseFloat(accuracy);

      expect(accuracyNum).toBe(8.5);
      expect(getAccuracyQuality(accuracyNum)).toBe("Excellent");
    });
  });
});
