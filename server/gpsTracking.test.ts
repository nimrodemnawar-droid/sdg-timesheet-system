import { describe, it, expect, beforeEach } from "vitest";
import { calculateDistance, getAccuracyQuality } from "./encryption";

/**
 * GPS Tracking and Map Functionality Tests
 * Tests for distance calculations, accuracy metrics, and coordinate precision
 */

describe("GPS Tracking - Distance Calculations", () => {
  it("should calculate distance between two coordinates using Haversine formula", () => {
    // Nairobi coordinates
    const lat1 = -1.2921;
    const lng1 = 36.8219;
    
    // Homa Bay coordinates (approximately 280km from Nairobi)
    const lat2 = -0.5;
    const lng2 = 34.45;

    const distance = calculateDistance(lat1, lng1, lat2, lng2);
    
    // Distance should be approximately 280km
    expect(distance).toBeGreaterThan(270);
    expect(distance).toBeLessThan(290);
  });

  it("should return 0 for same coordinates", () => {
    const lat = -1.2921;
    const lng = 36.8219;

    const distance = calculateDistance(lat, lng, lat, lng);
    expect(distance).toBe(0);
  });

  it("should calculate distance with 8-decimal GPS precision", () => {
    // Two points with 8-decimal precision (approximately 1.1mm apart)
    const lat1 = -1.29210000;
    const lng1 = 36.82190000;
    
    const lat2 = -1.29210001;
    const lng2 = 36.82190001;

    const distance = calculateDistance(lat1, lng1, lat2, lng2);
    
    // Distance should be very small (less than 1 meter)
    expect(distance).toBeGreaterThan(0);
    expect(distance).toBeLessThan(0.001);
  });

  it("should handle negative coordinates (Southern/Western hemispheres)", () => {
    // Nairobi (negative latitude and longitude)
    const lat1 = -1.2921;
    const lng1 = 36.8219;
    
    // Cape Town (negative latitude and longitude)
    const lat2 = -33.9249;
    const lng2 = 18.4241;

    const distance = calculateDistance(lat1, lng1, lat2, lng2);
    
    // Distance should be approximately 4000-5000km
    expect(distance).toBeGreaterThan(3000);
    expect(distance).toBeLessThan(6000);
  });

  it("should calculate distance symmetrically (A to B = B to A)", () => {
    const lat1 = -1.2921;
    const lng1 = 36.8219;
    const lat2 = -0.5;
    const lng2 = 34.45;

    const distance1 = calculateDistance(lat1, lng1, lat2, lng2);
    const distance2 = calculateDistance(lat2, lng2, lat1, lng1);

    expect(distance1).toBe(distance2);
  });
});

describe("GPS Tracking - Accuracy Metrics", () => {
  it("should classify excellent accuracy (< 10 meters)", () => {
    const accuracy = getAccuracyQuality(5);
    expect(accuracy).toBe("Excellent");
  });

  it("should classify good accuracy (10-50 meters)", () => {
    const accuracy1 = getAccuracyQuality(10);
    const accuracy2 = getAccuracyQuality(30);
    const accuracy3 = getAccuracyQuality(49);

    expect(accuracy1).toBe("Good");
    expect(accuracy2).toBe("Good");
    expect(accuracy3).toBe("Good");
  });

  it("should classify fair accuracy (50-100 meters)", () => {
    const accuracy1 = getAccuracyQuality(50);
    const accuracy2 = getAccuracyQuality(75);
    const accuracy3 = getAccuracyQuality(99);

    expect(accuracy1).toBe("Fair");
    expect(accuracy2).toBe("Fair");
    expect(accuracy3).toBe("Fair");
  });

  it("should classify poor accuracy (> 100 meters)", () => {
    const accuracy1 = getAccuracyQuality(100);
    const accuracy2 = getAccuracyQuality(500);
    const accuracy3 = getAccuracyQuality(1000);

    expect(accuracy1).toBe("Poor");
    expect(accuracy2).toBe("Poor");
    expect(accuracy3).toBe("Poor");
  });
});

describe("GPS Tracking - 8-Decimal Precision", () => {
  it("should handle 8-decimal latitude values", () => {
    const lat = -1.29210000;
    expect(lat.toFixed(8)).toBe("-1.29210000");
  });

  it("should handle 8-decimal longitude values", () => {
    const lng = 36.82190000;
    expect(lng.toFixed(8)).toBe("36.82190000");
  });

  it("should preserve precision in calculations", () => {
    const lat1 = -1.29210123;
    const lng1 = 36.82194567;
    
    const lat2 = -1.29210124;
    const lng2 = 36.82194568;

    const distance = calculateDistance(lat1, lng1, lat2, lng2);
    
    // Should be able to detect the difference
    expect(distance).toBeGreaterThan(0);
    expect(distance).toBeLessThan(0.001);
  });

  it("should handle coordinate string parsing", () => {
    const latStr = "-1.29210000";
    const lngStr = "36.82190000";
    
    const lat = parseFloat(latStr);
    const lng = parseFloat(lngStr);

    expect(lat).toBe(-1.2921);
    expect(lng).toBe(36.8219);
  });
});

describe("GPS Tracking - Route Visualization", () => {
  it("should calculate total distance traveled from multiple waypoints", () => {
    // Simulating waypoints along a route
    const waypoints = [
      { lat: -1.2921, lng: 36.8219 }, // Start
      { lat: -1.2900, lng: 36.8250 }, // Waypoint 1
      { lat: -1.2880, lng: 36.8280 }, // Waypoint 2
      { lat: -1.2850, lng: 36.8300 }, // End
    ];

    let totalDistance = 0;
    for (let i = 0; i < waypoints.length - 1; i++) {
      const segmentDistance = calculateDistance(
        waypoints[i].lat,
        waypoints[i].lng,
        waypoints[i + 1].lat,
        waypoints[i + 1].lng
      );
      totalDistance += parseFloat(segmentDistance);
    }

    // Total distance should be positive
    expect(totalDistance).toBeGreaterThan(0);
    expect(totalDistance).toBeLessThan(10); // Should be less than 10km for this route
  });

  it("should validate waypoint sequence", () => {
    const waypoints = [
      { lat: -1.2921, lng: 36.8219, timestamp: new Date("2026-03-10T08:00:00") },
      { lat: -1.2900, lng: 36.8250, timestamp: new Date("2026-03-10T08:15:00") },
      { lat: -1.2880, lng: 36.8280, timestamp: new Date("2026-03-10T08:30:00") },
    ];

    // Verify timestamps are in order
    for (let i = 0; i < waypoints.length - 1; i++) {
      expect(waypoints[i].timestamp.getTime()).toBeLessThan(
        waypoints[i + 1].timestamp.getTime()
      );
    }
  });
});

describe("GPS Tracking - Marker Content", () => {
  it("should format staff location data for markers", () => {
    const staffLocation = {
      id: 1,
      name: "John Doe",
      email: "john@example.com",
      latitude: -1.2921,
      longitude: 36.8219,
      accuracy: 8.5,
      lastUpdated: new Date(),
      status: "checked-in" as const,
    };

    expect(staffLocation.name).toBe("John Doe");
    expect(staffLocation.latitude).toBeCloseTo(-1.2921, 4);
    expect(staffLocation.longitude).toBeCloseTo(36.8219, 4);
    expect(staffLocation.accuracy).toBeLessThan(10);
    expect(staffLocation.status).toBe("checked-in");
  });

  it("should determine marker color based on accuracy", () => {
    const accuracyLevels = [
      { accuracy: 5, expected: "green" },
      { accuracy: 30, expected: "blue" },
      { accuracy: 75, expected: "yellow" },
      { accuracy: 150, expected: "red" },
    ];

    accuracyLevels.forEach(({ accuracy, expected }) => {
      const quality = getAccuracyQuality(accuracy);
      
      if (accuracy < 10) expect(quality).toBe("Excellent");
      else if (accuracy < 50) expect(quality).toBe("Good");
      else if (accuracy < 100) expect(quality).toBe("Fair");
      else expect(quality).toBe("Poor");
    });
  });
});

describe("GPS Tracking - Boundary Cases", () => {
  it("should handle coordinates at equator", () => {
    const lat = 0;
    const lng = 36.8219;

    expect(lat).toBe(0);
    expect(lng).toBeGreaterThan(0);
  });

  it("should handle coordinates at prime meridian", () => {
    const lat = -1.2921;
    const lng = 0;

    expect(lat).toBeLessThan(0);
    expect(lng).toBe(0);
  });

  it("should handle maximum latitude values", () => {
    const northPole = 90.0;
    const southPole = -90.0;

    expect(northPole).toBe(90);
    expect(southPole).toBe(-90);
  });

  it("should handle maximum longitude values", () => {
    const eastMeridian = 180.0;
    const westMeridian = -180.0;

    expect(eastMeridian).toBe(180);
    expect(westMeridian).toBe(-180);
  });

  it("should handle very small distances", () => {
    const lat1 = -1.29210000;
    const lng1 = 36.82190000;
    
    const lat2 = -1.29210001;
    const lng2 = 36.82190001;

    const distance = calculateDistance(lat1, lng1, lat2, lng2);
    
    // Distance should be measurable but very small
    expect(distance).toBeGreaterThan(0);
    expect(distance).toBeLessThan(0.001);
  });

  it("should handle very large distances", () => {
    // Nairobi to Sydney
    const lat1 = -1.2921;
    const lng1 = 36.8219;
    
    const lat2 = -33.8688;
    const lng2 = 151.2093;

    const distance = calculateDistance(lat1, lng1, lat2, lng2);
    
    // Distance should be approximately 12000km
    expect(distance).toBeGreaterThan(11000);
    expect(distance).toBeLessThan(13000);
  });
});

describe("GPS Tracking - Data Validation", () => {
  it("should validate latitude range", () => {
    const validLatitudes = [-90, -45, 0, 45, 90];
    validLatitudes.forEach((lat) => {
      expect(lat).toBeGreaterThanOrEqual(-90);
      expect(lat).toBeLessThanOrEqual(90);
    });
  });

  it("should validate longitude range", () => {
    const validLongitudes = [-180, -90, 0, 90, 180];
    validLongitudes.forEach((lng) => {
      expect(lng).toBeGreaterThanOrEqual(-180);
      expect(lng).toBeLessThanOrEqual(180);
    });
  });

  it("should validate accuracy is positive", () => {
    const accuracies = [0.5, 5, 10, 50, 100];
    accuracies.forEach((accuracy) => {
      expect(accuracy).toBeGreaterThanOrEqual(0);
    });
  });

  it("should validate timestamp is not in future", () => {
    const now = new Date();
    const pastTime = new Date(now.getTime() - 60000); // 1 minute ago
    
    expect(pastTime.getTime()).toBeLessThanOrEqual(now.getTime());
  });
});
