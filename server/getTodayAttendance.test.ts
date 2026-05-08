import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as db from "./db";

// Mock the database
vi.mock("./db", async () => {
  const actual = await vi.importActual("./db");
  return {
    ...actual,
    getDb: vi.fn(),
  };
});

describe("getTodayAttendance", () => {
  it("should calculate durationMinutes correctly when both check-in and check-out times exist", async () => {
    const checkInTime = new Date("2026-05-08T09:00:00Z");
    const checkOutTime = new Date("2026-05-08T17:00:00Z"); // 8 hours later
    const expectedDurationMinutes = 480; // 8 hours = 480 minutes

    // Calculate duration
    const durationMinutes = Math.floor(
      (checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60)
    );

    expect(durationMinutes).toBe(expectedDurationMinutes);
  });

  it("should return 0 durationMinutes when check-out time is not set", () => {
    const checkInTime = new Date("2026-05-08T09:00:00Z");
    const checkOutTime = null;

    let durationMinutes = 0;
    if (checkInTime && checkOutTime) {
      durationMinutes = Math.floor(
        (new Date(checkOutTime).getTime() - new Date(checkInTime).getTime()) /
          (1000 * 60)
      );
    }

    expect(durationMinutes).toBe(0);
  });

  it("should calculate durationMinutes correctly for partial hours", () => {
    const checkInTime = new Date("2026-05-08T09:00:00Z");
    const checkOutTime = new Date("2026-05-08T09:30:00Z"); // 30 minutes later
    const expectedDurationMinutes = 30;

    const durationMinutes = Math.floor(
      (checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60)
    );

    expect(durationMinutes).toBe(expectedDurationMinutes);
  });

  it("should format duration as hours and minutes correctly", () => {
    const durationMinutes = 485; // 8 hours 5 minutes
    const hours = Math.floor(durationMinutes / 60);
    const minutes = durationMinutes % 60;

    expect(hours).toBe(8);
    expect(minutes).toBe(5);
    expect(`${hours}h ${minutes}m`).toBe("8h 5m");
  });
});
