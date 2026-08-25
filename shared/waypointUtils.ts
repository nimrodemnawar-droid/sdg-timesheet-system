export interface WaypointFilterInput {
  date?: string;
  staffName?: string;
}

export const WAYPOINT_REFRESH_INTERVAL_MS = 5000;

export interface WaypointRecordLike {
  timestamp: Date | string;
  staffName?: string | null;
  staffId?: number | null;
  latitude?: number | null;
  longitude?: number | null;
}

export interface WaypointPopupDetails {
  staffName: string;
  staffNumber: string;
  timestamp: string;
  location: string;
}

export function formatWaypointPopupDetails(
  record: WaypointRecordLike & { staffNumber?: string | number | null },
): WaypointPopupDetails {
  const latitude = record.latitude;
  const longitude = record.longitude;
  const location = latitude != null && longitude != null
    ? `${Number(latitude).toFixed(6)}, ${Number(longitude).toFixed(6)}`
    : "GPS unavailable";

  return {
    staffName: record.staffName || `Staff ${record.staffId ?? ""}`,
    staffNumber: record.staffNumber != null ? String(record.staffNumber) : "—",
    timestamp: new Date(record.timestamp).toLocaleString("en-KE", { timeZone: "Africa/Nairobi" }),
    location,
  };
}

export function filterWaypointRecords<T extends WaypointRecordLike>(
  records: T[],
  filters: WaypointFilterInput = {},
): T[] {
  let filtered = records;

  if (filters.date) {
    filtered = filtered.filter((record) => (
      new Date(record.timestamp).toISOString().split('T')[0] === filters.date
    ));
  }

  const search = filters.staffName?.trim().toLowerCase();
  if (search) {
    filtered = filtered.filter((record) => (
      (record.staffName || `Staff ${record.staffId ?? ''}`).toLowerCase().includes(search)
    ));
  }

  return filtered;
}
