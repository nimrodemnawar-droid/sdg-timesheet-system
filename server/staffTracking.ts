import { eq, and, gte, lt, desc } from "drizzle-orm";
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
    .orderBy(desc(attendance.checkInTime))
    .limit(1);

  return record[0] || null;
}

/**
 * Get all today's check-ins ordered by time (for daily numbering)
 */
export async function getTodayCheckIns() {
  const db = await getDb();
  if (!db) return [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return await db
    .select({
      id: attendance.id,
      userId: attendance.userId,
      dailyStaffNumber: attendance.dailyStaffNumber,
      checkInTime: attendance.checkInTime,
      checkInLat: attendance.checkInLat,
      checkInLng: attendance.checkInLng,
      checkInAddress: attendance.checkInAddress,
      checkInAccuracy: attendance.checkInAccuracy,
      userName: users.name,
      userEmail: users.email,
      userDepartment: users.department,
    })
    .from(attendance)
    .innerJoin(users, eq(attendance.userId, users.id))
    .where(
      and(
        gte(attendance.checkInTime, today),
        lt(attendance.checkInTime, tomorrow),
        eq(attendance.hasCheckedInToday, true)
      )
    )
    .orderBy(attendance.checkInTime);
}

/**
 * Get all today's check-outs with locations
 */
export async function getTodayCheckOuts() {
  const db = await getDb();
  if (!db) return [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return await db
    .select({
      id: attendance.id,
      userId: attendance.userId,
      dailyStaffNumber: attendance.dailyStaffNumber,
      checkInTime: attendance.checkInTime,
      checkOutTime: attendance.checkOutTime,
      checkInLat: attendance.checkInLat,
      checkInLng: attendance.checkInLng,
      checkInAddress: attendance.checkInAddress,
      checkOutLat: attendance.checkOutLat,
      checkOutLng: attendance.checkOutLng,
      checkOutAddress: attendance.checkOutAddress,
      distanceTraveled: attendance.distanceTraveled,
      durationMinutes: attendance.durationMinutes,
      userName: users.name,
      userEmail: users.email,
      userDepartment: users.department,
    })
    .from(attendance)
    .innerJoin(users, eq(attendance.userId, users.id))
    .where(
      and(
        gte(attendance.checkInTime, today),
        lt(attendance.checkInTime, tomorrow),
        eq(attendance.hasCheckedOutToday, true)
      )
    )
    .orderBy(attendance.checkInTime);
}

/**
 * Reverse geocode coordinates to get human-readable address
 * Uses Google Maps Geocoding API via Manus proxy
 */
export async function reverseGeocode(
  latitude: number,
  longitude: number
): Promise<string> {
  try {
    // Nairobi area common locations (fallback database)
    const commonLocations: Record<string, { lat: [number, number], lng: [number, number], name: string }> = {
      nairobi_office: {
        lat: [-1.286389, -1.286389],
        lng: [36.817223, 36.817223],
        name: "Nairobi Office"
      },
      westlands: {
        lat: [-1.2641, -1.2500],
        lng: [36.8000, 36.8200],
        name: "Westlands, Nairobi"
      },
      cbd: {
        lat: [-1.2921, -1.2800],
        lng: [36.8219, 36.8400],
        name: "Central Business District, Nairobi"
      },
      karen: {
        lat: [-1.3521, -1.3400],
        lng: [36.7500, 36.7700],
        name: "Karen, Nairobi"
      },
      upper_hill: {
        lat: [-1.3000, -1.2900],
        lng: [36.8000, 36.8100],
        name: "Upper Hill, Nairobi"
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

    // Try to use Manus API as backup
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

    // Final fallback: return coordinates with general location
    const generalLocation = latitude < -1.25 ? "South Nairobi" : latitude > -1.25 ? "North Nairobi" : "Central Nairobi";
    return `${generalLocation} (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`;
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

/**
 * Get staff attendance summary for a date range
 */
export async function getAttendanceSummary(startDate: Date, endDate: Date) {
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
    );
}
