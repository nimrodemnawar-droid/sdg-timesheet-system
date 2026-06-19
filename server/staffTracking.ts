import { and, eq, gte, lt } from "drizzle-orm";
import { attendance, users } from "../drizzle/schema";
import { getDb } from "./db";

/**
 * Generate daily staff number (001-100) based on check-in order
 * Staff who check in first gets 001, second gets 002, etc.
 */
export async function generateDailyStaffNumber(userId: number): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Count how many staff have checked in today
  const todayCheckIns = await db
    .select()
    .from(attendance)
    .where(
      and(
        gte(attendance.checkInTime, today),
        lt(attendance.checkInTime, tomorrow)
      )
    )
    .orderBy(attendance.checkInTime);

  const nextNumber = todayCheckIns.length + 1;
  if (nextNumber > 100) {
    throw new Error("Maximum 100 staff can check in per day");
  }

  return String(nextNumber).padStart(3, "0");
}

/**
 * Check if staff has already checked in today
 */
export async function hasCheckedInToday(userId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const todayRecord = await db
    .select()
    .from(attendance)
    .where(
      and(
        eq(attendance.userId, userId),
        gte(attendance.checkInTime, today),
        lt(attendance.checkInTime, tomorrow),
        eq(attendance.hasCheckedInToday, true)
      )
    )
    .limit(1);

  return todayRecord.length > 0;
}

/**
 * Check if staff has already checked out today
 */
export async function hasCheckedOutToday(userId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const todayRecord = await db
    .select()
    .from(attendance)
    .where(
      and(
        eq(attendance.userId, userId),
        gte(attendance.checkInTime, today),
        lt(attendance.checkInTime, tomorrow),
        eq(attendance.hasCheckedOutToday, true)
      )
    )
    .limit(1);

  return todayRecord.length > 0;
}

/**
 * Get today's attendance record for a staff member
 */
export async function getTodayAttendance(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const record = await db
    .select()
    .from(attendance)
    .where(
      and(
        eq(attendance.userId, userId),
        gte(attendance.checkInTime, today),
        lt(attendance.checkInTime, tomorrow)
      )
    )
    .limit(1);

  return record[0] || null;
}

/**
 * Get all staff who checked in today with their current locations
 */
export async function getAllStaffCheckedInToday() {
  const db = await getDb();
  if (!db) return [];

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const records = await db
    .select()
    .from(attendance)
    .where(
      and(
        gte(attendance.checkInTime, today),
        lt(attendance.checkInTime, tomorrow),
        eq(attendance.hasCheckedInToday, true)
      )
    )
    .orderBy(attendance.checkInTime);

  return records;
}

/**
 * Get attendance records for a staff member within a date range
 */
export async function getAttendanceRange(
  userId: number,
  startDate: Date,
  endDate: Date
) {
  const db = await getDb();
  if (!db) return [];

  if (userId === 0) {
    // Admin requesting all staff
    return await db
      .select()
      .from(attendance)
      .where(
        and(
          gte(attendance.checkInTime, startDate),
          lt(attendance.checkInTime, endDate)
        )
      )
      .orderBy(attendance.checkInTime);
  }

  // Staff requesting their own records
  return await db
    .select()
    .from(attendance)
    .where(
      and(
        eq(attendance.userId, userId),
        gte(attendance.checkInTime, startDate),
        lt(attendance.checkInTime, endDate)
      )
    )
    .orderBy(attendance.checkInTime);
}

/**
 * Get complete timesheet data for export
 */
export async function getCompleteTimesheetData(
  startDate: Date,
  endDate: Date
) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(attendance)
    .where(
      and(
        gte(attendance.checkInTime, startDate),
        lt(attendance.checkInTime, endDate)
      )
    )
    .orderBy(attendance.checkInTime);
}

/**
 * Reverse geocode GPS coordinates to get address name
 * Returns specific building/street names instead of vague regions
 */
export async function reverseGeocode(
  latitude: number,
  longitude: number
): Promise<string> {
  try {
    // Kenya area common locations with specific building/street names
    const commonLocations: Record<string, { lat: [number, number], lng: [number, number], name: string }> = {
      // Nairobi CBD - Tom Mboya Street area (narrower range to prevent mismatches)
      cbd_tom_mboya: {
        lat: [-1.290, -1.280],
        lng: [36.815, 36.830],
        name: "Nairobi CBD, Tom Mboya Street"
      },
      // Nairobi Westlands - Westlands Avenue (expanded range)
      westlands_ave: {
        lat: [-1.270, -1.250],
        lng: [36.795, 36.825],
        name: "Westlands, Westlands Avenue"
      },
      // Nairobi Upper Hill - Bishops Road (expanded range)
      upper_hill_bishops: {
        lat: [-1.310, -1.280],
        lng: [36.790, 36.820],
        name: "Upper Hill, Bishops Road"
      },
      // Nairobi Karen - Karen Road (expanded range)
      karen_road: {
        lat: [-1.360, -1.330],
        lng: [36.740, 36.780],
        name: "Karen, Karen Road"
      },
      // Nairobi Kilimani - Kilimani Road (expanded range)
      kilimani_road: {
        lat: [-1.320, -1.290],
        lng: [36.770, 36.800],
        name: "Kilimani, Kilimani Road"
      },
      // Mombasa - Nkrumah Road (expanded range)
      mombasa_nkrumah: {
        lat: [-4.055, -4.030],
        lng: [39.660, 39.680],
        name: "Mombasa, Nkrumah Road"
      },
      // Mombasa - Port Authority (specific range to avoid overlap with Nkrumah)
      mombasa_port: {
        lat: [-4.065, -4.055],
        lng: [39.655, 39.670],
        name: "Mombasa Port Authority"
      },
      // Kisumu - Oginga Odinga Street (expanded range)
      kisumu_oginga: {
        lat: [-0.115, -0.090],
        lng: [34.755, 34.775],
        name: "Kisumu, Oginga Odinga Street"
      },
      // Homa Bay - Homa Bay Town (expanded range)
      homa_bay_town: {
        lat: [-0.495, -0.470],
        lng: [34.455, 34.475],
        name: "Homa Bay Town"
      },
      // Nakuru - Kenyatta Avenue (expanded range)
      nakuru_kenyatta: {
        lat: [-0.310, -0.290],
        lng: [36.060, 36.080],
        name: "Nakuru, Kenyatta Avenue"
      },
      // Eldoret - Uganda Road (expanded range)
      eldoret_uganda: {
        lat: [0.510, 0.530],
        lng: [35.265, 35.285],
        name: "Eldoret, Uganda Road"
      }
    };

    // Check if coordinates match any common location
    for (const [key, location] of Object.entries(commonLocations)) {
      const latMatch = latitude >= location.lat[0] && latitude <= location.lat[1];
      const lngMatch = longitude >= location.lng[0] && longitude <= location.lng[1];
      
      if (latMatch && lngMatch) {
        console.log(`[Geocoding] Matched location: ${location.name}`);
        return location.name;
      }
    }

    // Try to use Manus API as backup for more precise geocoding
    const FORGE_BASE_URL = process.env.BUILT_IN_FORGE_API_URL;
    const API_KEY = process.env.BUILT_IN_FORGE_API_KEY;
    
    if (FORGE_BASE_URL && API_KEY) {
      try {
        const response = await fetch(`${FORGE_BASE_URL}/v1/maps/geocode`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_KEY}`,
          },
          body: JSON.stringify({
            latitude,
            longitude,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.address) return data.address;
          if (data.results && data.results.length > 0) {
            return data.results[0].formatted_address || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
          }
        }
      } catch (apiError) {
        console.warn('[Geocoding] API call failed, using fallback');
      }
    }

    // Final fallback: return coordinates with more specific region information
    let region = "Kenya";
    if (latitude < -3.5) {
      region = "Southern Kenya (Coast Region)";
    } else if (latitude < -0.5) {
      region = "Central Kenya";
    } else if (latitude < 0.5) {
      region = "Western Kenya";
    } else {
      region = "Northern Kenya";
    }
    
    // Try to provide more specific location based on coordinates
    if (latitude >= -1.3 && latitude <= -1.25 && longitude >= 36.8 && longitude <= 36.85) {
      return `Nairobi Central Business District (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`;
    } else if (latitude >= -1.27 && latitude <= -1.25 && longitude >= 36.8 && longitude <= 36.82) {
      return `Nairobi Westlands (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`;
    } else if (latitude >= -4.05 && latitude <= -4.03 && longitude >= 39.66 && longitude <= 39.68) {
      return `Mombasa (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`;
    } else if (latitude >= -0.11 && latitude <= -0.09 && longitude >= 34.76 && longitude <= 34.77) {
      return `Kisumu (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`;
    } else if (latitude >= -0.49 && latitude <= -0.47 && longitude >= 34.46 && longitude <= 34.48) {
      return `Homa Bay (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`;
    }
    
    return `${region} (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`;
  } catch (error) {
    console.error('[Geocoding] Error reverse geocoding:', error);
    return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
  }
}

/**
 * Calculate distance between two GPS coordinates (Haversine formula)
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
