import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { reverseGeocode } from "./staffTracking";

describe("Reverse Geocoding - Address Display in GPS Map", () => {
  describe("Nairobi Locations", () => {
    it("should return 'Nairobi CBD, Tom Mboya Street' for CBD coordinates", async () => {
      const address = await reverseGeocode(-1.2841, 36.8155);
      expect(address).toContain("Nairobi CBD");
      expect(address).toContain("Tom Mboya Street");
    });

    it("should return 'Westlands, Westlands Avenue' for Westlands coordinates", async () => {
      const address = await reverseGeocode(-1.2620, 36.8080);
      expect(address).toContain("Westlands");
      expect(address).toContain("Westlands Avenue");
    });

    it("should return 'Upper Hill, Bishops Road' for Upper Hill coordinates", async () => {
      const address = await reverseGeocode(-1.2975, 36.8040);
      expect(address).toContain("Upper Hill");
      expect(address).toContain("Bishops Road");
    });

    it("should return 'Karen, Karen Road' for Karen coordinates", async () => {
      const address = await reverseGeocode(-1.3450, 36.7600);
      expect(address).toContain("Karen");
      expect(address).toContain("Karen Road");
    });

    it("should return 'Kilimani, Kilimani Road' for Kilimani coordinates", async () => {
      const address = await reverseGeocode(-1.3050, 36.7850);
      expect(address).toContain("Kilimani");
      expect(address).toContain("Kilimani Road");
    });
  });

  describe("Coastal Locations", () => {
    it("should return 'Mombasa, Nkrumah Road' for Mombasa coordinates", async () => {
      const address = await reverseGeocode(-4.0435, 39.6682);
      expect(address).toContain("Mombasa");
      expect(address).toContain("Nkrumah Road");
    });

    it("should return 'Mombasa Port Authority' for Mombasa Port coordinates", async () => {
      const address = await reverseGeocode(-4.0600, 39.6620);
      expect(address).toContain("Mombasa Port Authority");
    });
  });

  describe("Western Kenya Locations", () => {
    it("should return 'Kisumu, Oginga Odinga Street' for Kisumu coordinates", async () => {
      const address = await reverseGeocode(-0.1022, 34.7617);
      expect(address).toContain("Kisumu");
      expect(address).toContain("Oginga Odinga Street");
    });

    it("should return 'Homa Bay Town' for Homa Bay coordinates", async () => {
      const address = await reverseGeocode(-0.4825, 34.4650);
      expect(address).toContain("Homa Bay");
    });
  });

  describe("Other Major Towns", () => {
    it("should return 'Nakuru, Kenyatta Avenue' for Nakuru coordinates", async () => {
      const address = await reverseGeocode(-0.3015, 36.0706);
      expect(address).toContain("Nakuru");
      expect(address).toContain("Kenyatta Avenue");
    });

    it("should return 'Eldoret, Uganda Road' for Eldoret coordinates", async () => {
      const address = await reverseGeocode(0.5175, 35.2750);
      expect(address).toContain("Eldoret");
      expect(address).toContain("Uganda Road");
    });
  });

  describe("Address Format Validation", () => {
    it("should NOT return vague regions like 'South Nairobi'", async () => {
      const address = await reverseGeocode(-1.2841, 36.8155);
      expect(address).not.toContain("South Nairobi");
      expect(address).not.toContain("North Nairobi");
      expect(address).not.toContain("Central Nairobi");
      expect(address).not.toContain("East Nairobi");
      expect(address).not.toContain("West Nairobi");
    });

    it("should return specific building/street names", async () => {
      const address = await reverseGeocode(-1.2841, 36.8155);
      // Should have specific location info
      expect(address.length).toBeGreaterThan(10);
      // Should contain comma separating city and street
      expect(address).toContain(",");
    });

    it("should distinguish between Nairobi and Mombasa", async () => {
      const nairobi = await reverseGeocode(-1.2841, 36.8155);
      const mombasa = await reverseGeocode(-4.0435, 39.6682);
      
      expect(nairobi).toContain("Nairobi");
      expect(mombasa).toContain("Mombasa");
      expect(nairobi).not.toContain("Mombasa");
      expect(mombasa).not.toContain("Nairobi");
    });

    it("should distinguish between Kisumu and Homa Bay", async () => {
      const kisumu = await reverseGeocode(-0.1022, 34.7617);
      const homaBay = await reverseGeocode(-0.4825, 34.4650);
      
      expect(kisumu).toContain("Kisumu");
      expect(homaBay).toContain("Homa Bay");
      expect(kisumu).not.toContain("Homa Bay");
      expect(homaBay).not.toContain("Kisumu");
    });
  });

  describe("GPS Map Display Accuracy", () => {
    it("should provide human-readable addresses for GPS map markers", async () => {
      const testLocations = [
        { lat: -1.2841, lng: 36.8155, expectedCity: "Nairobi" },
        { lat: -4.0435, lng: 39.6682, expectedCity: "Mombasa" },
        { lat: -0.1022, lng: 34.7617, expectedCity: "Kisumu" },
        { lat: -0.4825, lng: 34.4650, expectedCity: "Homa Bay" },
      ];

      for (const location of testLocations) {
        const address = await reverseGeocode(location.lat, location.lng);
        expect(address).toContain(location.expectedCity);
        expect(address).not.toMatch(/^-?\d+\.\d+,\s*-?\d+\.\d+$/); // Should not be just coordinates
      }
    });

    it("should include street/building names in addresses", async () => {
      const testLocations = [
        { lat: -1.2841, lng: 36.8155, expectedStreet: "Tom Mboya" },
        { lat: -4.0435, lng: 39.6682, expectedStreet: "Nkrumah" },
        { lat: -0.1022, lng: 34.7617, expectedStreet: "Oginga" },
      ];

      for (const location of testLocations) {
        const address = await reverseGeocode(location.lat, location.lng);
        expect(address).toContain(location.expectedStreet);
      }
    });
  });

  describe("Edge Cases", () => {
    it("should handle coordinates at boundary of known locations", async () => {
      // Boundary of Nairobi CBD
      const address = await reverseGeocode(-1.2900, 36.8280);
      expect(address).toBeDefined();
      expect(address.length).toBeGreaterThan(0);
    });

    it("should handle coordinates outside known locations", async () => {
      // Random location in Kenya
      const address = await reverseGeocode(-2.5, 37.5);
      expect(address).toBeDefined();
      expect(address.length).toBeGreaterThan(0);
      // Should still provide some location info
      expect(address).toContain("Kenya");
    });

    it("should handle very precise coordinates (8 decimal places)", async () => {
      const address = await reverseGeocode(-1.28410000, 36.81550000);
      expect(address).toBeDefined();
      expect(address).toContain("Nairobi");
    });
  });
});
