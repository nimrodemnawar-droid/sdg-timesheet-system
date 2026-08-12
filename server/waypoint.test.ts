import { describe, expect, it } from "vitest";
import { filterWaypointRecords } from "../shared/waypointUtils";

describe("Admin waypoint filtering", () => {
  const records = [
    { id: 1, timestamp: new Date("2026-08-12T07:00:00.000Z"), staffName: "Amina Staff", staffId: 1 },
    { id: 2, timestamp: new Date("2026-08-12T08:00:00.000Z"), staffName: "Brian Staff", staffId: 2 },
    { id: 3, timestamp: new Date("2026-08-13T08:00:00.000Z"), staffName: "Amina Staff", staffId: 1 },
  ];

  it("filters waypoints by the selected calendar date", () => {
    const result = filterWaypointRecords(records, { date: "2026-08-12" });
    expect(result.map((record) => record.id)).toEqual([1, 2]);
  });

  it("filters waypoints by staff name without changing record order", () => {
    const result = filterWaypointRecords(records, { staffName: "amina" });
    expect(result.map((record) => record.id)).toEqual([1, 3]);
  });

  it("combines date and staff filters and returns all records when empty", () => {
    expect(filterWaypointRecords(records)).toHaveLength(3);
    expect(filterWaypointRecords(records, { date: "2026-08-12", staffName: "brian" }).map((record) => record.id)).toEqual([2]);
  });
});
