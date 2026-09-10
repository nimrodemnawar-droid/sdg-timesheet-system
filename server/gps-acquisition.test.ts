import { describe, expect, it } from "vitest";
import {
  PRACTICAL_GPS_ACCURACY_METERS,
  isBetterGpsAccuracy,
  isPracticalGpsAccuracy,
} from "../shared/gpsAcquisition";

describe("resilient GPS acquisition", () => {
  it("accepts usable accuracy without requiring sub-50-metre precision", () => {
    expect(isPracticalGpsAccuracy(50)).toBe(true);
    expect(isPracticalGpsAccuracy(850)).toBe(true);
    expect(isPracticalGpsAccuracy(PRACTICAL_GPS_ACCURACY_METERS)).toBe(true);
  });

  it("keeps very poor or invalid accuracy out of the practical fast path", () => {
    expect(isPracticalGpsAccuracy(1000.01)).toBe(false);
    expect(isPracticalGpsAccuracy(-1)).toBe(false);
    expect(isPracticalGpsAccuracy(Number.NaN)).toBe(false);
  });

  it("retains only a more accurate position as the best available result", () => {
    expect(isBetterGpsAccuracy(900, Infinity)).toBe(true);
    expect(isBetterGpsAccuracy(450, 900)).toBe(true);
    expect(isBetterGpsAccuracy(900, 450)).toBe(false);
  });
});
