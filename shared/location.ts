export function formatCoordinates(latitude?: number | string | null, longitude?: number | string | null): string {
  if (latitude == null || longitude == null || latitude === "" || longitude === "") return "N/A";
  const lat = Number(latitude);
  const lng = Number(longitude);
  return Number.isFinite(lat) && Number.isFinite(lng) ? `${lat.toFixed(6)}, ${lng.toFixed(6)}` : "N/A";
}

export function shouldRetryGpsCapture(hasError: boolean, accuracy?: number | null): boolean {
  return hasError || (accuracy != null && Number.isFinite(accuracy) && accuracy > 1000);
}
