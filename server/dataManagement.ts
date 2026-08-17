import { and, desc, eq, gte, lte } from "drizzle-orm";
import { getDb } from "./db";
import {
  activityCategories,
  activityHeatmap,
  attendance,
  auditLog,
  documents,
  emailNotifications,
  kpis,
  leaveBalance,
  leaveRequests,
  manualApprovalRequests,
  monthlyReportAuditLog,
  monthlyReports,
  notificationHistory,
  notificationPreferences,
  reportDeliveryHistory,
  reportSchedules,
  sdgGoals,
  supervisorConfirmations,
  supervisorRemarks,
  systemConfig,
  users,
  waypoints,
} from "../drizzle/schema";

const BACKUP_VERSION = 1;
const MAX_BACKUP_BYTES = 20 * 1024 * 1024;

const TABLES = {
  users,
  sdgGoals,
  activityCategories,
  kpis,
  attendance,
  supervisorConfirmations,
  waypoints,
  leaveRequests,
  leaveBalance,
  supervisorRemarks,
  emailNotifications,
  documents,
  auditLog,
  systemConfig,
  activityHeatmap,
  notificationPreferences,
  notificationHistory,
  reportSchedules,
  reportDeliveryHistory,
  manualApprovalRequests,
  monthlyReports,
  monthlyReportAuditLog,
} as const;

const RESTORE_ORDER = [
  "users",
  "sdgGoals",
  "activityCategories",
  "kpis",
  "systemConfig",
  "attendance",
  "leaveRequests",
  "leaveBalance",
  "supervisorConfirmations",
  "supervisorRemarks",
  "waypoints",
  "emailNotifications",
  "documents",
  "auditLog",
  "activityHeatmap",
  "notificationPreferences",
  "notificationHistory",
  "reportSchedules",
  "reportDeliveryHistory",
  "manualApprovalRequests",
  "monthlyReports",
  "monthlyReportAuditLog",
] as const;

const DATE_FIELDS: Record<string, string[]> = {
  users: ["createdAt", "updatedAt", "lastSignedIn"],
  sdgGoals: ["createdAt"],
  activityCategories: ["createdAt", "updatedAt"],
  kpis: ["createdAt", "updatedAt"],
  attendance: ["checkInTime", "checkOutTime", "amStartTime", "amEndTime", "pmStartTime", "pmEndTime", "submittedAt", "approvedAt", "createdAt", "updatedAt"],
  supervisorConfirmations: ["confirmedAt", "createdAt"],
  waypoints: ["timestamp", "createdAt"],
  leaveRequests: ["startDate", "endDate", "approvedAt", "createdAt", "updatedAt"],
  leaveBalance: [],
  supervisorRemarks: ["createdAt", "updatedAt"],
  emailNotifications: ["sentAt", "createdAt"],
  documents: ["createdAt"],
  auditLog: ["createdAt"],
  systemConfig: ["updatedAt"],
  activityHeatmap: ["date", "createdAt"],
  notificationPreferences: ["createdAt", "updatedAt"],
  notificationHistory: ["readAt", "archivedAt", "createdAt", "updatedAt"],
  reportSchedules: ["lastSentAt", "nextScheduledAt", "createdAt", "updatedAt"],
  reportDeliveryHistory: ["generatedAt", "sentAt", "createdAt"],
  manualApprovalRequests: ["requestedAt", "approvedAt", "createdAt", "updatedAt"],
  monthlyReports: ["reportingMonth", "submittedAt", "reviewedAt", "createdAt", "updatedAt"],
  monthlyReportAuditLog: ["actionDate", "createdAt"],
};

export type BackupTableName = keyof typeof TABLES;

export interface DatabaseBackupSnapshot {
  format: "sdg-timesheet-database";
  version: number;
  generatedAt: string;
  tables: Partial<Record<BackupTableName, unknown[]>>;
  recordCounts: Record<string, number>;
}

function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const normalized = value instanceof Date ? value.toISOString() : typeof value === "object" ? JSON.stringify(value) : String(value);
  return /[",\n\r]/.test(normalized) ? `"${normalized.replace(/"/g, '""')}"` : normalized;
}

function toCsv(rows: Record<string, unknown>[], columns: string[]): string {
  const lines = [columns.join(",")];
  for (const row of rows) lines.push(columns.map((column) => csvCell(row[column])).join(","));
  return `${lines.join("\n")}\n`;
}

function normalizeDateFields(tableName: string, row: Record<string, unknown>): Record<string, unknown> {
  const normalized = { ...row };
  for (const field of DATE_FIELDS[tableName] ?? []) {
    if (normalized[field] !== null && normalized[field] !== undefined && !(normalized[field] instanceof Date)) {
      const parsed = new Date(String(normalized[field]));
      if (Number.isNaN(parsed.getTime())) throw new Error(`Invalid date in ${tableName}.${field}`);
      normalized[field] = parsed;
    }
  }
  return normalized;
}

function validateRows(value: unknown, tableName: string): Record<string, unknown>[] {
  if (!Array.isArray(value)) throw new Error(`Backup table ${tableName} must be an array`);
  if (value.length > 100_000) throw new Error(`Backup table ${tableName} contains too many records`);
  return value.map((row, index) => {
    if (!row || typeof row !== "object" || Array.isArray(row)) throw new Error(`Invalid record ${index + 1} in ${tableName}`);
    const record = normalizeDateFields(tableName, row as Record<string, unknown>);
    if (record.id !== undefined && (typeof record.id !== "number" || !Number.isInteger(record.id) || record.id < 1)) {
      throw new Error(`Invalid id in ${tableName} record ${index + 1}`);
    }
    return record;
  });
}

export function parseAndValidateBackup(backupJson: string): DatabaseBackupSnapshot {
  if (typeof backupJson !== "string" || Buffer.byteLength(backupJson, "utf8") > MAX_BACKUP_BYTES) {
    throw new Error("Backup file is missing or exceeds the 20 MB limit");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(backupJson);
  } catch {
    throw new Error("Backup file is not valid JSON");
  }

  if (!parsed || typeof parsed !== "object") throw new Error("Backup file must contain a JSON object");
  const candidate = parsed as Partial<DatabaseBackupSnapshot>;
  if (candidate.format !== "sdg-timesheet-database" || candidate.version !== BACKUP_VERSION || !candidate.tables || typeof candidate.tables !== "object") {
    throw new Error("Unsupported backup format or version");
  }

  const tables: Partial<Record<BackupTableName, unknown[]>> = {};
  const recordCounts: Record<string, number> = {};
  for (const [tableName, rows] of Object.entries(candidate.tables)) {
    if (!(tableName in TABLES)) throw new Error(`Unsupported table in backup: ${tableName}`);
    const validatedRows = validateRows(rows, tableName);
    tables[tableName as BackupTableName] = validatedRows;
    recordCounts[tableName] = validatedRows.length;
  }

  return {
    format: "sdg-timesheet-database",
    version: BACKUP_VERSION,
    generatedAt: typeof candidate.generatedAt === "string" ? candidate.generatedAt : new Date().toISOString(),
    tables,
    recordCounts,
  };
}

export async function createDatabaseBackup(): Promise<DatabaseBackupSnapshot> {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");

  const tables: Partial<Record<BackupTableName, unknown[]>> = {};
  const recordCounts: Record<string, number> = {};
  for (const [tableName, table] of Object.entries(TABLES)) {
    const rows = await (db as any).select().from(table as any);
    tables[tableName as BackupTableName] = rows;
    recordCounts[tableName] = rows.length;
  }

  return {
    format: "sdg-timesheet-database",
    version: BACKUP_VERSION,
    generatedAt: new Date().toISOString(),
    tables,
    recordCounts,
  };
}

export function serializeBackup(snapshot: DatabaseBackupSnapshot): string {
  return JSON.stringify(snapshot, null, 2);
}

export async function generateStaffCsv(): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const rows = await db.select().from(users).orderBy(users.name);
  return toCsv(rows as unknown as Record<string, unknown>[], ["id", "staffNumber", "name", "email", "role", "department", "phoneNumber", "isActive", "createdAt", "updatedAt", "lastSignedIn"]);
}

export async function generateAttendanceCsv(startDate?: Date, endDate?: Date): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const conditions = [];
  if (startDate) conditions.push(gte(attendance.checkInTime, startDate));
  if (endDate) conditions.push(lte(attendance.checkInTime, endDate));
  const rows = await db
    .select({
      attendanceId: attendance.id,
      userId: attendance.userId,
      staffNumber: users.staffNumber,
      staffName: users.name,
      email: users.email,
      checkInTime: attendance.checkInTime,
      checkOutTime: attendance.checkOutTime,
      checkInLat: attendance.checkInLat,
      checkInLng: attendance.checkInLng,
      checkInAddress: attendance.checkInAddress,
      checkOutLat: attendance.checkOutLat,
      checkOutLng: attendance.checkOutLng,
      checkOutAddress: attendance.checkOutAddress,
      checkInAccuracy: attendance.checkInAccuracy,
      checkOutAccuracy: attendance.checkOutAccuracy,
      distanceTraveled: attendance.distanceTraveled,
      durationMinutes: attendance.durationMinutes,
      overtimeMinutes: attendance.overtimeMinutes,
      workModality: attendance.workModality,
      isSubmitted: attendance.isSubmitted,
      isApproved: attendance.isApproved,
    })
    .from(attendance)
    .leftJoin(users, eq(attendance.userId, users.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(attendance.checkInTime));
  return toCsv(rows as unknown as Record<string, unknown>[], Object.keys(rows[0] ?? {
    attendanceId: "", userId: "", staffNumber: "", staffName: "", email: "", checkInTime: "", checkOutTime: "", checkInLat: "", checkInLng: "", checkInAddress: "", checkOutLat: "", checkOutLng: "", checkOutAddress: "", checkInAccuracy: "", checkOutAccuracy: "", distanceTraveled: "", durationMinutes: "", overtimeMinutes: "", workModality: "", isSubmitted: "", isApproved: "",
  }));
}

export function getBackupPreview(backupJson: string) {
  const snapshot = parseAndValidateBackup(backupJson);
  return {
    format: snapshot.format,
    version: snapshot.version,
    generatedAt: snapshot.generatedAt,
    recordCounts: snapshot.recordCounts,
    totalRecords: Object.values(snapshot.recordCounts).reduce((total, count) => total + count, 0),
  };
}

export async function restoreDatabaseBackup(backupJson: string) {
  const snapshot = parseAndValidateBackup(backupJson);
  const db = await getDb();
  if (!db) throw new Error("Database is not available");

  const restoredCounts: Record<string, number> = {};
  await (db as any).transaction(async (tx: any) => {
    for (const tableName of RESTORE_ORDER) {
      const rows = snapshot.tables[tableName as BackupTableName] as Record<string, unknown>[] | undefined;
      if (!rows?.length) continue;
      const table = TABLES[tableName as BackupTableName] as any;
      let count = 0;
      for (const row of rows) {
        const values = normalizeDateFields(tableName, row);
        const { id, ...updateValues } = values;
        if (id === undefined) {
          await tx.insert(table).values(values);
        } else {
          await tx.insert(table).values(values).onDuplicateKeyUpdate({ set: updateValues });
        }
        count += 1;
      }
      restoredCounts[tableName] = count;
    }
  });

  return { restoredCounts, totalRecords: Object.values(restoredCounts).reduce((total, count) => total + count, 0) };
}
