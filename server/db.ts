import { drizzle } from "drizzle-orm/mysql2";
import { and, eq, gte, lte, desc, asc, isNotNull } from "drizzle-orm";
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
  reportSchedules,
  reportDeliveryHistory,
  type ReportSchedule,
  type InsertReportSchedule,
  type InsertReportDeliveryHistory,
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

  try {
    // Convert string coordinates to numbers for decimal fields
    const lat = parseFloat(data.checkInLat);
    const lng = parseFloat(data.checkInLng);
    const accuracy = parseFloat(data.checkInAccuracy);

    // Validate coordinates are valid numbers
    if (isNaN(lat) || isNaN(lng) || isNaN(accuracy)) {
      throw new Error('Invalid coordinate values');
    }

    const result = await db.insert(attendance).values({
      userId: data.userId,
      checkInTime: new Date(),
      checkInLat: lat as any,
      checkInLng: lng as any,
      checkInAccuracy: accuracy as any,
      workModality: data.workModality as any,
    });

    return result;
  } catch (error) {
    console.error('Error creating attendance record:', error);
    throw error;
  }
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

  try {
    // Convert string coordinates to numbers for decimal fields
    const checkOutLat = parseFloat(data.checkOutLat);
    const checkOutLng = parseFloat(data.checkOutLng);
    const checkOutAccuracy = parseFloat(data.checkOutAccuracy);
    const distance = parseFloat(data.distanceTraveled);

    // Validate coordinates are valid numbers
    if (isNaN(checkOutLat) || isNaN(checkOutLng) || isNaN(checkOutAccuracy) || isNaN(distance)) {
      throw new Error('Invalid coordinate or distance values');
    }

    await db
      .update(attendance)
      .set({
        checkOutTime,
        checkOutLat: checkOutLat as any,
        checkOutLng: checkOutLng as any,
        checkOutAccuracy: checkOutAccuracy as any,
        distanceTraveled: distance as any,
        durationMinutes,
        overtimeMinutes,
        updatedAt: new Date(),
      })
      .where(eq(attendance.id, attendanceId));
  } catch (error) {
    console.error('Error completing attendance record:', error);
    throw error;
  }
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

  try {
    await db.insert(emailNotifications).values({
      userId: data.userId,
      type: data.type,
      subject: data.subject,
      content: data.content || "",
      sentAt: new Date(),
    });
  } catch (error) {
    console.error("[Database] Error creating email notification:", error);
    // Don't throw - email notifications are non-critical
  }
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


// ============ OVERTIME APPROVAL WORKFLOW ============

export interface OvertimeRecord {
  attendanceId: number;
  staffId: number;
  staffName: string;
  overtimeHours: number;
  checkInTime: Date;
  checkOutTime: Date;
  overtimeDate: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  approvalNotes?: string;
  payoutMultiplier?: number;
  payoutAmount?: number;
}

// Store overtime approvals in memory/audit log (using existing audit system)
export async function recordOvertimeApproval(data: {
  attendanceId: number;
  staffId: number;
  staffName: string;
  overtimeHours: number;
  status: "APPROVED" | "REJECTED";
  approvedBy: number;
  approvalNotes: string;
  payoutMultiplier?: number;
  payoutAmount?: number;
}) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot record overtime approval: database not available");
    return;
  }

  // Log approval in audit trail
  await logAuditEvent({
    userId: data.approvedBy,
    action: `OVERTIME_${data.status}`,
    entityType: "attendance",
    entityId: data.attendanceId,
    details: {
      staffName: data.staffName,
      overtimeHours: data.overtimeHours,
      approvalNotes: data.approvalNotes,
      payoutMultiplier: data.payoutMultiplier || 1.5,
      payoutAmount: data.payoutAmount || 0,
    },
    ipAddress: "system",
  });

  return true;
}

export async function getPendingOvertimeRecords(): Promise<OvertimeRecord[]> {
  // Query attendance records with overtime from the last 30 days
  // This is a simplified version - in production, you'd query a dedicated overtime table
  const db = await getDb();
  if (!db) return [];

  try {
    const records = await db
      .select({
        attendanceId: attendance.id,
        staffId: attendance.userId,
        staffName: users.name,
        checkInTime: attendance.checkInTime,
        checkOutTime: attendance.checkOutTime,
      })
      .from(attendance)
      .innerJoin(users, eq(attendance.userId, users.id))
      .where(
        and(
          gte(attendance.checkInTime, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)), // Last 30 days
          isNotNull(attendance.checkOutTime)
        )
      )
      .limit(100);

    return records.map((r) => {
      const checkIn = new Date(r.checkInTime);
      const checkOut = new Date(r.checkOutTime!);
      const hoursWorked = (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60);
      const overtimeHours = Math.max(0, hoursWorked - 8);

      return {
        attendanceId: r.attendanceId,
        staffId: r.staffId,
        staffName: r.staffName || "Unknown",
        overtimeHours: Math.round(overtimeHours * 100) / 100,
        checkInTime: checkIn,
        checkOutTime: checkOut,
        overtimeDate: checkIn.toISOString().split("T")[0],
        status: "PENDING",
      };
    });
  } catch (error) {
    console.error("[Database] Error fetching pending overtime records:", error);
    return [];
  }
}

export function calculatePayoutAmount(
  overtimeHours: number,
  hourlyRate: number,
  multiplier: number = 1.5
): number {
  return Math.round(overtimeHours * hourlyRate * multiplier * 100) / 100;
}


// ============ TIMESHEET EXPORT FUNCTIONS ============

export interface TimesheetExportData {
  date: string;
  staffNumber?: number;
  staffName: string;
  checkInTime: string;
  checkOutTime: string;
  hoursWorked: number;
  overtimeHours: number;
  location: string;
  remarks: string;
}

export async function getTimesheetDataForExport(data: {
  staffId?: number;
  startDate: Date;
  endDate: Date;
}): Promise<TimesheetExportData[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot fetch timesheet data: database not available");
    return [];
  }

  try {
    let query = db
      .select({
        id: attendance.id,
        userId: attendance.userId,
        userName: users.name,
        staffNumber: users.staffNumber,
        checkInTime: attendance.checkInTime,
        checkOutTime: attendance.checkOutTime,
        location: attendance.workModality,
        remarks: supervisorRemarks.encryptedRemark,
      })
      .from(attendance)
      .innerJoin(users, eq(attendance.userId, users.id))
      .leftJoin(supervisorRemarks, eq(attendance.id, supervisorRemarks.attendanceId))
      .where(
        and(
          gte(attendance.checkInTime, data.startDate),
          lte(attendance.checkInTime, data.endDate),
          data.staffId ? eq(attendance.userId, data.staffId) : undefined
        )
      )
      .orderBy(desc(attendance.checkInTime));

    const records = await query;

    return records.map((r) => {
      const checkIn = new Date(r.checkInTime);
      const checkOut = r.checkOutTime ? new Date(r.checkOutTime) : null;
      const hoursWorked = checkOut
        ? (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60)
        : 0;
      const overtimeHours = Math.max(0, hoursWorked - 8);

      return {
        date: checkIn.toISOString().split("T")[0],
        staffNumber: r.staffNumber || undefined,
        staffName: r.userName || "Unknown",
        checkInTime: checkIn.toLocaleTimeString(),
        checkOutTime: checkOut ? checkOut.toLocaleTimeString() : "Not checked out",
        hoursWorked: Math.round(hoursWorked * 100) / 100,
        overtimeHours: Math.round(overtimeHours * 100) / 100,
        location: r.location || "Not specified",
        remarks: r.remarks || "No remarks",
      };
    });
  } catch (error) {
    console.error("[Database] Error fetching timesheet data:", error);
    return [];
  }
}

export function generateCSVContent(data: TimesheetExportData[]): string {
  const headers = ["Staff #", "Date", "Staff Name", "Check-in", "Check-out", "Hours Worked", "Overtime", "Location", "Remarks"];
  const rows = data.map((row) => [
    row.staffNumber ? String(row.staffNumber).padStart(3, '0') : "-",
    row.date,
    row.staffName,
    row.checkInTime,
    row.checkOutTime,
    row.hoursWorked,
    row.overtimeHours,
    row.location,
    `"${row.remarks.replace(/"/g, '""')}"`, // Escape quotes in remarks
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map((row) => row.join(",")),
  ].join("\n");

  return csvContent;
}

export function generateExcelContent(data: TimesheetExportData[]): string {
  // Generate HTML that can be saved as Excel format
  const html = `
    <html>
      <head>
        <meta charset="UTF-8">
        <style>
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid black; padding: 8px; text-align: left; }
          th { background-color: #4472C4; color: white; font-weight: bold; }
          tr:nth-child(even) { background-color: #f2f2f2; }
        </style>
      </head>
      <body>
        <h2>Timesheet Report</h2>
        <p>Generated: ${new Date().toLocaleString()}</p>
        <table>
          <thead>
            <tr>
              <th>Staff #</th>
              <th>Date</th>
              <th>Staff Name</th>
              <th>Check-in</th>
              <th>Check-out</th>
              <th>Hours Worked</th>
              <th>Overtime</th>
              <th>Location</th>
              <th>Remarks</th>
            </tr>
          </thead>
          <tbody>
            ${data
              .map(
                (row) => `
              <tr>
                <td>${row.staffNumber ? String(row.staffNumber).padStart(3, '0') : '-'}</td>
                <td>${row.date}</td>
                <td>${row.staffName}</td>
                <td>${row.checkInTime}</td>
                <td>${row.checkOutTime}</td>
                <td>${row.hoursWorked}</td>
                <td>${row.overtimeHours}</td>
                <td>${row.location}</td>
                <td>${row.remarks}</td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
        <p style="margin-top: 20px; font-size: 12px; color: #666;">
          Total Records: ${data.length} | Total Hours: ${data.reduce((sum, r) => sum + r.hoursWorked, 0).toFixed(2)} | Total Overtime: ${data.reduce((sum, r) => sum + r.overtimeHours, 0).toFixed(2)}
        </p>
      </body>
    </html>
  `;
  return html;
}


// ============ STAFF NUMBERING SYSTEM ============

/**
 * Get the next available staff number (1-100)
 * Returns the lowest available number or null if all 100 are taken
 */
export async function getNextAvailableStaffNumber(): Promise<number | null> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get next staff number: database not available");
    return null;
  }

  try {
    // Get all assigned staff numbers
    const assignedNumbers = await db
      .select({ staffNumber: users.staffNumber })
      .from(users)
      .where(isNotNull(users.staffNumber));

    const assignedSet = new Set(assignedNumbers.map(u => u.staffNumber));

    // Find the first available number from 1 to 100
    for (let i = 1; i <= 100; i++) {
      if (!assignedSet.has(i)) {
        return i;
      }
    }

    // All 100 numbers are taken
    return null;
  } catch (error) {
    console.error("[Database] Error getting next staff number:", error);
    return null;
  }
}

/**
 * Assign a staff number to a user if they don't have one
 * Called on first login
 */
export async function assignStaffNumberIfNeeded(userId: number): Promise<number | null> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot assign staff number: database not available");
    return null;
  }

  try {
    // Check if user already has a staff number
    const user = await db
      .select({ staffNumber: users.staffNumber })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (user.length > 0 && user[0].staffNumber !== null) {
      // User already has a number
      return user[0].staffNumber;
    }

    // Get next available number
    const nextNumber = await getNextAvailableStaffNumber();
    if (nextNumber === null) {
      console.warn("[Database] No available staff numbers (all 100 taken)");
      return null;
    }

    // Assign the number
    await db
      .update(users)
      .set({ staffNumber: nextNumber })
      .where(eq(users.id, userId));

    return nextNumber;
  } catch (error) {
    console.error("[Database] Error assigning staff number:", error);
    return null;
  }
}

/**
 * Get user with staff number
 */
export async function getUserWithStaffNumber(userId: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user with staff number: database not available");
    return null;
  }

  try {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error("[Database] Error getting user with staff number:", error);
    return null;
  }
}


// ============ STATISTICS FUNCTIONS ============

/**
 * Get all leave balances for a user (all types for current year)
 */
export async function getAllLeaveBalances(userId: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get leave balances: database not available");
    return null;
  }

  try {
    const currentYear = new Date().getFullYear();
    const leaveTypes = ["annual", "sick", "casual", "maternity"];
    const balances: Record<string, number> = {
      annual: 0,
      sick: 0,
      casual: 0,
      maternity: 0,
    };

    for (const leaveType of leaveTypes) {
      const result = await db
        .select({
          remainingDays: leaveBalance.remainingDays,
        })
        .from(leaveBalance)
        .where(
          and(
            eq(leaveBalance.userId, userId),
            eq(leaveBalance.leaveType, leaveType as "annual" | "sick" | "maternity" | "unpaid" | "other"),
            eq(leaveBalance.year, currentYear)
          )
        )
        .limit(1);

      if (result.length > 0 && result[0].remainingDays) {
        balances[leaveType] = Number(result[0].remainingDays);
      }
    }

    return balances;
  } catch (error) {
    console.error("[Database] Error fetching leave balances:", error);
    return null;
  }
}

/**
 * Get total hours worked in a date range for a user
 */
export async function getHoursWorkedInRange(
  userId: number,
  startDate: Date,
  endDate: Date
): Promise<number> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get hours worked: database not available");
    return 0;
  }

  try {
    const records = await db
      .select({
        checkInTime: attendance.checkInTime,
        checkOutTime: attendance.checkOutTime,
      })
      .from(attendance)
      .where(
        and(
          eq(attendance.userId, userId),
          gte(attendance.checkInTime, startDate),
          lte(attendance.checkInTime, endDate)
        )
      );

    let totalHours = 0;
    for (const record of records) {
      if (record.checkInTime && record.checkOutTime) {
        const checkIn = new Date(record.checkInTime);
        const checkOut = new Date(record.checkOutTime);
        const hours = (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60);
        totalHours += hours;
      }
    }

    return Math.round(totalHours * 100) / 100;
  } catch (error) {
    console.error("[Database] Error calculating hours worked:", error);
    return 0;
  }
}


// ============ REPORT SCHEDULING ============

export async function createReportSchedule(
  schedule: InsertReportSchedule
): Promise<ReportSchedule | null> {
  try {
    const db = await getDb();
    if (!db) return null;

    const result = await db.insert(reportSchedules).values(schedule);
    const id = result[0].insertId;
    
    return await db
      .select()
      .from(reportSchedules)
      .where(eq(reportSchedules.id, id as number))
      .then((rows) => rows[0] || null);
  } catch (error) {
    console.error("[Database] Error creating report schedule:", error);
    return null;
  }
}

export async function getReportSchedules(userId: number): Promise<ReportSchedule[]> {
  try {
    const db = await getDb();
    if (!db) return [];

    return await db
      .select()
      .from(reportSchedules)
      .where(eq(reportSchedules.userId, userId));
  } catch (error) {
    console.error("[Database] Error fetching report schedules:", error);
    return [];
  }
}

export async function getActiveReportSchedules(): Promise<ReportSchedule[]> {
  try {
    const db = await getDb();
    if (!db) return [];

    return await db
      .select()
      .from(reportSchedules)
      .where(eq(reportSchedules.isActive, true));
  } catch (error) {
    console.error("[Database] Error fetching active report schedules:", error);
    return [];
  }
}

export async function updateReportSchedule(
  id: number,
  updates: Partial<InsertReportSchedule>
): Promise<ReportSchedule | null> {
  try {
    const db = await getDb();
    if (!db) return null;

    await db
      .update(reportSchedules)
      .set(updates)
      .where(eq(reportSchedules.id, id));

    return await db
      .select()
      .from(reportSchedules)
      .where(eq(reportSchedules.id, id))
      .then((rows) => rows[0] || null);
  } catch (error) {
    console.error("[Database] Error updating report schedule:", error);
    return null;
  }
}

export async function deleteReportSchedule(id: number): Promise<boolean> {
  try {
    const db = await getDb();
    if (!db) return false;

    await db.delete(reportSchedules).where(eq(reportSchedules.id, id));
    return true;
  } catch (error) {
    console.error("[Database] Error deleting report schedule:", error);
    return false;
  }
}

export async function logReportDelivery(
  delivery: InsertReportDeliveryHistory
): Promise<boolean> {
  try {
    const db = await getDb();
    if (!db) return false;

    await db.insert(reportDeliveryHistory).values(delivery);
    return true;
  } catch (error) {
    console.error("[Database] Error logging report delivery:", error);
    return false;
  }
}

export async function getReportDeliveryHistory(
  scheduleId: number,
  limit: number = 10
): Promise<any[]> {
  try {
    const db = await getDb();
    if (!db) return [];

    return await db
      .select()
      .from(reportDeliveryHistory)
      .where(eq(reportDeliveryHistory.scheduleId, scheduleId))
      .orderBy(desc(reportDeliveryHistory.createdAt))
      .limit(limit);
  } catch (error) {
    console.error("[Database] Error fetching report delivery history:", error);
    return [];
  }
}


// ============ ADMIN MANAGEMENT ============

export async function getUserByEmail(email: string): Promise<any> {
  try {
    const db = await getDb();
    if (!db) return null;
    const result = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    return result[0] || null;
  } catch (error) {
    console.error("[Database] Error fetching user by email:", error);
    return null;
  }
}

export async function createAdminUser(data: {
  email: string;
  name: string;
  password: string;
  department?: string;
  phoneNumber?: string;
  role: string;
}): Promise<any> {
  try {
    const db = await getDb();
    if (!db) throw new Error("Database not connected");

    // In a real app, you would hash the password here
    // For now, we'll just create the user with the password as-is
    // TODO: Implement proper password hashing with bcrypt
    
    const result = await db
      .insert(users)
      .values({
        email: data.email,
        name: data.name,
        department: data.department,
        phoneNumber: data.phoneNumber,
        role: data.role as any,
        isActive: true,
        loginMethod: "email", // or "password" - depends on your auth system
        openId: `admin_${Date.now()}`, // Generate a unique ID for non-OAuth users
      });

    // Fetch and return the created user
    const createdUser = await getUserByEmail(data.email);
    return createdUser;
  } catch (error) {
    console.error("[Database] Error creating admin user:", error);
    throw error;
  }
}

export async function deleteUser(userId: number): Promise<boolean> {
  try {
    const db = await getDb();
    if (!db) return false;
    
    await db.delete(users).where(eq(users.id, userId));
    return true;
  } catch (error) {
    console.error("[Database] Error deleting user:", error);
    return false;
  }
}


export async function getAllStaffCheckedInToday() {
  try {
    const db = await getDb();
    if (!db) return { checkedInCount: 0, staffList: [] };

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get all attendance records for today
    const todayRecords = await db
      .select()
      .from(attendance)
      .where(
        and(
          gte(attendance.checkInTime, today),
          lte(attendance.checkInTime, tomorrow)
        )
      )
      .orderBy(desc(attendance.checkInTime));

    // Get unique user IDs
    const userIdSet = new Set(todayRecords.map(r => r.userId));
    const userIds = Array.from(userIdSet);

    // Get user details
    const staffDetails = await db
      .select()
      .from(users);

    // Enrich attendance data with user info
    const staffList = userIds.map(userId => {
      const userInfo = staffDetails.find(u => u.id === userId);
      // Only include staff members, not admins
      if (userInfo?.role === 'admin' || userInfo?.role === 'supervisor') return null;
      
      const userRecords = todayRecords.filter(r => r.userId === userId);
      const latestRecord = userRecords[0];

      return {
        userId,
        name: userInfo?.name || `Staff ${userId}`,
        checkInTime: latestRecord?.checkInTime,
        checkOutTime: latestRecord?.checkOutTime,
        status: latestRecord?.checkOutTime ? 'Checked Out' : 'Checked In',
        workModality: latestRecord?.workModality || 'On-site',
        checkInLat: latestRecord?.checkInLat,
        checkInLng: latestRecord?.checkInLng,
      };
    }).filter(item => item !== null);

    return {
      checkedInCount: staffList.length,
      staffList,
    };
  } catch (error) {
    console.error('[Database] Error getting staff checked in today:', error);
    return { checkedInCount: 0, staffList: [] };
  }
}
