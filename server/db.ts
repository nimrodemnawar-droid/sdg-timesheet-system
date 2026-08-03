import { drizzle } from "drizzle-orm/mysql2";
import { and, eq, gte, lte, desc, asc, isNotNull, sql } from "drizzle-orm";
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
  manualApprovalRequests,
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

    const result = await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });

    // Get the user ID (either newly created or existing)
    const userRecord = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.openId, user.openId))
      .limit(1);

    if (userRecord.length > 0) {
      // Assign staff number if needed (on first login)
      await assignStaffNumberIfNeeded(userRecord[0].id);
    }
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
  checkInAddress?: string;
}) {
  const db = await getDb();
  if (!db) return undefined;

  try {
    // Convert string coordinates to numbers for decimal fields
    const lat = parseFloat(data.checkInLat);
    const lng = parseFloat(data.checkInLng);
    let accuracy = parseFloat(data.checkInAccuracy);

    // Validate coordinates are valid numbers
    if (isNaN(lat) || isNaN(lng) || isNaN(accuracy)) {
      throw new Error('Invalid coordinate values');
    }

    // Convert accuracy from meters to kilometers to fit within database column (precision: 6, scale: 2)
    // Database column can hold max 9999.99, so convert meters to km
    // If accuracy is > 1000 meters (1km), it's likely in meters from GPS, so divide by 1000
    if (accuracy > 1000) {
      accuracy = accuracy / 1000; // Convert from meters to kilometers
    }

    await db.insert(attendance).values({
      userId: data.userId,
      checkInTime: new Date(),
      checkInLat: lat as any,
      checkInLng: lng as any,
      checkInAccuracy: accuracy as any,
      workModality: data.workModality as any,
      checkInAddress: data.checkInAddress,
    });

    // Return the created record with address information
    return {
      checkInAddress: data.checkInAddress,
      checkInLat: lat,
      checkInLng: lng,
      checkInAccuracy: accuracy,
      checkInTime: new Date(),
    };
  } catch (error) {
    console.error('Error creating attendance record:', error);
    throw error;
  }
}

export async function checkIn(
  userId: number,
  data: {
    latitude: number;
    longitude: number;
    accuracy: number;
    timestamp: Date;
    encryptedLocation: { encryptedData: string; iv: string };
    address?: string;
  }
) {
  return createAttendance({
    userId,
    checkInLat: data.latitude.toString(),
    checkInLng: data.longitude.toString(),
    checkInAccuracy: data.accuracy.toString(),
    checkInAddress: data.address || `${data.latitude.toFixed(4)}, ${data.longitude.toFixed(4)}`,
  });
}

export async function checkOut(
  attendanceId: number,
  data: {
    latitude: number;
    longitude: number;
    accuracy: number;
    timestamp: Date;
    encryptedLocation: { encryptedData: string; iv: string };
    address?: string;
  }
) {
  // Get current attendance to calculate distance
  const db = await getDb();
  if (!db) return;
  
  const record = await db
    .select()
    .from(attendance)
    .where(eq(attendance.id, attendanceId))
    .limit(1);

  if (!record.length) return;

  const checkInLat = parseFloat(record[0].checkInLat as any);
  const checkInLng = parseFloat(record[0].checkInLng as any);
  
  // Simple distance calculation (Haversine formula)
  const R = 6371; // Earth's radius in km
  const dLat = (data.latitude - checkInLat) * Math.PI / 180;
  const dLng = (data.longitude - checkInLng) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(checkInLat * Math.PI / 180) * Math.cos(data.latitude * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c * 1000; // Convert to meters
  
  // Convert checkout accuracy from meters to kilometers to fit within database column
  let checkOutAccuracy = data.accuracy;
  if (checkOutAccuracy > 1000) {
    checkOutAccuracy = checkOutAccuracy / 1000; // Convert from meters to kilometers
  }
  
  return completeAttendance(attendanceId, {
    checkOutTime: data.timestamp,
    checkOutLat: data.latitude.toString(),
    checkOutLng: data.longitude.toString(),
    checkOutAccuracy: checkOutAccuracy.toString(),
    checkOutAddress: data.address || `${data.latitude.toFixed(4)}, ${data.longitude.toFixed(4)}`,
    distanceTraveled: distance.toString(),
  } as any);
}

export async function completeAttendance(
  attendanceId: number,
  data: {
    checkOutTime?: Date;
    checkOutLat: string;
    checkOutLng: string;
    checkOutAccuracy: string;
    distanceTraveled: string;
    checkOutAddress?: string;
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
  const checkOutTime = data.checkOutTime || new Date();
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
        checkOutAddress: data.checkOutAddress || `${checkOutLat.toFixed(4)}, ${checkOutLng.toFixed(4)}`,
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

  if (result.length === 0) return null;
  
  const record = result[0];
  
  // Calculate duration in minutes if both check-in and check-out times exist
  let durationMinutes = 0;
  if (record.checkInTime && record.checkOutTime) {
    const checkInTime = new Date(record.checkInTime).getTime();
    const checkOutTime = new Date(record.checkOutTime).getTime();
    durationMinutes = Math.floor((checkOutTime - checkInTime) / (1000 * 60));
  }
  
  return {
    ...record,
    durationMinutes
  };
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

  const result = await db
    .select({
      id: leaveRequests.id,
      userId: leaveRequests.userId,
      staffName: users.name,
      staffEmail: users.email,
      staffNumber: users.staffNumber,
      leaveType: leaveRequests.leaveType,
      startDate: leaveRequests.startDate,
      endDate: leaveRequests.endDate,
      daysRequested: leaveRequests.daysRequested,
      reason: leaveRequests.reason,
      status: leaveRequests.status,
      approvedBy: leaveRequests.approvedBy,
      approvalReason: leaveRequests.approvalReason,
      approvedAt: leaveRequests.approvedAt,
      createdAt: leaveRequests.createdAt,
      updatedAt: leaveRequests.updatedAt,
    })
    .from(leaveRequests)
    .leftJoin(users, eq(leaveRequests.userId, users.id))
    .where(eq(leaveRequests.status, "pending"))
    .orderBy(asc(leaveRequests.createdAt));

  return result;
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

  const user = await db.select().from(users).where(eq(users.id, leaveRequest.userId)).limit(1);
  const staffUser = user[0];

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

  // Store notification for staff
  if (staffUser && staffUser.id) {
    const startDate = new Date(leaveRequest.startDate).toLocaleDateString();
    const endDate = new Date(leaveRequest.endDate).toLocaleDateString();
    await db.insert(emailNotifications).values({
      type: 'leave_approved',
      userId: staffUser.id,
      subject: 'Leave Request Approved',
      content: `Your ${leaveRequest.leaveType} leave request from ${startDate} to ${endDate} has been approved.${reason ? ` Reason: ${reason}` : ''}`,
      sentAt: new Date(),
    });
  }
}

export async function rejectLeaveRequest(
  leaveRequestId: number,
  approvedBy: number,
  reason?: string
) {
  const db = await getDb();
  if (!db) return;

  const leaveRequest = await getLeaveRequest(leaveRequestId);
  if (!leaveRequest) return;

  const user = await db.select().from(users).where(eq(users.id, leaveRequest.userId)).limit(1);
  const staffUser = user[0];

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

  // Store notification for staff
  if (staffUser && staffUser.id) {
    const startDate = new Date(leaveRequest.startDate).toLocaleDateString();
    const endDate = new Date(leaveRequest.endDate).toLocaleDateString();
    await db.insert(emailNotifications).values({
      type: 'leave_rejected',
      userId: staffUser.id,
      subject: 'Leave Request Rejected',
      content: `Your ${leaveRequest.leaveType} leave request from ${startDate} to ${endDate} has been rejected.${reason ? ` Reason: ${reason}` : ''}`,
      sentAt: new Date(),
    });
  }
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
      type: data.type,
      userId: data.userId,
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
  // Staff Information
  staffNumber?: number | string;
  staffName: string;
  staffEmail: string;
  
  // Date & Time
  date: string;
  checkInTime: string;
  checkOutTime: string;
  
  // Location Data
  checkInCoordinates: string;
  checkInAddress: string;
  checkOutCoordinates: string;
  checkOutAddress: string;
  
  // Hours & Distance
  hoursWorked: number | string;
  overtimeHours: number | string;
  distanceTraveled: string;
  
  // Work Details
  workModality: string;
  activityCategory: string;
  sdgGoal: string;
  kpi: string;
  taskDescription: string;
  staffRemarks: string;
  
  // Session Times
  amStartTime: string;
  amEndTime: string;
  pmStartTime: string;
  pmEndTime: string;
  
  // Additional Info
  program: string;
  evidenceUploadKey: string;
  isSubmitted: boolean | string;
  submittedAt: string;
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
    // Use getCompleteTimesheetData which already retrieves all necessary fields
    const records = await getCompleteTimesheetData({
      staffId: data.staffId,
      startDate: data.startDate,
      endDate: data.endDate,
    });

    // Transform to TimesheetExportData format
    return records.map((r) => {
      const hoursWorked = parseFloat(String(r.hoursWorked));
      const overtimeHours = Math.max(0, hoursWorked - 8);
      
      return {
        staffNumber: r.staffNumber,
        staffName: r.staffName,
        staffEmail: r.staffEmail,
        date: r.date,
        checkInTime: r.checkInTime,
        checkOutTime: r.checkOutTime,
        checkInCoordinates: r.checkInCoordinates,
        checkInAddress: r.checkInAddress,
        checkOutCoordinates: r.checkOutCoordinates,
        checkOutAddress: r.checkOutAddress,
        hoursWorked,
        overtimeHours: Math.round(overtimeHours * 100) / 100,
        distanceTraveled: r.distanceTraveled,
        workModality: r.workModality,
        activityCategory: r.activityCategory,
        sdgGoal: r.sdgGoal,
        kpi: r.kpi,
        taskDescription: r.taskDescription,
        staffRemarks: r.staffRemarks,
        amStartTime: r.amStartTime,
        amEndTime: r.amEndTime,
        pmStartTime: r.pmStartTime,
        pmEndTime: r.pmEndTime,
        program: r.program,
        evidenceUploadKey: r.evidenceUploadKey,
        isSubmitted: r.isSubmitted,
        submittedAt: r.submittedAt,
      };
    });
  } catch (error) {
    console.error("[Database] Error fetching timesheet data:", error);
    return [];
  }
}

export function generateCSVContent(data: TimesheetExportData[]): string {
  const headers = [
    "Staff #", "Staff Name", "Staff Email", "Date",
    "Check-in Time", "Check-in Coordinates", "Check-in Address",
    "Check-out Time", "Check-out Coordinates", "Check-out Address",
    "Hours Worked", "Overtime Hours", "Distance Traveled",
    "Work Modality", "Activity Category", "SDG Goal", "KPI",
    "Task Description", "Staff Remarks",
    "AM Start", "AM End", "PM Start", "PM End",
    "Program", "Evidence Upload Key", "Submission Status", "Submitted At"
  ];
  
  const escapeCSV = (value: string): string => {
    const str = String(value || '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  
  const rows = data.map((row) => [
    row.staffNumber ? String(row.staffNumber).padStart(3, '0') : "-",
    escapeCSV(row.staffName),
    escapeCSV(row.staffEmail),
    row.date,
    row.checkInTime,
    escapeCSV(row.checkInCoordinates),
    escapeCSV(row.checkInAddress),
    row.checkOutTime,
    escapeCSV(row.checkOutCoordinates),
    escapeCSV(row.checkOutAddress),
    String(row.hoursWorked),
    String(row.overtimeHours),
    escapeCSV(row.distanceTraveled),
    escapeCSV(row.workModality),
    escapeCSV(row.activityCategory),
    escapeCSV(row.sdgGoal),
    escapeCSV(row.kpi),
    escapeCSV(row.taskDescription),
    escapeCSV(row.staffRemarks),
    row.amStartTime,
    row.amEndTime,
    row.pmStartTime,
    row.pmEndTime,
    escapeCSV(row.program),
    escapeCSV(row.evidenceUploadKey),
    String(row.isSubmitted),
    row.submittedAt,
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map((row) => row.join(",")),
  ].join("\n");

  return csvContent;
}

export function generateExcelContent(data: TimesheetExportData[]): string {
  // Generate HTML that can be saved as Excel format
  const totalHours = data.reduce((sum, r) => sum + (typeof r.hoursWorked === 'number' ? r.hoursWorked : parseFloat(String(r.hoursWorked)) || 0), 0);
  const totalOvertime = data.reduce((sum, r) => sum + (typeof r.overtimeHours === 'number' ? r.overtimeHours : parseFloat(String(r.overtimeHours)) || 0), 0);
  
  const html = `
    <html>
      <head>
        <meta charset="UTF-8">
        <style>
          table { border-collapse: collapse; width: 100%; font-size: 11px; }
          th, td { border: 1px solid #999; padding: 6px; text-align: left; }
          th { background-color: #4472C4; color: white; font-weight: bold; }
          tr:nth-child(even) { background-color: #f2f2f2; }
          .summary { margin-top: 20px; font-size: 12px; color: #333; font-weight: bold; }
        </style>
      </head>
      <body>
        <h2>Timesheet Report - Complete Data Export</h2>
        <p>Generated: ${new Date().toLocaleString()}</p>
        <table>
          <thead>
            <tr>
              <th>Staff #</th>
              <th>Staff Name</th>
              <th>Staff Email</th>
              <th>Date</th>
              <th>Check-in Time</th>
              <th>Check-in Coordinates</th>
              <th>Check-in Address</th>
              <th>Check-out Time</th>
              <th>Check-out Coordinates</th>
              <th>Check-out Address</th>
              <th>Hours Worked</th>
              <th>Overtime Hours</th>
              <th>Distance Traveled</th>
              <th>Work Modality</th>
              <th>Activity Category</th>
              <th>SDG Goal</th>
              <th>KPI</th>
              <th>Task Description</th>
              <th>Staff Remarks</th>
              <th>AM Start</th>
              <th>AM End</th>
              <th>PM Start</th>
              <th>PM End</th>
              <th>Program</th>
              <th>Evidence Upload Key</th>
              <th>Submission Status</th>
              <th>Submitted At</th>
            </tr>
          </thead>
          <tbody>
            ${data
              .map(
                (row) => `
              <tr>
                <td>${row.staffNumber ? String(row.staffNumber).padStart(3, '0') : '-'}</td>
                <td>${row.staffName}</td>
                <td>${row.staffEmail}</td>
                <td>${row.date}</td>
                <td>${row.checkInTime}</td>
                <td>${row.checkInCoordinates}</td>
                <td>${row.checkInAddress}</td>
                <td>${row.checkOutTime}</td>
                <td>${row.checkOutCoordinates}</td>
                <td>${row.checkOutAddress}</td>
                <td>${row.hoursWorked}</td>
                <td>${row.overtimeHours}</td>
                <td>${row.distanceTraveled}</td>
                <td>${row.workModality}</td>
                <td>${row.activityCategory}</td>
                <td>${row.sdgGoal}</td>
                <td>${row.kpi}</td>
                <td>${row.taskDescription}</td>
                <td>${row.staffRemarks}</td>
                <td>${row.amStartTime}</td>
                <td>${row.amEndTime}</td>
                <td>${row.pmStartTime}</td>
                <td>${row.pmEndTime}</td>
                <td>${row.program}</td>
                <td>${row.evidenceUploadKey}</td>
                <td>${row.isSubmitted}</td>
                <td>${row.submittedAt}</td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
        <p class="summary">
          Total Records: ${data.length} | Total Hours: ${totalHours.toFixed(2)} | Total Overtime: ${totalOvertime.toFixed(2)}
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


export async function getAllStaffAttendanceByDateRange(
  startDate: Date,
  endDate: Date
) {
  try {
    const db = await getDb();
    if (!db) return [];

    // Get all attendance records for the date range
    const rangeRecords = await db
      .select()
      .from(attendance)
      .where(
        and(
          gte(attendance.checkInTime, startDate),
          lte(attendance.checkInTime, endDate)
        )
      )
      .orderBy(desc(attendance.checkInTime));

    // Get unique user IDs
    const userIdSet = new Set(rangeRecords.map(r => r.userId));
    const userIds = Array.from(userIdSet);

    // Get user details
    const staffDetails = await db
      .select()
      .from(users);

    // Enrich attendance data with user info
    const staffList = rangeRecords.map(record => {
      const userInfo = staffDetails.find(u => u.id === record.userId);

      // Convert DECIMAL coordinates from MySQL to numbers
      const checkInLat = record.checkInLat ? parseFloat(String(record.checkInLat)) : null;
      const checkInLng = record.checkInLng ? parseFloat(String(record.checkInLng)) : null;
      const checkOutLat = record.checkOutLat ? parseFloat(String(record.checkOutLat)) : null;
      const checkOutLng = record.checkOutLng ? parseFloat(String(record.checkOutLng)) : null;
      const checkInAccuracy = record.checkInAccuracy ? parseFloat(String(record.checkInAccuracy)) : null;
      const checkOutAccuracy = record.checkOutAccuracy ? parseFloat(String(record.checkOutAccuracy)) : null;
      const distanceTraveled = record.distanceTraveled ? parseFloat(String(record.distanceTraveled)) : null;

      // Calculate hours worked if both check-in and check-out times exist
      let hoursWorked = 0;
      if (record.checkInTime && record.checkOutTime) {
        const checkInTime = new Date(record.checkInTime).getTime();
        const checkOutTime = new Date(record.checkOutTime).getTime();
        hoursWorked = parseFloat(((checkOutTime - checkInTime) / (1000 * 60 * 60)).toFixed(2));
      }

      // Calculate overtime (hours over 8)
      const overtimeHours = hoursWorked > 8 ? parseFloat((hoursWorked - 8).toFixed(2)) : 0;
      const isOvertime = hoursWorked > 8;

      return {
        userId: record.userId,
        userName: userInfo?.name || `Staff ${record.userId}`,
        staffNumber: userInfo?.staffNumber || record.userId,
        email: userInfo?.email || null,
        checkInTime: record.checkInTime,
        checkInAddress: record.checkInAddress || null,
        checkOutTime: record.checkOutTime,
        checkOutAddress: record.checkOutAddress || null,
        hoursWorked,
        overtimeHours,
        isOvertime,
        status: record.checkOutTime ? 'Checked Out' : 'Checked In',
        workModality: record.workModality || 'On-site',
        checkInLat: checkInLat,
        checkInLng: checkInLng,
        checkInAccuracy: checkInAccuracy,
        checkOutLat: checkOutLat,
        checkOutLng: checkOutLng,
        checkOutAccuracy: checkOutAccuracy,
        distanceTraveled: distanceTraveled,
        kpiId: record.kpiId || null,
        activityCategoryId: record.activityCategoryId || null,
        sdgGoalId: record.sdgGoalId || null,
        taskDescription: record.taskDescription || null,
        staffRemarks: record.staffRemarks || null,
        waypointCount: 0,
      };
    });

    console.log(`[DB] getAllStaffAttendanceByDateRange returning ${staffList.length} records`);
    return staffList;
  } catch (error) {
    console.error('[Database] Error getting staff attendance by date range:', error);
    return [];
  }
}

export async function getAllStaffCheckedInToday() {
  try {
    const db = await getDb();
    if (!db) return [];

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

    // Enrich attendance data with user info - include ALL users who checked in
    const staffList = userIds.map(userId => {
      const userInfo = staffDetails.find(u => u.id === userId);
      
      const userRecords = todayRecords.filter(r => r.userId === userId);
      const latestRecord = userRecords[0];

      if (!latestRecord) return null;

      // Convert DECIMAL coordinates from MySQL to numbers
      const checkInLat = latestRecord.checkInLat ? parseFloat(String(latestRecord.checkInLat)) : null;
      const checkInLng = latestRecord.checkInLng ? parseFloat(String(latestRecord.checkInLng)) : null;
      const checkOutLat = latestRecord.checkOutLat ? parseFloat(String(latestRecord.checkOutLat)) : null;
      const checkOutLng = latestRecord.checkOutLng ? parseFloat(String(latestRecord.checkOutLng)) : null;
      const checkInAccuracy = latestRecord.checkInAccuracy ? parseFloat(String(latestRecord.checkInAccuracy)) : null;
      const checkOutAccuracy = latestRecord.checkOutAccuracy ? parseFloat(String(latestRecord.checkOutAccuracy)) : null;
      const distanceTraveled = latestRecord.distanceTraveled ? parseFloat(String(latestRecord.distanceTraveled)) : null;

      // Validate coordinates are valid numbers - but don't skip if missing
      const hasValidCoordinates = checkInLat && checkInLng && !isNaN(checkInLat) && !isNaN(checkInLng);
      if (!hasValidCoordinates) {
        console.warn(`[DB] Staff ${userId} has invalid check-in coordinates:`, { checkInLat, checkInLng });
        // Continue processing - GPS is optional for display
      }

      // Calculate hours worked if both check-in and check-out times exist
      let hoursWorked = 0;
      if (latestRecord.checkInTime && latestRecord.checkOutTime) {
        const checkInTime = new Date(latestRecord.checkInTime).getTime();
        const checkOutTime = new Date(latestRecord.checkOutTime).getTime();
        hoursWorked = parseFloat(((checkOutTime - checkInTime) / (1000 * 60 * 60)).toFixed(2));
      }

      // Calculate overtime (hours over 8)
      const overtimeHours = hoursWorked > 8 ? parseFloat((hoursWorked - 8).toFixed(2)) : 0;
      const isOvertime = hoursWorked > 8;

      return {
        userId,
        userName: userInfo?.name || `Staff ${userId}`,
        staffNumber: userInfo?.staffNumber || userId,
        email: userInfo?.email || null,
        checkInTime: latestRecord.checkInTime,
        checkInAddress: latestRecord.checkInAddress || null,
        checkOutTime: latestRecord.checkOutTime,
        checkOutAddress: latestRecord.checkOutAddress || null,
        hoursWorked,
        overtimeHours,
        isOvertime,
        status: latestRecord.checkOutTime ? 'Checked Out' : 'Checked In',
        workModality: latestRecord.workModality || 'On-site',
        checkInLat: checkInLat,
        checkInLng: checkInLng,
        checkInAccuracy: checkInAccuracy,
        checkOutLat: checkOutLat,
        checkOutLng: checkOutLng,
        checkOutAccuracy: checkOutAccuracy,
        distanceTraveled: distanceTraveled,
        kpiId: latestRecord.kpiId || null,
        activityCategoryId: latestRecord.activityCategoryId || null,
        sdgGoalId: latestRecord.sdgGoalId || null,
        taskDescription: latestRecord.taskDescription || null,
        staffRemarks: latestRecord.staffRemarks || null,
        waypointCount: 0, // TODO: Query actual waypoint count
        hasValidCoordinates, // Flag to indicate if GPS data is available
      };
    }).filter(item => item !== null);

    // Return array directly so frontend can use Array.isArray()
    console.log(`[DB] getAllStaffCheckedInToday returning ${staffList.length} staff with valid coordinates`);
    staffList.forEach(staff => {
      console.log(`[DB] ${staff.userName}: (${staff.checkInLat}, ${staff.checkInLng}) - ${staff.checkInAddress}`);
    });
    return staffList;
  } catch (error) {
    console.error('[Database] Error getting staff checked in today:', error);
    return [];
  }
}


// ============ KPI MANAGEMENT ============

export async function getActiveKPIs() {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  
  try {
    const activeKpis = await db
      .select({
        id: kpis.id,
        name: kpis.name,
        description: kpis.description,
        targetValue: kpis.targetValue,
        unit: kpis.unit,
        sdgGoalId: kpis.sdgGoalId,
      })
      .from(kpis)
      .where(eq(kpis.isActive, true))
      .orderBy(asc(kpis.name));
    
    return activeKpis;
  } catch (error) {
    console.error('[Database] Error fetching active KPIs:', error);
    throw error;
  }
}

export async function getKPIById(kpiId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  
  try {
    const kpi = await db
      .select()
      .from(kpis)
      .where(eq(kpis.id, kpiId))
      .limit(1);
    
    return kpi[0] || null;
  } catch (error) {
    console.error('[Database] Error fetching KPI by ID:', error);
    throw error;
  }
}


// ============ COMPLETE TIMESHEET DATA ============

export async function getCompleteTimesheetData(options?: {
  startDate?: Date;
  endDate?: Date;
  staffId?: number;
}) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot fetch complete timesheet data: database not available");
    return [];
  }

  try {
    const startDate = options?.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = options?.endDate || new Date();

    let query = db
      .select({
        id: attendance.id,
        userId: attendance.userId,
        userName: users.name,
        userEmail: users.email,
        staffNumber: users.staffNumber,
        checkInTime: attendance.checkInTime,
        checkOutTime: attendance.checkOutTime,
        checkInLat: attendance.checkInLat,
        checkInLng: attendance.checkInLng,
        checkOutLat: attendance.checkOutLat,
        checkOutLng: attendance.checkOutLng,
        checkInAddress: attendance.checkInAddress,
        checkOutAddress: attendance.checkOutAddress,
        workModality: attendance.workModality,
        activityCategoryId: attendance.activityCategoryId,
        activityCategoryName: activityCategories.name,
        sdgGoalId: attendance.sdgGoalId,
        sdgGoalTitle: sdgGoals.title,
        kpiId: attendance.kpiId,
        taskDescription: attendance.taskDescription,
        staffRemarks: attendance.staffRemarks,
        distanceTraveled: attendance.distanceTraveled,
        durationMinutes: attendance.durationMinutes,
        kpiName: kpis.name,
        kpiUnit: kpis.unit,
        amStartTime: attendance.amStartTime,
        amEndTime: attendance.amEndTime,
        pmStartTime: attendance.pmStartTime,
        pmEndTime: attendance.pmEndTime,
        program: attendance.program,
        evidenceUploadKey: attendance.evidenceUploadKey,
        isSubmitted: attendance.isSubmitted,
        submittedAt: attendance.submittedAt,
      })
      .from(attendance)
      .innerJoin(users, eq(attendance.userId, users.id))
      .leftJoin(kpis, eq(attendance.kpiId, kpis.id))
      .leftJoin(activityCategories, eq(attendance.activityCategoryId, activityCategories.id))
      .leftJoin(sdgGoals, eq(attendance.sdgGoalId, sdgGoals.id))
      .where(
        and(
          gte(attendance.checkInTime, startDate),
          lte(attendance.checkInTime, endDate),
          options?.staffId ? eq(attendance.userId, options.staffId) : undefined
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

      return {
        id: r.id,
        staffNumber: r.staffNumber || "N/A",
        staffName: r.userName || "Unknown",
        staffEmail: r.userEmail || "N/A",
        date: checkIn.toISOString().split("T")[0],
        checkInTime: checkIn.toLocaleTimeString("en-US", { hour12: true, timeZone: "Africa/Nairobi" }),
        checkOutTime: checkOut ? checkOut.toLocaleTimeString("en-US", { hour12: true, timeZone: "Africa/Nairobi" }) : "Not checked out",
        checkInCoordinates: r.checkInLat && r.checkInLng 
          ? `${parseFloat(r.checkInLat).toFixed(6)}, ${parseFloat(r.checkInLng).toFixed(6)}`
          : "N/A",
        checkInAddress: r.checkInAddress || "N/A",
        checkOutCoordinates: r.checkOutLat && r.checkOutLng 
          ? `${parseFloat(r.checkOutLat).toFixed(6)}, ${parseFloat(r.checkOutLng).toFixed(6)}`
          : "N/A",
        checkOutAddress: r.checkOutAddress || "N/A",
        workModality: r.workModality || "N/A",
        activityCategoryId: r.activityCategoryId || "N/A",
        activityCategory: r.activityCategoryName || "N/A",
        sdgGoalId: r.sdgGoalId || "N/A",
        sdgGoal: r.sdgGoalTitle || "N/A",
        kpi: r.kpiName ? `${r.kpiName}${r.kpiUnit ? ` (${r.kpiUnit})` : ""}` : "None",
        taskDescription: r.taskDescription || "N/A",
        staffRemarks: r.staffRemarks || "N/A",
        hoursWorked: hoursWorked.toFixed(2),
        distanceTraveled: r.distanceTraveled ? `${parseFloat(r.distanceTraveled).toFixed(2)}m` : "N/A",
        amStartTime: r.amStartTime ? new Date(r.amStartTime).toLocaleTimeString("en-US", { hour12: true, timeZone: "Africa/Nairobi" }) : "N/A",
        amEndTime: r.amEndTime ? new Date(r.amEndTime).toLocaleTimeString("en-US", { hour12: true, timeZone: "Africa/Nairobi" }) : "N/A",
        pmStartTime: r.pmStartTime ? new Date(r.pmStartTime).toLocaleTimeString("en-US", { hour12: true, timeZone: "Africa/Nairobi" }) : "N/A",
        pmEndTime: r.pmEndTime ? new Date(r.pmEndTime).toLocaleTimeString("en-US", { hour12: true, timeZone: "Africa/Nairobi" }) : "N/A",
        program: r.program || "N/A",
        evidenceUploadKey: r.evidenceUploadKey || "N/A",
        isSubmitted: r.isSubmitted || false,
        submittedAt: r.submittedAt ? new Date(r.submittedAt).toLocaleString("en-US", { timeZone: "Africa/Nairobi" }) : "N/A",
      };
    });
  } catch (error) {
    console.error("[Database] Error fetching complete timesheet data:", error);
    return [];
  }
}


// ============ UPDATE ATTENDANCE WITH TIMESHEET DATA ============

export async function updateAttendanceWithTimesheetData(
  attendanceId: number,
  data: {
    workModality?: string;
    activityCategoryId?: number;
    sdgGoalId?: number;
    kpiId?: number;
    taskDescription?: string;
    staffRemarks?: string;
    amStartTime?: string;
    amEndTime?: string;
    pmStartTime?: string;
    pmEndTime?: string;
    program?: string;
  }
) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot update attendance: database not available");
    return;
  }

  try {
    // First, fetch the existing attendance record to get the check-in date
    const existingRecord = await db
      .select()
      .from(attendance)
      .where(eq(attendance.id, attendanceId))
      .limit(1);

    if (!existingRecord || existingRecord.length === 0) {
      throw new Error(`Attendance record not found: ${attendanceId}`);
    }

    const attendanceDate = new Date(existingRecord[0].checkInTime);
    const updateData: any = {};

    // Validate and update fields - use strict checks to allow zero/false values
    if (data.workModality !== undefined && data.workModality !== null) {
      updateData.workModality = data.workModality;
    }
    if (data.activityCategoryId !== undefined && data.activityCategoryId !== null) {
      updateData.activityCategoryId = data.activityCategoryId;
    }
    if (data.sdgGoalId !== undefined && data.sdgGoalId !== null) {
      updateData.sdgGoalId = data.sdgGoalId;
    }
    if (data.kpiId !== undefined && data.kpiId !== null) {
      updateData.kpiId = data.kpiId;
    }
    if (data.taskDescription !== undefined) {
      updateData.taskDescription = data.taskDescription || null;
    }
    if (data.staffRemarks !== undefined) {
      updateData.staffRemarks = data.staffRemarks || null;
    }
    
    // Handle time fields - convert time strings to proper Date objects using attendance date
    if (data.amStartTime) {
      const [hours, minutes] = data.amStartTime.split(':');
      const amStart = new Date(attendanceDate);
      amStart.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      
      // Validate time is reasonable (between 5 AM and 11 PM)
      const hourNum = parseInt(hours);
      if (hourNum < 5 || hourNum > 23) {
        throw new Error(`Invalid AM start time: ${data.amStartTime}. Must be between 05:00 and 23:00`);
      }
      updateData.amStartTime = amStart;
    }
    if (data.amEndTime) {
      const [hours, minutes] = data.amEndTime.split(':');
      const amEnd = new Date(attendanceDate);
      amEnd.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      
      // Validate time is reasonable
      const hourNum = parseInt(hours);
      if (hourNum < 5 || hourNum > 23) {
        throw new Error(`Invalid AM end time: ${data.amEndTime}. Must be between 05:00 and 23:00`);
      }
      updateData.amEndTime = amEnd;
    }
    if (data.pmStartTime) {
      const [hours, minutes] = data.pmStartTime.split(':');
      const pmStart = new Date(attendanceDate);
      pmStart.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      
      // Validate time is reasonable
      const hourNum = parseInt(hours);
      if (hourNum < 5 || hourNum > 23) {
        throw new Error(`Invalid PM start time: ${data.pmStartTime}. Must be between 05:00 and 23:00`);
      }
      updateData.pmStartTime = pmStart;
    }
    if (data.pmEndTime) {
      const [hours, minutes] = data.pmEndTime.split(':');
      const pmEnd = new Date(attendanceDate);
      pmEnd.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      
      // Validate time is reasonable
      const hourNum = parseInt(hours);
      if (hourNum < 5 || hourNum > 23) {
        throw new Error(`Invalid PM end time: ${data.pmEndTime}. Must be between 05:00 and 23:00`);
      }
      updateData.pmEndTime = pmEnd;
    }
    
    // Validate time logic: AM start < AM end, PM start < PM end
    if (updateData.amStartTime && updateData.amEndTime && updateData.amStartTime >= updateData.amEndTime) {
      throw new Error('AM start time must be before AM end time');
    }
    if (updateData.pmStartTime && updateData.pmEndTime && updateData.pmStartTime >= updateData.pmEndTime) {
      throw new Error('PM start time must be before PM end time');
    }
    
    if (data.program !== undefined) updateData.program = data.program || null;

    // Mark as submitted and set submission timestamp
    updateData.isSubmitted = true;
    updateData.submittedAt = new Date();
    updateData.updatedAt = new Date();

    await db
      .update(attendance)
      .set(updateData)
      .where(eq(attendance.id, attendanceId));

    console.log("[Database] Updated attendance with timesheet data:", attendanceId, "with data:", updateData);
  } catch (error) {
    console.error("[Database] Error updating attendance with timesheet data:", error);
    throw error;
  }
}


// ============ FETCH ACTIVITY CATEGORIES AND SDG GOALS ============

export async function getActivityCategories() {
  const db = await getDb();
  if (!db) return [];
  
  try {
    const categories = await db.select().from(activityCategories).orderBy(asc(activityCategories.name));
    return categories;
  } catch (error) {
    console.error("[Database] Error fetching activity categories:", error);
    return [];
  }
}

export async function getSDGGoals() {
  const db = await getDb();
  if (!db) return [];
  
  try {
    const goals = await db.select().from(sdgGoals).orderBy(asc(sdgGoals.title));
    return goals;
  } catch (error) {
    console.error("[Database] Error fetching SDG goals:", error);
    return [];
  }
}

export async function getKPIs() {
  const db = await getDb();
  if (!db) return [];
  
  try {
    const kpiList = await db.select().from(kpis).orderBy(asc(kpis.name));
    return kpiList;
  } catch (error) {
    console.error("[Database] Error fetching KPIs:", error);
    return [];
  }
}


// Generate daily timesheet summary report
export async function generateDailyTimesheetSummary(date: Date = new Date()) {
  const dbInstance = await getDb();
  if (!dbInstance) return null;
  
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const records = await dbInstance
    .select({
      id: attendance.id,
      staffName: users.name,
      staffNumber: users.staffNumber,
      checkInTime: attendance.checkInTime,
      checkOutTime: attendance.checkOutTime,
      amStartTime: attendance.amStartTime,
      amEndTime: attendance.amEndTime,
      pmStartTime: attendance.pmStartTime,
      pmEndTime: attendance.pmEndTime,
      workModality: attendance.workModality,
      activityCategoryName: activityCategories.name,
      sdgGoalName: sdgGoals.title,
      kpiName: kpis.name,
      taskDescription: attendance.taskDescription,
      staffRemarks: attendance.staffRemarks,
      isSubmitted: attendance.isSubmitted,
    })
    .from(attendance)
    .leftJoin(users, eq(attendance.userId, users.id))
    .leftJoin(activityCategories, eq(attendance.activityCategoryId, activityCategories.id))
    .leftJoin(sdgGoals, eq(attendance.sdgGoalId, sdgGoals.id))
    .leftJoin(kpis, eq(attendance.kpiId, kpis.id))
    .where(
      and(
        gte(attendance.checkInTime, startOfDay),
        lte(attendance.checkInTime, endOfDay)
      )
    )
    .orderBy(users.name);

  const totalStaffCheckedIn = new Set(records.map(r => r.staffNumber)).size;
  const submittedCount = records.filter(r => r.isSubmitted).length;
  const pendingCount = records.filter(r => !r.isSubmitted).length;

  // Calculate total hours
  let totalHours = 0;
  records.forEach(record => {
    if (record.amStartTime && record.amEndTime) {
      const amHours = (record.amEndTime.getTime() - record.amStartTime.getTime()) / (1000 * 60 * 60);
      totalHours += amHours;
    }
    if (record.pmStartTime && record.pmEndTime) {
      const pmHours = (record.pmEndTime.getTime() - record.pmStartTime.getTime()) / (1000 * 60 * 60);
      totalHours += pmHours;
    }
  });

  // Group by activity category
  const activitiesByCategory: Record<string, number> = {};
  records.forEach(record => {
    const category = record.activityCategoryName || 'Uncategorized';
    activitiesByCategory[category] = (activitiesByCategory[category] || 0) + 1;
  });

  // Group by SDG goal
  const activitiesBySDG: Record<string, number> = {};
  records.forEach(record => {
    const goal = record.sdgGoalName || 'Uncategorized';
    activitiesBySDG[goal] = (activitiesBySDG[goal] || 0) + 1;
  });

  return {
    date: date.toISOString().split('T')[0],
    totalStaffCheckedIn,
    submittedCount,
    pendingCount,
    totalHours: Math.round(totalHours * 100) / 100,
    activitiesByCategory,
    activitiesBySDG,
    records,
  };
}


// ============ MANUAL APPROVAL REQUESTS (Poor GPS) ============

export async function createManualApprovalRequest(data: {
  userId: number;
  requestType: "check_in" | "check_out";
  gpsAccuracy?: number;
  latitude?: number;
  longitude?: number;
}) {
  const db = await getDb();
  if (!db) return null;

  try {
    const result = await db.insert(manualApprovalRequests).values({
      userId: data.userId,
      requestType: data.requestType,
      gpsAccuracy: data.gpsAccuracy ? String(data.gpsAccuracy) : null,
      latitude: data.latitude ? String(data.latitude) : null,
      longitude: data.longitude ? String(data.longitude) : null,
      requestedAt: new Date(),
      status: "pending",
    });

    return result;
  } catch (error) {
    console.error("[Manual Approval] Failed to create request:", error);
    return null;
  }
}

export async function getPendingManualApprovals() {
  const db = await getDb();
  if (!db) return [];

  try {
    const result = await db
      .select({
        id: manualApprovalRequests.id,
        userId: manualApprovalRequests.userId,
        staffName: users.name,
        staffEmail: users.email,
        staffNumber: users.staffNumber,
        requestType: manualApprovalRequests.requestType,
        gpsAccuracy: manualApprovalRequests.gpsAccuracy,
        latitude: manualApprovalRequests.latitude,
        longitude: manualApprovalRequests.longitude,
        requestedAt: manualApprovalRequests.requestedAt,
        status: manualApprovalRequests.status,
        approvedBy: manualApprovalRequests.approvedBy,
        approvalReason: manualApprovalRequests.approvalReason,
        approvedAt: manualApprovalRequests.approvedAt,
        rejectionReason: manualApprovalRequests.rejectionReason,
        createdAt: manualApprovalRequests.createdAt,
      })
      .from(manualApprovalRequests)
      .leftJoin(users, eq(manualApprovalRequests.userId, users.id))
      .where(eq(manualApprovalRequests.status, "pending"))
      .orderBy(asc(manualApprovalRequests.requestedAt));

    return result;
  } catch (error) {
    console.error("[Manual Approval] Failed to fetch pending requests:", error);
    return [];
  }
}

export async function approveManualRequest(
  requestId: number,
  approvedBy: number,
  reason?: string
) {
  const db = await getDb();
  if (!db) return false;

  try {
    const request = await db
      .select()
      .from(manualApprovalRequests)
      .where(eq(manualApprovalRequests.id, requestId))
      .limit(1);

    if (!request.length) return false;

    const manualRequest = request[0];

    // Update request status
    await db
      .update(manualApprovalRequests)
      .set({
        status: "approved",
        approvedBy,
        approvalReason: reason,
        approvedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(manualApprovalRequests.id, requestId));

    // If it's a check-in request, create the attendance record
    if (manualRequest.requestType === "check_in") {
      const user = await db
        .select()
        .from(users)
        .where(eq(users.id, manualRequest.userId))
        .limit(1);

      if (user.length) {
        // Create attendance record with manual approval flag
        await db.insert(attendance).values({
          userId: manualRequest.userId as any,
          checkInTime: new Date(),
          checkInLat: manualRequest.latitude ? manualRequest.latitude.toString() : null,
          checkInLng: manualRequest.longitude ? manualRequest.longitude.toString() : null,
          checkInAccuracy: manualRequest.gpsAccuracy ? manualRequest.gpsAccuracy.toString() : null,
          checkInMethod: "manual_approval",
        } as any);

        // Notify staff
        await db.insert(emailNotifications).values({
          type: 'manual_approval_approved',
          userId: manualRequest.userId,
          subject: "Manual Check-in Approved",
          content: `Your check-in request with poor GPS accuracy (${manualRequest.gpsAccuracy}m) has been approved by admin.${reason ? ` Reason: ${reason}` : ""}`,
          sentAt: new Date(),
        });
      }
    }

    return true;
  } catch (error) {
    console.error("[Manual Approval] Failed to approve request:", error);
    return false;
  }
}

export async function rejectManualRequest(
  requestId: number,
  approvedBy: number,
  reason?: string
) {
  const db = await getDb();
  if (!db) return false;

  try {
    const request = await db
      .select()
      .from(manualApprovalRequests)
      .where(eq(manualApprovalRequests.id, requestId))
      .limit(1);

    if (!request.length) return false;

    const manualRequest = request[0];

    // Update request status
    await db
      .update(manualApprovalRequests)
      .set({
        status: "rejected",
        approvedBy,
        rejectionReason: reason,
        approvedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(manualApprovalRequests.id, requestId));

    // Notify staff
    await db.insert(emailNotifications).values({
      type: 'manual_approval_rejected',
      userId: manualRequest.userId,
      subject: "Manual Check-in Request Rejected",
      content: `Your check-in request with poor GPS accuracy (${manualRequest.gpsAccuracy}m) has been rejected.${reason ? ` Reason: ${reason}` : ""}`,
      sentAt: new Date(),
    });

    return true;
  } catch (error) {
    console.error("[Manual Approval] Failed to reject request:", error);
    return false;
  }
}
