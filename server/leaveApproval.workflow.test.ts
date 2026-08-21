import { describe, expect, it } from "vitest";
import { and, desc, eq } from "drizzle-orm";
import { appRouter } from "./routers";
import * as db from "./db";
import type { TrpcContext } from "./_core/context";
import { emailNotifications } from "../drizzle/schema";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAdminContext(userId: number): TrpcContext {
  const user: AuthenticatedUser = {
    id: userId,
    openId: `leave-approval-admin-${userId}`,
    email: `leave-approval-admin-${userId}@example.com`,
    name: "Leave Approval Regression Admin",
    loginMethod: "test",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: { protocol: "https", headers: {}, ip: "127.0.0.1" } as any,
    res: {} as TrpcContext["res"],
  };
}

describe("Admin leave approval workflow regression", () => {
  it("updates the request status and notifies the requesting staff member", async () => {
    const unique = Date.now();
    const staffOpenId = `leave-approval-regression-${unique}`;
    const staffEmail = `leave-approval-regression-${unique}@example.com`;
    const approvalReason = "Regression approval status update";

    await db.upsertUser({
      openId: staffOpenId,
      email: staffEmail,
      name: "Leave Approval Regression Staff",
      loginMethod: "test",
      role: "staff",
    });

    const staff = await db.getUserByOpenId(staffOpenId);
    expect(staff).toBeDefined();

    const year = new Date().getFullYear();
    await db.initializeLeaveBalance(staff!.id, "annual", year, 20);
    const created = await db.createLeaveRequest({
      userId: staff!.id,
      leaveType: "annual",
      startDate: new Date(year, 10, 10),
      endDate: new Date(year, 10, 10),
      daysRequested: "1",
      reason: `Regression request ${unique}`,
    });
    expect(created).toBeDefined();

    const request = (await db.getUserLeaveRequests(staff!.id)).find(
      (item) => item.reason === `Regression request ${unique}` && item.status === "pending"
    );
    expect(request).toBeDefined();

    const caller = appRouter.createCaller(createAdminContext(1));
    const result = await caller.leave.approve({
      leaveRequestId: request!.id,
      reason: approvalReason,
    });

    expect(result).toMatchObject({
      success: true,
      status: "approved",
      leaveRequestId: request!.id,
    });

    const updated = await db.getLeaveRequest(request!.id);
    expect(updated).toMatchObject({
      status: "approved",
      approvedBy: 1,
      approvalReason,
    });
    expect(updated?.approvedAt).toBeDefined();

    const database = await db.getDb();
    expect(database).toBeDefined();
    const notifications = await database!
      .select()
      .from(emailNotifications)
      .where(
        and(
          eq(emailNotifications.userId, staff!.id),
          eq(emailNotifications.type, "leave_approved")
        )
      )
      .orderBy(desc(emailNotifications.id));

    expect(notifications[0]).toMatchObject({
      userId: staff!.id,
      type: "leave_approved",
      subject: "Leave Request Approved",
    });
    expect(notifications[0]?.content).toContain(approvalReason);
  });
});
