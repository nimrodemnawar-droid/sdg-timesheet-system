export function formatCoordinates(latitude?: number | string | null, longitude?: number | string | null): string {
  if (latitude == null || longitude == null || latitude === "" || longitude === "") return "N/A";
  const lat = Number(latitude);
  const lng = Number(longitude);
  return Number.isFinite(lat) && Number.isFinite(lng) ? `${lat.toFixed(6)}, ${lng.toFixed(6)}` : "N/A";
}
