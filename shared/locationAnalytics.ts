export interface LocationPoint {
  latitude: number | string | null | undefined;
  longitude: number | string | null | undefined;
  staffId?: number | string | null;
  accuracy?: number | string | null;
}

export interface LocationHeatmapCell {
  key: string;
  latitude: number;
  longitude: number;
  count: number;
  intensity: number;
}

export function summarizeLocationPoints(points: LocationPoint[], gridSize = 8) {
  const valid = points.flatMap((point) => {
    const latitude = Number(point.latitude);
    const longitude = Number(point.longitude);
    const hasCoordinates = point.latitude !== null && point.latitude !== undefined && point.longitude !== null && point.longitude !== undefined;
    return hasCoordinates && Number.isFinite(latitude) && Number.isFinite(longitude) ? [{ ...point, latitude, longitude }] : [];
  });
  const staff = new Set(valid.map((point) => String(point.staffId ?? "unknown")));
  const accuracies = valid.map((point) => Number(point.accuracy)).filter(Number.isFinite);
  if (!valid.length) return { validPoints: 0, uniqueStaff: 0, averageAccuracy: null, cells: [] as LocationHeatmapCell[] };
  const minLat = Math.min(...valid.map((point) => point.latitude));
  const maxLat = Math.max(...valid.map((point) => point.latitude));
  const minLng = Math.min(...valid.map((point) => point.longitude));
  const maxLng = Math.max(...valid.map((point) => point.longitude));
  const latSpan = Math.max(maxLat - minLat, 0.000001);
  const lngSpan = Math.max(maxLng - minLng, 0.000001);
  const buckets = new Map<string, { key: string; latitude: number; longitude: number; count: number }>();
  for (const point of valid) {
    const row = Math.min(gridSize - 1, Math.floor(((point.latitude - minLat) / latSpan) * gridSize));
    const column = Math.min(gridSize - 1, Math.floor(((point.longitude - minLng) / lngSpan) * gridSize));
    const key = `${row}:${column}`;
    const existing = buckets.get(key);
    if (existing) existing.count += 1;
    else buckets.set(key, { key, latitude: row, longitude: column, count: 1 });
  }
  const maxCount = Math.max(...Array.from(buckets.values(), (cell) => cell.count));
  return {
    validPoints: valid.length,
    uniqueStaff: staff.size,
    averageAccuracy: accuracies.length ? Math.round((accuracies.reduce((sum, value) => sum + value, 0) / accuracies.length) * 10) / 10 : null,
    cells: Array.from(buckets.values()).map((cell) => ({ ...cell, intensity: cell.count / maxCount })),
  };
}
