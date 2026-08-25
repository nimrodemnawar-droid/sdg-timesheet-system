import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createStaffCaller() {
  const context: TrpcContext = {
    user: {
      id: 100,
      openId: "staff-online-missionary-test",
      email: "staff-online-missionary@example.com",
      name: "Online Missionary Test Staff",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
  return appRouter.createCaller(context);
}

const baseTask = {
  estimatedDuration: "2_hours" as const,
  activityType: "Training",
  taskDescription: "Legacy-compatible summary",
  specificActivity: "Online missionary orientation",
  onlineMissionary: true,
};

describe("Online Missionary task validation", () => {
  it("rejects an online missionary task when attended count is omitted", async () => {
    const caller = createStaffCaller();

    await expect(caller.attendance.submitTimesheet({
      attendanceId: 999999,
      tasks: [baseTask],
    })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("accepts an explicit zero attended count before ownership checks run", async () => {
    const caller = createStaffCaller();

    await expect(caller.attendance.submitTimesheet({
      attendanceId: 999999,
      tasks: [{ ...baseTask, onlineMissionaryParticipants: 0 }],
    })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
