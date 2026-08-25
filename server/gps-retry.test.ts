import { describe, expect, it } from "vitest";
import { shouldRetryGpsCapture } from "../shared/location";

describe("GPS retry guidance", () => {
  it("offers retry when coordinate acquisition reports an error", () => {
    expect(shouldRetryGpsCapture(true, undefined)).toBe(true);
  });

  it("offers retry for poor accuracy above 1000 metres", () => {
    expect(shouldRetryGpsCapture(false, 2000)).toBe(true);
    expect(shouldRetryGpsCapture(false, 1000)).toBe(false);
  });

  it("does not offer an accuracy retry for a good fix", () => {
    expect(shouldRetryGpsCapture(false, 45)).toBe(false);
    expect(shouldRetryGpsCapture(false, null)).toBe(false);
  });
});
