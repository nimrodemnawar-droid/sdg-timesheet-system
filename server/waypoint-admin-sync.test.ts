import { describe, expect, it } from "vitest";
import {
  WAYPOINT_REFRESH_INTERVAL_MS,
  formatWaypointPopupDetails,
} from "../shared/waypointUtils";

describe("Admin waypoint map contract", () => {
  it("exposes staff name, staff number, Nairobi time, and GPS location for a popup", () => {
    const details = formatWaypointPopupDetails({
      staffName: "Amina Otieno",
      staffNumber: "007",
      staffId: 7,
      timestamp: "2026-08-25T12:00:00.000Z",
      latitude: -1.286389,
      longitude: 36.817223,
    });

    expect(details.staffName).toBe("Amina Otieno");
    expect(details.staffNumber).toBe("007");
    expect(details.timestamp).toContain("2026");
    expect(details.location).toBe("-1.286389, 36.817223");
  });

  it("uses a safe fallback for missing GPS while keeping identity details", () => {
    expect(formatWaypointPopupDetails({
      staffId: 12,
      timestamp: "2026-08-25T12:00:00.000Z",
      latitude: null,
      longitude: null,
      staffNumber: null,
    })).toMatchObject({
      staffName: "Staff 12",
      staffNumber: "—",
      location: "GPS unavailable",
    });
  });

  it("keeps Admin waypoint refresh at five seconds", () => {
    expect(WAYPOINT_REFRESH_INTERVAL_MS).toBe(5000);
  });
});
