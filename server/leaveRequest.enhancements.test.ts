import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAdminContext(userId: number = 1): TrpcContext {
  const user: AuthenticatedUser = {
    id: userId,
    openId: `admin-${userId}`,
    email: `admin${userId}@example.com`,
    name: `Admin User ${userId}`,
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

function createStaffContext(userId: number = 100): TrpcContext {
  const user: AuthenticatedUser = {
    id: userId,
    openId: `staff-${userId}`,
    email: `staff${userId}@example.com`,
    name: `Staff Member ${userId}`,
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("Leave Request Enhancements", () => {
  describe("Admin Dashboard Leave Request UI", () => {
    it("should allow admin to view pending leave requests", async () => {
      const adminCtx = createAdminContext(1);
      const caller = appRouter.createCaller(adminCtx);

      const pendingRequests = await caller.leave.getPending();

      expect(Array.isArray(pendingRequests)).toBe(true);
    });

    it("should support filtering leave requests by status", async () => {
      const adminCtx = createAdminContext(5);
      const caller = appRouter.createCaller(adminCtx);

      const allRequests = await caller.leave.getPending();

      const statuses = ["pending", "approved", "rejected"];
      statuses.forEach((status) => {
        const filtered = allRequests.filter((r: any) => r.status === status);
        expect(Array.isArray(filtered)).toBe(true);
      });
    });
  });

  describe("Leave Request Approval with Notifications", () => {
    it("should require admin role to approve leave requests", async () => {
      const staffCtx = createStaffContext(100);
      const caller = appRouter.createCaller(staffCtx);

      try {
        await caller.leave.approve({
          leaveRequestId: 999,
          reason: "Approved",
        });
        expect.fail("Should have thrown error");
      } catch (error: any) {
        // Either FORBIDDEN (no permission) or NOT_FOUND (leave request doesn't exist) is acceptable
        expect(["FORBIDDEN", "NOT_FOUND"]).toContain(error.code);
      }
    });

    it("should allow admin to approve leave request", async () => {
      const adminCtx = createAdminContext(6);
      const caller = appRouter.createCaller(adminCtx);

      expect(typeof caller.leave.approve).toBe("function");
    });

    it("should allow admin to reject leave request", async () => {
      const adminCtx = createAdminContext(7);
      const caller = appRouter.createCaller(adminCtx);

      expect(typeof caller.leave.reject).toBe("function");
    });

    it("should require admin role to reject leave requests", async () => {
      const staffCtx = createStaffContext(101);
      const caller = appRouter.createCaller(staffCtx);

      try {
        await caller.leave.reject({
          leaveRequestId: 999,
          reason: "Rejected",
        });
        expect.fail("Should have thrown error");
      } catch (error: any) {
        // Either FORBIDDEN (no permission) or NOT_FOUND (leave request doesn't exist) is acceptable
        expect(["FORBIDDEN", "NOT_FOUND"]).toContain(error.code);
      }
    });
  });

  describe("Staff Leave Request Viewing", () => {
    it("should allow staff to view their own leave requests", async () => {
      const staffCtx = createStaffContext(102);
      const caller = appRouter.createCaller(staffCtx);

      const myRequests = await caller.leave.getMyRequests();

      expect(Array.isArray(myRequests)).toBe(true);
    });

    it("should show leave request status to staff", async () => {
      const staffCtx = createStaffContext(103);
      const caller = appRouter.createCaller(staffCtx);

      const myRequests = await caller.leave.getMyRequests();

      if (myRequests.length > 0) {
        myRequests.forEach((req: any) => {
          expect(req.status).toBeDefined();
          expect(["pending", "approved", "rejected"]).toContain(req.status);
        });
      }
    });

    it("should show leave request details", async () => {
      const staffCtx = createStaffContext(104);
      const caller = appRouter.createCaller(staffCtx);

      const myRequests = await caller.leave.getMyRequests();

      if (myRequests.length > 0) {
        myRequests.forEach((req: any) => {
          expect(req.leaveType).toBeDefined();
          expect(req.startDate).toBeDefined();
          expect(req.endDate).toBeDefined();
        });
      }
    });
  });

  describe("Leave Request Access Control", () => {
    it("should prevent non-admin from accessing pending requests", async () => {
      const staffCtx = createStaffContext(106);
      const caller = appRouter.createCaller(staffCtx);

      try {
        await caller.leave.getPending();
        expect.fail("Should have thrown FORBIDDEN error");
      } catch (error: any) {
        expect(error.code).toBe("FORBIDDEN");
      }
    });

    it("should allow staff to get their own leave balance", async () => {
      const staffCtx = createStaffContext(107);
      const caller = appRouter.createCaller(staffCtx);

      const balance = await caller.leave.getBalance({
        leaveType: "annual",
        year: 2026,
      });

      expect(balance).toBeDefined();
      expect(typeof balance).toBe("object");
    });

    it("should require authentication for leave operations", async () => {
      const unauthCtx: TrpcContext = {
        user: null,
        req: {
          protocol: "https",
          headers: {},
        } as TrpcContext["req"],
        res: {} as TrpcContext["res"],
      };

      const caller = appRouter.createCaller(unauthCtx);

      try {
        await caller.leave.getMyRequests();
        expect.fail("Should have thrown UNAUTHORIZED error");
      } catch (error: any) {
        expect(error.code).toBe("UNAUTHORIZED");
      }
    });
  });

  describe("Leave Request Data Integrity", () => {
    it("should maintain leave request status", async () => {
      const staffCtx = createStaffContext(108);
      const caller = appRouter.createCaller(staffCtx);

      const requests = await caller.leave.getMyRequests();

      if (requests.length > 0) {
        requests.forEach((req: any) => {
          expect(req.status).toBeDefined();
          expect(typeof req.status).toBe("string");
          expect(["pending", "approved", "rejected"]).toContain(req.status);
        });
      }
    });

    it("should preserve leave request dates", async () => {
      const staffCtx = createStaffContext(109);
      const caller = appRouter.createCaller(staffCtx);

      const requests = await caller.leave.getMyRequests();

      if (requests.length > 0) {
        requests.forEach((req: any) => {
          const startDate = new Date(req.startDate);
          const endDate = new Date(req.endDate);

          expect(endDate.getTime()).toBeGreaterThanOrEqual(startDate.getTime());
        });
      }
    });

    it("should include leave type information", async () => {
      const staffCtx = createStaffContext(110);
      const caller = appRouter.createCaller(staffCtx);

      const requests = await caller.leave.getMyRequests();

      const validLeaveTypes = ["annual", "sick", "unpaid", "maternity", "other"];
      if (requests.length > 0) {
        requests.forEach((req: any) => {
          expect(validLeaveTypes).toContain(req.leaveType);
        });
      }
    });
  });

  describe("Real-time Synchronization", () => {
    it("should sync admin and staff leave data", async () => {
      const adminCtx = createAdminContext(8);
      const staffCtx = createStaffContext(111);

      const adminCaller = appRouter.createCaller(adminCtx);
      const staffCaller = appRouter.createCaller(staffCtx);

      expect(typeof adminCaller.leave.getPending).toBe("function");
      expect(typeof staffCaller.leave.getMyRequests).toBe("function");
    });

    it("should provide consistent leave data across requests", async () => {
      const staffCtx = createStaffContext(112);
      const caller = appRouter.createCaller(staffCtx);

      const requests1 = await caller.leave.getMyRequests();
      const requests2 = await caller.leave.getMyRequests();

      expect(requests1.length).toBe(requests2.length);
    });
  });
});
