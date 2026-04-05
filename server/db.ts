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
  sdgGoals,
  activityCategories,
  kpis,
  supervisorConfirmations,
  activityHeatmap,
  notificationPreferences,
  notificationHistory,
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
  workModality?: string;
}) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.insert(attendance).values({
    userId: data.userId,
    checkInTime: new Date(),
    checkInLat: data.checkInLat as any,
    checkInLng: data.checkInLng as any,
    checkInAccuracy: data.checkInAccuracy as any,
    workModality: data.workModality as any,
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
  if (!db) return null;

  try {
    const result = await db
      .select({
        id: leaveBalance.id,
        userId: leaveBalance.userId,
        year: leaveBalance.year,
        leaveType: leaveBalance.leaveType,
        allocatedDays: leaveBalance.allocatedDays,
        usedDays: leaveBalance.usedDays,
        remainingDays: leaveBalance.remainingDays,
      })
      .from(leaveBalance)
      .where(
        and(
          eq(leaveBalance.userId, userId),
          eq(leaveBalance.leaveType, leaveType as "annual" | "sick" | "maternity" | "unpaid" | "other"),
          eq(leaveBalance.year, year)
        )
      )
      .limit(1);

    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error("Error fetching leave balance:", error);
    return null;
  }
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
  userId: number;
  type: string;
  subject: string;
  content?: string;
}) {
  const db = await getDb();
  if (!db) return;

  await db.insert(emailNotifications).values({
    userId: data.userId,
    type: data.type,
    subject: data.subject,
    content: data.content,
    sentAt: new Date(),
  });
}

// ============ DOCUMENTS ============

export async function addDocument(data: {
  userId: number;
  documentType: string;
  fileName: string;
  fileKey: string;
  mimeType?: string;
  fileSize?: number;
  isEncrypted?: boolean;
}) {
  const db = await getDb();
  if (!db) return;

  await db.insert(documents).values({
    userId: data.userId,
    documentType: data.documentType as any,
    fileName: data.fileName,
    fileKey: data.fileKey,
    mimeType: data.mimeType,
    fileSize: data.fileSize,
    isEncrypted: data.isEncrypted ?? true,
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
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}) {
  const db = await getDb();
  if (!db) return;

  try {
    await db.insert(auditLog).values({
      userId: data.userId,
      action: data.action,
      entityType: data.entityType,
      entityId: data.entityId || null,
      details: data.details ? JSON.stringify(data.details) : null,
      ipAddress: data.ipAddress || null,
      userAgent: data.userAgent || null,
    });
  } catch (error) {
    console.error("[Audit Log] Failed to log event:", error);
    // Don't throw - audit logging should not break the main operation
  }
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

// ============ NOTIFICATION PREFERENCES ============

export async function getNotificationPreferences(userId: number) {
  const db = await getDb();
  if (!db) return null;

  try {
    const result = await db
      .select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.userId, userId))
      .limit(1);

    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error("Error fetching notification preferences:", error);
    return null;
  }
}

export async function createNotificationPreferences(userId: number) {
  const db = await getDb();
  if (!db) return null;

  try {
    const result = await db.insert(notificationPreferences).values({
      userId,
      enableCheckInNotifications: true,
      enableCheckOutNotifications: true,
      enableLeaveApprovalNotifications: true,
      enableOvertimeAlerts: true,
      quietHoursEnabled: false,
      quietHoursTimezone: "UTC",
      notificationChannels: { inApp: true, email: false, push: false },
    });

    return await getNotificationPreferences(userId);
  } catch (error) {
    console.error("Error creating notification preferences:", error);
    return null;
  }
}

export async function updateNotificationPreferences(
  userId: number,
  updates: {
    enableCheckInNotifications?: boolean;
    enableCheckOutNotifications?: boolean;
    enableLeaveApprovalNotifications?: boolean;
    enableOvertimeAlerts?: boolean;
    quietHoursEnabled?: boolean;
    quietHoursStart?: string | null;
    quietHoursEnd?: string | null;
    quietHoursTimezone?: string;
    notificationChannels?: {
      inApp?: boolean;
      email?: boolean;
      push?: boolean;
    };
  }
) {
  const db = await getDb();
  if (!db) return null;

  try {
    const existing = await getNotificationPreferences(userId);

    if (!existing) {
      // Create default preferences if they don't exist
      return await createNotificationPreferences(userId);
    }

    // Merge notification channels
    const currentChannels = existing.notificationChannels as any || { inApp: true, email: false, push: false };
    const newChannels = updates.notificationChannels
      ? { ...currentChannels, ...updates.notificationChannels }
      : currentChannels;

    await db
      .update(notificationPreferences)
      .set({
        enableCheckInNotifications: updates.enableCheckInNotifications ?? existing.enableCheckInNotifications,
        enableCheckOutNotifications: updates.enableCheckOutNotifications ?? existing.enableCheckOutNotifications,
        enableLeaveApprovalNotifications: updates.enableLeaveApprovalNotifications ?? existing.enableLeaveApprovalNotifications,
        enableOvertimeAlerts: updates.enableOvertimeAlerts ?? existing.enableOvertimeAlerts,
        quietHoursEnabled: updates.quietHoursEnabled ?? existing.quietHoursEnabled,
        quietHoursStart: updates.quietHoursStart !== undefined ? updates.quietHoursStart : existing.quietHoursStart,
        quietHoursEnd: updates.quietHoursEnd !== undefined ? updates.quietHoursEnd : existing.quietHoursEnd,
        quietHoursTimezone: updates.quietHoursTimezone ?? existing.quietHoursTimezone,
        notificationChannels: newChannels as any,
        updatedAt: new Date(),
      })
      .where(eq(notificationPreferences.userId, userId));

    return await getNotificationPreferences(userId);
  } catch (error) {
    console.error("Error updating notification preferences:", error);
    return null;
  }
}

export function isWithinQuietHours(preferences: any): boolean {
  if (!preferences?.quietHoursEnabled) return false;

  const start = preferences.quietHoursStart; // HH:MM
  const end = preferences.quietHoursEnd; // HH:MM

  if (!start || !end) return false;

  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  // Simple string comparison for HH:MM format
  if (start <= end) {
    // Normal case: 09:00 to 18:00
    return currentTime >= start && currentTime <= end;
  } else {
    // Overnight case: 22:00 to 06:00
    return currentTime >= start || currentTime <= end;
  }
}

// Notification History Functions
export async function logNotification(data: {
  userId: number;
  title: string;
  content: string;
  eventType: "CHECK_IN" | "CHECK_OUT" | "LEAVE_APPROVAL" | "OVERTIME_ALERT" | "SYSTEM";
  eventEntityId?: number;
  channels: { inApp: boolean; email: boolean; push: boolean };
}) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot log notification: database not available");
    return;
  }
  const result = await db
    .insert(notificationHistory)
    .values({
      userId: data.userId,
      title: data.title,
      content: data.content,
      eventType: data.eventType,
      eventEntityId: data.eventEntityId,
      channels: data.channels,
      deliveryStatus: "PENDING",
    });
  return result;
}

export async function getNotificationHistory(
  userId: number,
  options?: {
    limit?: number;
    offset?: number;
    eventType?: string;
    deliveryStatus?: string;
    startDate?: Date;
    endDate?: Date;
  }
) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get notification history: database not available");
    return [];
  }
  const conditions = [eq(notificationHistory.userId, userId)];

  if (options?.eventType) {
    conditions.push(eq(notificationHistory.eventType, options.eventType as any));
  }

  if (options?.deliveryStatus) {
    conditions.push(eq(notificationHistory.deliveryStatus, options.deliveryStatus as any));
  }

  if (options?.startDate) {
    conditions.push(gte(notificationHistory.createdAt, options.startDate));
  }

  if (options?.endDate) {
    conditions.push(lte(notificationHistory.createdAt, options.endDate));
  }

  let query: any = db
    .select({
      id: notificationHistory.id,
      userId: notificationHistory.userId,
      title: notificationHistory.title,
      content: notificationHistory.content,
      eventType: notificationHistory.eventType,
      eventEntityId: notificationHistory.eventEntityId,
      deliveryStatus: notificationHistory.deliveryStatus,
      readAt: notificationHistory.readAt,
      archivedAt: notificationHistory.archivedAt,
      createdAt: notificationHistory.createdAt,
      updatedAt: notificationHistory.updatedAt,
    })
    .from(notificationHistory)
    .where(and(...conditions))
    .orderBy(desc(notificationHistory.createdAt));

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  if (options?.offset) {
    query = query.offset(options.offset);
  }

  return await query;
}

export async function updateNotificationStatus(
  notificationId: number,
  status: "PENDING" | "SENT" | "DELIVERED" | "FAILED",
  details?: any
) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot update notification status: database not available");
    return;
  }
  return await db
    .update(notificationHistory)
    .set({
      deliveryStatus: status,
      deliveryDetails: details || {},
    })
    .where(eq(notificationHistory.id, notificationId));
}

export async function markNotificationAsRead(notificationId: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot mark notification as read: database not available");
    return;
  }
  return await db
    .update(notificationHistory)
    .set({ readAt: new Date() })
    .where(eq(notificationHistory.id, notificationId));
}

export async function archiveNotification(notificationId: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot archive notification: database not available");
    return;
  }
  return await db
    .update(notificationHistory)
    .set({ archivedAt: new Date() })
    .where(eq(notificationHistory.id, notificationId));
}


// ============ OVERTIME MANAGEMENT ============

export function calculateOvertimeHours(checkInTime: Date, checkOutTime: Date, standardHours: number = 8): number {
  if (!checkInTime || !checkOutTime) return 0;
  
  const durationMs = checkOutTime.getTime() - checkInTime.getTime();
  const durationHours = durationMs / (1000 * 60 * 60);
  
  // Overtime is any hours worked beyond the standard hours
  const overtimeHours = Math.max(0, durationHours - standardHours);
  
  return Math.round(overtimeHours * 100) / 100; // Round to 2 decimal places
}

export async function logOvertimeAlert(data: {
  userId: number;
  attendanceId: number;
  overtimeHours: number;
  checkInTime: Date;
  checkOutTime: Date;
}) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot log overtime alert: database not available");
    return;
  }

  // Log as audit event for tracking
  await logAuditEvent({
    userId: data.userId,
    action: "OVERTIME_LOGGED",
    entityType: "attendance",
    entityId: data.attendanceId,
    details: { overtimeHours: data.overtimeHours, checkInTime: data.checkInTime, checkOutTime: data.checkOutTime },
    ipAddress: "system",
  });

  return true;
}
