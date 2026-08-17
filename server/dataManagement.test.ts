import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { getBackupPreview, parseAndValidateBackup } from "./dataManagement";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createContext(role: "admin" | "staff", userId: number): TrpcContext {
  const user: AuthenticatedUser = {
    id: userId,
    openId: `${role}-backup-${userId}`,
    email: `${role}-backup-${userId}@example.com`,
    name: `${role} backup tester`,
    loginMethod: "test",
    role,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  return { user, req: {} as any, res: {} as any };
}

const validBackup = JSON.stringify({
  format: "sdg-timesheet-database",
  version: 1,
  generatedAt: "2026-08-12T10:00:00.000Z",
  tables: {
    users: [{ id: 1, openId: "admin", email: "admin@example.com", createdAt: "2026-08-12T10:00:00.000Z" }],
    attendance: [],
  },
  recordCounts: { users: 1, attendance: 0 },
});

describe("Admin Data Management", () => {
  it("validates a backup and returns record counts without changing data", () => {
    const preview = getBackupPreview(validBackup);
    expect(preview.format).toBe("sdg-timesheet-database");
    expect(preview.totalRecords).toBe(1);
    expect(preview.recordCounts.users).toBe(1);
  });

  it("rejects unsupported tables and backup formats", () => {
    expect(() => parseAndValidateBackup(JSON.stringify({ format: "other", version: 1, tables: {} }))).toThrow(/Unsupported backup format/);
    expect(() => parseAndValidateBackup(JSON.stringify({ format: "sdg-timesheet-database", version: 1, tables: { unsafe: [] } }))).toThrow(/Unsupported table/);
  });

  it("allows an admin to preview a backup", async () => {
    const caller = appRouter.createCaller(createContext("admin", 991));
    const preview = await caller.dataManagement.previewRestore({ backupJson: validBackup });
    expect(preview.totalRecords).toBe(1);
  });

  it("prevents staff from using data-management procedures", async () => {
    const caller = appRouter.createCaller(createContext("staff", 992));
    await expect(caller.dataManagement.previewRestore({ backupJson: validBackup })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
