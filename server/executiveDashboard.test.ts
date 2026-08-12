import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { EXECUTIVE_QUICK_ACTION_ROUTES } from "../shared/executiveDashboard";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createContext(role: "admin" | "staff", userId: number): TrpcContext {
  const user: AuthenticatedUser = {
    id: userId,
    openId: `${role}-${userId}`,
    email: `${role}${userId}@example.com`,
    name: `${role} user ${userId}`,
    loginMethod: "test",
    role,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return { user, req: {} as any, res: {} as any };
}

describe("Executive Dashboard", () => {
  it("points quick actions to the staff and GPS Map admin tabs", () => {
    expect(EXECUTIVE_QUICK_ACTION_ROUTES.staff).toBe("/admin?tab=staff");
    expect(EXECUTIVE_QUICK_ACTION_ROUTES.gpsMap).toBe("/admin?tab=gpsmap");
  });
  it("returns live executive metrics, trends, and leave distribution for admins", async () => {
    const caller = appRouter.createCaller(createContext("admin", 901));
    const result = await caller.analytics.executiveSummary({
      startDate: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
      endDate: new Date(),
    });

    expect(result.metrics).toHaveProperty("totalStaff");
    expect(result.metrics).toHaveProperty("checkedInToday");
    expect(result.metrics).toHaveProperty("totalDistanceKm");
    expect(result.metrics).toHaveProperty("onTimePercentage");
    expect(result.metrics).toHaveProperty("completionPercentage");
    expect(Array.isArray(result.trend)).toBe(true);
    expect(Array.isArray(result.leaveDistribution)).toBe(true);
  });

  it("rejects staff access to the executive summary", async () => {
    const caller = appRouter.createCaller(createContext("staff", 902));
    await expect(
      caller.analytics.executiveSummary({
        startDate: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
        endDate: new Date(),
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
