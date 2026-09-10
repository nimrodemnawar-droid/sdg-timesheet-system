export const PRACTICAL_GPS_ACCURACY_METERS = 1000;

export function isPracticalGpsAccuracy(accuracy: number): boolean {
  return Number.isFinite(accuracy) && accuracy >= 0 && accuracy <= PRACTICAL_GPS_ACCURACY_METERS;
}

export function isBetterGpsAccuracy(candidate: number, currentBest: number): boolean {
  return Number.isFinite(candidate) && candidate >= 0 && candidate < currentBest;
}
