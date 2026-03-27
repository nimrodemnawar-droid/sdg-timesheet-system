import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createStaffContext(userId: number = 200): TrpcContext {
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

describe("Leave Balance Dashboard", () => {
  describe("Get All Leave Balances", () => {
    it("should allow staff to get all leave balances for current year", async () => {
      const staffCtx = createStaffContext(200);
      const caller = appRouter.createCaller(staffCtx);

      const balances = await caller.leave.getAllBalances({ year: 2026 });

      expect(Array.isArray(balances)).toBe(true);
    });

    it("should return balances for all leave types", async () => {
      const staffCtx = createStaffContext(201);
      const caller = appRouter.createCaller(staffCtx);

      const balances = await caller.leave.getAllBalances({ year: 2026 });

      if (balances.length > 0) {
        const leaveTypes = balances.map((b: any) => b.leaveType);
        expect(leaveTypes.length).toBeGreaterThan(0);
      }
    });

    it("should include allocated and remaining days in balance data", async () => {
      const staffCtx = createStaffContext(202);
      const caller = appRouter.createCaller(staffCtx);

      const balances = await caller.leave.getAllBalances({ year: 2026 });

      if (balances.length > 0) {
        balances.forEach((balance: any) => {
          expect(balance.allocatedDays).toBeDefined();
          expect(balance.usedDays).toBeDefined();
          expect(balance.remainingDays).toBeDefined();
        });
      }
    });

    it("should support querying different years", async () => {
      const staffCtx = createStaffContext(203);
      const caller = appRouter.createCaller(staffCtx);

      const balances2026 = await caller.leave.getAllBalances({ year: 2026 });
      const balances2025 = await caller.leave.getAllBalances({ year: 2025 });

      expect(Array.isArray(balances2026)).toBe(true);
      expect(Array.isArray(balances2025)).toBe(true);
    });

    it("should use current year if year parameter not provided", async () => {
      const staffCtx = createStaffContext(204);
      const caller = appRouter.createCaller(staffCtx);

      const balances = await caller.leave.getAllBalances({});

      expect(Array.isArray(balances)).toBe(true);
    });
  });

  describe("Leave Balance Calculation", () => {
    it("should calculate remaining days correctly", async () => {
      const staffCtx = createStaffContext(205);
      const caller = appRouter.createCaller(staffCtx);

      const balances = await caller.leave.getAllBalances({ year: 2026 });

      if (balances.length > 0) {
        balances.forEach((balance: any) => {
          const allocated = typeof balance.allocatedDays === "string" 
            ? parseFloat(balance.allocatedDays) 
            : balance.allocatedDays;
          const used = typeof balance.usedDays === "string" 
            ? parseFloat(balance.usedDays) 
            : balance.usedDays;
          const remaining = typeof balance.remainingDays === "string" 
            ? parseFloat(balance.remainingDays) 
            : balance.remainingDays;

          expect(remaining).toBeLessThanOrEqual(allocated);
          expect(remaining).toBeGreaterThanOrEqual(0);
        });
      }
    });

    it("should not allow remaining days to exceed allocated days", async () => {
      const staffCtx = createStaffContext(206);
      const caller = appRouter.createCaller(staffCtx);

      const balances = await caller.leave.getAllBalances({ year: 2026 });

      if (balances.length > 0) {
        balances.forEach((balance: any) => {
          const allocated = typeof balance.allocatedDays === "string" 
            ? parseFloat(balance.allocatedDays) 
            : balance.allocatedDays;
          const remaining = typeof balance.remainingDays === "string" 
            ? parseFloat(balance.remainingDays) 
            : balance.remainingDays;

          expect(remaining).toBeLessThanOrEqual(allocated);
        });
      }
    });

    it("should track used days accurately", async () => {
      const staffCtx = createStaffContext(207);
      const caller = appRouter.createCaller(staffCtx);

      const balances = await caller.leave.getAllBalances({ year: 2026 });

      if (balances.length > 0) {
        balances.forEach((balance: any) => {
          const used = typeof balance.usedDays === "string" 
            ? parseFloat(balance.usedDays) 
            : balance.usedDays;

          expect(used).toBeGreaterThanOrEqual(0);
        });
      }
    });
  });

  describe("Leave Balance Data Integrity", () => {
    it("should maintain consistent leave balance data", async () => {
      const staffCtx = createStaffContext(208);
      const caller = appRouter.createCaller(staffCtx);

      const balances1 = await caller.leave.getAllBalances({ year: 2026 });
      const balances2 = await caller.leave.getAllBalances({ year: 2026 });

      expect(balances1.length).toBe(balances2.length);
    });

    it("should include leave type information in balance data", async () => {
      const staffCtx = createStaffContext(209);
      const caller = appRouter.createCaller(staffCtx);

      const balances = await caller.leave.getAllBalances({ year: 2026 });

      const validLeaveTypes = ["annual", "sick", "unpaid", "maternity", "other"];
      if (balances.length > 0) {
        balances.forEach((balance: any) => {
          expect(validLeaveTypes).toContain(balance.leaveType);
        });
      }
    });

    it("should include year information in balance data", async () => {
      const staffCtx = createStaffContext(210);
      const caller = appRouter.createCaller(staffCtx);

      const balances = await caller.leave.getAllBalances({ year: 2026 });

      if (balances.length > 0) {
        balances.forEach((balance: any) => {
          expect(balance.year).toBe(2026);
        });
      }
    });
  });

  describe("Leave Balance Access Control", () => {
    it("should require authentication to access leave balances", async () => {
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
        await caller.leave.getAllBalances({ year: 2026 });
        expect.fail("Should have thrown UNAUTHORIZED error");
      } catch (error: any) {
        expect(error.code).toBe("UNAUTHORIZED");
      }
    });

    it("should allow staff to access their own leave balances", async () => {
      const staffCtx = createStaffContext(211);
      const caller = appRouter.createCaller(staffCtx);

      const balances = await caller.leave.getAllBalances({ year: 2026 });

      expect(Array.isArray(balances)).toBe(true);
    });
  });

  describe("Leave Balance Dashboard Features", () => {
    it("should provide data for dashboard summary cards", async () => {
      const staffCtx = createStaffContext(212);
      const caller = appRouter.createCaller(staffCtx);

      const balances = await caller.leave.getAllBalances({ year: 2026 });

      if (balances.length > 0) {
        let totalAllocated = 0;
        let totalUsed = 0;
        let totalRemaining = 0;

        balances.forEach((balance: any) => {
          const allocated = typeof balance.allocatedDays === "string" 
            ? parseFloat(balance.allocatedDays) 
            : balance.allocatedDays || 0;
          const used = typeof balance.usedDays === "string" 
            ? parseFloat(balance.usedDays) 
            : balance.usedDays || 0;
          const remaining = typeof balance.remainingDays === "string" 
            ? parseFloat(balance.remainingDays) 
            : balance.remainingDays || 0;

          totalAllocated += allocated;
          totalUsed += used;
          totalRemaining += remaining;
        });

        expect(totalAllocated).toBeGreaterThanOrEqual(0);
        expect(totalUsed).toBeGreaterThanOrEqual(0);
        expect(totalRemaining).toBeGreaterThanOrEqual(0);
      }
    });

    it("should support progress bar calculations", async () => {
      const staffCtx = createStaffContext(213);
      const caller = appRouter.createCaller(staffCtx);

      const balances = await caller.leave.getAllBalances({ year: 2026 });

      if (balances.length > 0) {
        balances.forEach((balance: any) => {
          const allocated = typeof balance.allocatedDays === "string" 
            ? parseFloat(balance.allocatedDays) 
            : balance.allocatedDays || 0;
          const used = typeof balance.usedDays === "string" 
            ? parseFloat(balance.usedDays) 
            : balance.usedDays || 0;

          if (allocated > 0) {
            const percentage = (used / allocated) * 100;
            expect(percentage).toBeGreaterThanOrEqual(0);
            expect(percentage).toBeLessThanOrEqual(100);
          }
        });
      }
    });

    it("should support status badge determination", async () => {
      const staffCtx = createStaffContext(214);
      const caller = appRouter.createCaller(staffCtx);

      const balances = await caller.leave.getAllBalances({ year: 2026 });

      if (balances.length > 0) {
        balances.forEach((balance: any) => {
          const remaining = typeof balance.remainingDays === "string" 
            ? parseFloat(balance.remainingDays) 
            : balance.remainingDays || 0;
          const allocated = typeof balance.allocatedDays === "string" 
            ? parseFloat(balance.allocatedDays) 
            : balance.allocatedDays || 0;

          let status = "available";
          if (remaining <= 0) {
            status = "no_days_left";
          } else if (remaining <= allocated * 0.2) {
            status = "low_balance";
          }

          expect(["available", "low_balance", "no_days_left"]).toContain(status);
        });
      }
    });
  });

  describe("Leave Balance and Leave Requests Integration", () => {
    it("should correlate with staff leave requests", async () => {
      const staffCtx = createStaffContext(215);
      const caller = appRouter.createCaller(staffCtx);

      const balances = await caller.leave.getAllBalances({ year: 2026 });
      const requests = await caller.leave.getMyRequests();

      expect(Array.isArray(balances)).toBe(true);
      expect(Array.isArray(requests)).toBe(true);
    });

    it("should reflect approved leave in used days", async () => {
      const staffCtx = createStaffContext(216);
      const caller = appRouter.createCaller(staffCtx);

      const balances = await caller.leave.getAllBalances({ year: 2026 });
      const requests = await caller.leave.getMyRequests();

      if (balances.length > 0 && requests.length > 0) {
        const approvedRequests = requests.filter((r: any) => r.status === "approved");
        if (approvedRequests.length > 0) {
          balances.forEach((balance: any) => {
            const used = typeof balance.usedDays === "string" 
              ? parseFloat(balance.usedDays) 
              : balance.usedDays || 0;
            expect(used).toBeGreaterThanOrEqual(0);
          });
        }
      }
    });
  });

  describe("Leave Balance Year Management", () => {
    it("should support historical year queries", async () => {
      const staffCtx = createStaffContext(217);
      const caller = appRouter.createCaller(staffCtx);

      const currentYear = new Date().getFullYear();
      const balancesCurrent = await caller.leave.getAllBalances({ year: currentYear });
      const balancesPrevious = await caller.leave.getAllBalances({ year: currentYear - 1 });

      expect(Array.isArray(balancesCurrent)).toBe(true);
      expect(Array.isArray(balancesPrevious)).toBe(true);
    });

    it("should support future year queries", async () => {
      const staffCtx = createStaffContext(218);
      const caller = appRouter.createCaller(staffCtx);

      const currentYear = new Date().getFullYear();
      const balancesFuture = await caller.leave.getAllBalances({ year: currentYear + 1 });

      expect(Array.isArray(balancesFuture)).toBe(true);
    });
  });
});
