export interface WaypointFilterInput {
  date?: string;
  staffName?: string;
}

export interface WaypointRecordLike {
  timestamp: Date | string;
  staffName?: string | null;
  staffId?: number | null;
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
