import { drizzle } from "drizzle-orm/mysql2";
import { and, eq, gte, lte, desc, asc } from "drizzle-orm";
import {
  InsertUser,
  users,
  attendance,
  waypoints,
  leaveRequests,
  leaveBalance,
  supervisorRemarks,
  emailNotifications,
  documents,
  auditLog,
  systemConfig,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ============ USER MANAGEMENT ============

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }
  if (!user.email) {
    throw new Error("User email is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
      email: user.email,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db
    .select()
    .from(users)
    .where(eq(users.openId, openId))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(users)
    .where(eq(users.id, id))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(users).where(eq(users.isActive, true));
}

export async function updateUserProfile(
  userId: number,
  updates: Partial<InsertUser>
) {
  const db = await getDb();
  if (!db) return;

  await db.update(users).set(updates).where(eq(users.id, userId));
}

// ============ ATTENDANCE MANAGEMENT ============

export async function createAttendance(data: {
  userId: number;
  checkInLat: string;
  checkInLng: string;
  checkInAccuracy: string;
}) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.insert(attendance).values({
    userId: data.userId,
    checkInTime: new Date(),
    checkInLat: data.checkInLat as any,
    checkInLng: data.checkInLng as any,
    checkInAccuracy: data.checkInAccuracy as any,
  });

  return result;
}

export async function completeAttendance(
  attendanceId: number,
  data: {
    checkOutLat: string;
    checkOutLng: string;
    checkOutAccuracy: string;
    distanceTraveled: string;
  }
) {
  const db = await getDb();
  if (!db) return;

  // Get check-in time to calculate duration
  const record = await db
    .select()
    .from(attendance)
    .where(eq(attendance.id, attendanceId))
    .limit(1);

  if (!record.length) return;

  const checkInTime = record[0].checkInTime;
  const checkOutTime = new Date();
  const durationMinutes = Math.floor(
    (checkOutTime.getTime() - checkInTime.getTime()) / 60000
  );
  const overtimeMinutes = Math.max(0, durationMinutes - 480); // 8 hours = 480 minutes

  await db
    .update(attendance)
    .set({
      checkOutTime,
      checkOutLat: data.checkOutLat as any,
      checkOutLng: data.checkOutLng as any,
      checkOutAccuracy: data.checkOutAccuracy as any,
      distanceTraveled: data.distanceTraveled as any,
      durationMinutes,
      overtimeMinutes,
      updatedAt: new Date(),
    })
    .where(eq(attendance.id, attendanceId));
}

export async function getTodayAttendance(userId: number) {
  const db = await getDb();
  if (!db) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const result = await db
    .select()
    .from(attendance)
    .where(
      and(
        eq(attendance.userId, userId),
        gte(attendance.checkInTime, today),
        lte(attendance.checkInTime, tomorrow)
      )
    )
    .orderBy(desc(attendance.checkInTime))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

export async function getAttendanceRange(
  userId: number,
  startDate: Date,
  endDate: Date
) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(attendance)
    .where(
      and(
        eq(attendance.userId, userId),
        gte(attendance.checkInTime, startDate),
        lte(attendance.checkInTime, endDate)
      )
    )
    .orderBy(desc(attendance.checkInTime));
}

export async function getAttendanceById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(attendance)
    .where(eq(attendance.id, id))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function submitTimesheet(attendanceId: number) {
  const db = await getDb();
  if (!db) return;

  await db
    .update(attendance)
    .set({
      isSubmitted: true,
      submittedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(attendance.id, attendanceId));
}

// ============ WAYPOINT TRACKING ============

export async function addWaypoint(data: {
  attendanceId: number;
  userId: number;
  latitude: string;
  longitude: string;
  accuracy: string;
  cumulativeDistance: string;
  altitude?: string;
}) {
  const db = await getDb();
  if (!db) return;

  await db.insert(waypoints).values({
    attendanceId: data.attendanceId,
    userId: data.userId,
    latitude: data.latitude as any,
    longitude: data.longitude as any,
    accuracy: data.accuracy as any,
    timestamp: new Date(),
    cumulativeDistance: data.cumulativeDistance as any,
    altitude: data.altitude ? (data.altitude as any) : undefined,
  });
}

export async function getWaypoints(attendanceId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(waypoints)
    .where(eq(waypoints.attendanceId, attendanceId))
    .orderBy(asc(waypoints.timestamp));
}

// ============ LEAVE MANAGEMENT ============

export async function createLeaveRequest(data: {
  userId: number;
  leaveType: string;
  startDate: Date;
  endDate: Date;
  daysRequested: string;
  reason?: string;
  supportingDocumentUrl?: string;
  supportingDocumentKey?: string;
}) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.insert(leaveRequests).values({
    userId: data.userId,
    leaveType: data.leaveType as any,
    startDate: data.startDate,
    endDate: data.endDate,
    daysRequested: data.daysRequested as any,
    reason: data.reason,
    supportingDocumentUrl: data.supportingDocumentUrl,
    supportingDocumentKey: data.supportingDocumentKey,
    status: "pending",
  });

  return result;
}

export async function getLeaveRequest(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(leaveRequests)
    .where(eq(leaveRequests.id, id))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getUserLeaveRequests(userId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(leaveRequests)
    .where(eq(leaveRequests.userId, userId))
    .orderBy(desc(leaveRequests.createdAt));
}

export async function getPendingLeaveRequests() {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(leaveRequests)
    .where(eq(leaveRequests.status, "pending"))
    .orderBy(asc(leaveRequests.createdAt));
}

export async function approveLeaveRequest(
  leaveRequestId: number,
  approvedBy: number,
  reason?: string
) {
  const db = await getDb();
  if (!db) return;

  const leaveRequest = await getLeaveRequest(leaveRequestId);
  if (!leaveRequest) return;

  await db
    .update(leaveRequests)
    .set({
      status: "approved",
      approvedBy,
      approvalReason: reason,
      approvedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(leaveRequests.id, leaveRequestId));

  // Update leave balance
  const daysRequested = parseFloat(leaveRequest.daysRequested.toString());
  await updateLeaveBalance(
    leaveRequest.userId,
    leaveRequest.leaveType as string,
    daysRequested
  );
}

export async function rejectLeaveRequest(
  leaveRequestId: number,
  approvedBy: number,
  reason?: string
) {
  const db = await getDb();
  if (!db) return;

  await db
    .update(leaveRequests)
    .set({
      status: "rejected",
      approvedBy,
      approvalReason: reason,
      approvedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(leaveRequests.id, leaveRequestId));
}

export async function getLeaveBalance(
  userId: number,
  leaveType: string,
  year: number
) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(leaveBalance)
    .where(
      and(
        eq(leaveBalance.userId, userId),
        eq(leaveBalance.leaveType, leaveType as any),
        eq(leaveBalance.year, year)
      )
    )
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function updateLeaveBalance(
  userId: number,
  leaveType: string,
  daysUsed: number
) {
  const db = await getDb();
  if (!db) return;

  const year = new Date().getFullYear();
  const balance = await getLeaveBalance(userId, leaveType, year);

  if (balance) {
    const newUsedDays = parseFloat(balance.usedDays.toString()) + daysUsed;
    const newRemainingDays =
      parseFloat(balance.allocatedDays.toString()) - newUsedDays;

    await db
      .update(leaveBalance)
      .set({
        usedDays: newUsedDays.toString() as any,
        remainingDays: newRemainingDays.toString() as any,
        lastUpdated: new Date(),
      })
      .where(eq(leaveBalance.id, balance.id));
  }
}

export async function initializeLeaveBalance(
  userId: number,
  leaveType: string,
  year: number,
  allocatedDays: number
) {
  const db = await getDb();
  if (!db) return;

  await db.insert(leaveBalance).values({
    userId,
    leaveType: leaveType as any,
    year,
    allocatedDays: allocatedDays.toString() as any,
    usedDays: "0" as any,
    remainingDays: allocatedDays.toString() as any,
  });
}

// ============ SUPERVISOR REMARKS ============

export async function addSupervisorRemark(data: {
  attendanceId: number;
  supervisorId: number;
  userId: number;
  encryptedRemark: string;
  encryptionIv: string;
}) {
  const db = await getDb();
  if (!db) return;

  await db.insert(supervisorRemarks).values({
    attendanceId: data.attendanceId,
    supervisorId: data.supervisorId,
    userId: data.userId,
    encryptedRemark: data.encryptedRemark,
    encryptionIv: data.encryptionIv,
  });
}

export async function getSupervisorRemarks(attendanceId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(supervisorRemarks)
    .where(eq(supervisorRemarks.attendanceId, attendanceId));
}

// ============ EMAIL NOTIFICATIONS ============

export async function createEmailNotification(data: {
  recipientId: number;
  recipientEmail: string;
  notificationType: string;
  subject: string;
  body: string;
}) {
  const db = await getDb();
  if (!db) return;

  await db.insert(emailNotifications).values({
    recipientId: data.recipientId,
    recipientEmail: data.recipientEmail,
    notificationType: data.notificationType as any,
    subject: data.subject,
    body: data.body,
    status: "pending",
  });
}

export async function getPendingEmailNotifications() {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(emailNotifications)
    .where(eq(emailNotifications.status, "pending"));
}

export async function markEmailAsSent(
  emailId: number,
  sentAt: Date = new Date()
) {
  const db = await getDb();
  if (!db) return;

  await db
    .update(emailNotifications)
    .set({
      status: "sent",
      sentAt,
    })
    .where(eq(emailNotifications.id, emailId));
}

export async function markEmailAsFailed(
  emailId: number,
  failureReason: string
) {
  const db = await getDb();
  if (!db) return;

  await db
    .update(emailNotifications)
    .set({
      status: "failed",
      failureReason,
    })
    .where(eq(emailNotifications.id, emailId));
}

// ============ DOCUMENTS ============

export async function createDocument(data: {
  userId: number;
  documentType: string;
  fileName: string;
  fileKey: string;
  fileUrl: string;
  mimeType?: string;
  fileSizeBytes?: number;
  uploadedBy: number;
  relatedEntityType?: string;
  relatedEntityId?: number;
  expiresAt?: Date;
}) {
  const db = await getDb();
  if (!db) return;

  await db.insert(documents).values({
    userId: data.userId,
    documentType: data.documentType as any,
    fileName: data.fileName,
    fileKey: data.fileKey,
    fileUrl: data.fileUrl,
    mimeType: data.mimeType,
    fileSizeBytes: data.fileSizeBytes,
    uploadedBy: data.uploadedBy,
    relatedEntityType: data.relatedEntityType,
    relatedEntityId: data.relatedEntityId,
    expiresAt: data.expiresAt,
  });
}

export async function getDocumentsByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(documents)
    .where(eq(documents.userId, userId))
    .orderBy(desc(documents.createdAt));
}

// ============ AUDIT LOG ============

export async function logAuditEvent(data: {
  userId: number;
  action: string;
  entityType: string;
  entityId?: number;
  changes?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}) {
  const db = await getDb();
  if (!db) return;

  await db.insert(auditLog).values({
    userId: data.userId,
    action: data.action,
    entityType: data.entityType,
    entityId: data.entityId,
    changes: data.changes ? JSON.stringify(data.changes) : undefined,
    ipAddress: data.ipAddress,
    userAgent: data.userAgent,
  });
}

// ============ SYSTEM CONFIG ============

export async function getSystemConfig(key: string) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(systemConfig)
    .where(eq(systemConfig.configKey, key))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function setSystemConfig(
  key: string,
  value: string,
  description?: string,
  updatedBy?: number
) {
  const db = await getDb();
  if (!db) return;

  const existing = await getSystemConfig(key);

  if (existing) {
    await db
      .update(systemConfig)
      .set({
        configValue: value,
        description,
        updatedBy,
        updatedAt: new Date(),
      })
      .where(eq(systemConfig.configKey, key));
  } else {
    await db.insert(systemConfig).values({
      configKey: key,
      configValue: value,
      description,
      updatedBy,
    });
  }
}
