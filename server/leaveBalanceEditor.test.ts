import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAdminContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 999,
    openId: "leave-balance-editor-admin",
    email: "leave-balance-editor-admin@example.com",
    name: "Leave Balance Editor Admin",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("Admin leave balance editor", () => {
  it("keeps annual leave fixed at 21 working days", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    await expect(caller.leave.updateBalance({
      userId: 1,
      leaveType: "annual",
      allocatedDays: 20,
    })).rejects.toThrow("Annual leave entitlement must remain 21 working days");
  });

  it("updates an allocation without changing used days", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const year = new Date().getFullYear();
    const balances = await caller.leave.getAllBalances({ year });
    if (balances.length === 0) return;

    const target = balances[0];
    const original = target.sick;
    const allocatedDays = Number(original?.allocatedDays ?? 0) + 1;
    const usedDays = Number(original?.usedDays ?? 0);

    try {
      const updated = await caller.leave.updateBalance({
        userId: target.userId,
        leaveType: "sick",
        year,
        allocatedDays,
      });
      expect(Number(updated?.allocatedDays)).toBe(allocatedDays);
      expect(Number(updated?.usedDays)).toBe(usedDays);
      expect(Number(updated?.remainingDays)).toBe(Math.max(0, allocatedDays - usedDays));
    } finally {
      await caller.leave.updateBalance({
        userId: target.userId,
        leaveType: "sick",
        year,
        allocatedDays: Number(original?.allocatedDays ?? 0),
      });
    }
  });
});

  it("provisions the predefined leave types and always includes annual leave", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const types = await caller.leave.getAllTypes();
    expect(types.map((type) => type.leaveType)).toEqual(expect.arrayContaining(["annual", "sick", "unpaid", "maternity", "other"]));
  });

  it("does not allow Admins to disable annual leave", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    await expect(caller.leave.updateType({
      leaveType: "annual",
      label: "Annual Leave",
      description: "Annual leave entitlement",
      isActive: false,
    })).rejects.toThrow("Annual leave must remain available");
  });

  it("propagates a deactivated type to staff options and blocks new requests", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const original = (await caller.leave.getAllTypes()).find((type) => type.leaveType === "other");
    if (!original) return;

    try {
      await caller.leave.updateType({
        leaveType: "other",
        label: original.label,
        description: original.description,
        isActive: false,
      });
      const staffTypes = await caller.leave.getTypes();
      expect(staffTypes.some((type) => type.leaveType === "other")).toBe(false);
      await expect(caller.leave.createRequest({
        leaveType: "other",
        startDate: "2026-08-26",
        endDate: "2026-08-27",
        reason: "Configuration propagation test",
      })).rejects.toThrow("currently unavailable");
    } finally {
      await caller.leave.updateType({
        leaveType: "other",
        label: original.label,
        description: original.description,
        isActive: Boolean(original.isActive),
      });
    }
  });
