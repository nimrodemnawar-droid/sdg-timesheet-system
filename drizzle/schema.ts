import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  decimal,
  boolean,
  datetime,
  json,
} from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow with role-based access control.
 * Roles: staff (field workers), supervisor (team leads), admin (system administrators)
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }).notNull().unique(),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["staff", "supervisor", "admin"]).default("staff").notNull(),
  profilePhotoUrl: text("profilePhotoUrl"), // S3 URL to encrypted profile photo
  profilePhotoKey: text("profilePhotoKey"), // S3 file key for access control
  department: varchar("department", { length: 255 }),
  phoneNumber: varchar("phoneNumber", { length: 20 }),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Attendance records for GPS check-in and check-out with 8-decimal precision.
 * Stores location data, accuracy metrics, and duration calculations.
 */
export const attendance = mysqlTable("attendance", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  checkInTime: timestamp("checkInTime").notNull(),
  checkOutTime: timestamp("checkOutTime"),
  checkInLat: decimal("checkInLat", { precision: 11, scale: 8 }).notNull(), // 8-decimal precision
  checkInLng: decimal("checkInLng", { precision: 11, scale: 8 }).notNull(),
  checkOutLat: decimal("checkOutLat", { precision: 11, scale: 8 }),
  checkOutLng: decimal("checkOutLng", { precision: 11, scale: 8 }),
  checkInAccuracy: decimal("checkInAccuracy", { precision: 6, scale: 2 }), // in meters
  checkOutAccuracy: decimal("checkOutAccuracy", { precision: 6, scale: 2 }),
  distanceTraveled: decimal("distanceTraveled", { precision: 10, scale: 3 }), // in km
  durationMinutes: int("durationMinutes"), // calculated field: (checkOutTime - checkInTime) / 60
  overtimeMinutes: int("overtimeMinutes"), // calculated: max(0, durationMinutes - 480) for 8-hour day
  isSubmitted: boolean("isSubmitted").default(false).notNull(),
  submittedAt: timestamp("submittedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Attendance = typeof attendance.$inferSelect;
export type InsertAttendance = typeof attendance.$inferInsert;

/**
 * Waypoint tracking for multi-point field work.
 * Each waypoint captures GPS location, timestamp, and cumulative distance.
 */
export const waypoints = mysqlTable("waypoints", {
  id: int("id").autoincrement().primaryKey(),
  attendanceId: int("attendanceId").notNull(),
  userId: int("userId").notNull(),
  latitude: decimal("latitude", { precision: 11, scale: 8 }).notNull(), // 8-decimal precision
  longitude: decimal("longitude", { precision: 11, scale: 8 }).notNull(),
  accuracy: decimal("accuracy", { precision: 6, scale: 2 }), // in meters
  timestamp: timestamp("timestamp").notNull(),
  cumulativeDistance: decimal("cumulativeDistance", { precision: 10, scale: 3 }), // in km
  altitude: decimal("altitude", { precision: 8, scale: 2 }), // optional elevation data
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Waypoint = typeof waypoints.$inferSelect;
export type InsertWaypoint = typeof waypoints.$inferInsert;

/**
 * Leave requests with balance tracking and approval workflow.
 * Supports multiple leave types (annual, sick, unpaid, etc.)
 */
export const leaveRequests = mysqlTable("leaveRequests", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  leaveType: mysqlEnum("leaveType", ["annual", "sick", "unpaid", "maternity", "other"]).notNull(),
  startDate: datetime("startDate").notNull(),
  endDate: datetime("endDate").notNull(),
  daysRequested: decimal("daysRequested", { precision: 5, scale: 2 }).notNull(),
  reason: text("reason"),
  status: mysqlEnum("status", ["pending", "approved", "rejected", "cancelled"]).default("pending").notNull(),
  approvedBy: int("approvedBy"), // user id of approver
  approvalReason: text("approvalReason"), // reason for approval/rejection
  approvedAt: timestamp("approvedAt"),
  supportingDocumentUrl: text("supportingDocumentUrl"), // S3 URL to encrypted document
  supportingDocumentKey: text("supportingDocumentKey"), // S3 file key
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type LeaveRequest = typeof leaveRequests.$inferSelect;
export type InsertLeaveRequest = typeof leaveRequests.$inferInsert;

/**
 * Leave balance tracking per user per leave type.
 * Tracks allocated, used, and remaining leave days.
 */
export const leaveBalance = mysqlTable("leaveBalance", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  leaveType: mysqlEnum("leaveType", ["annual", "sick", "unpaid", "maternity", "other"]).notNull(),
  year: int("year").notNull(),
  allocatedDays: decimal("allocatedDays", { precision: 5, scale: 2 }).notNull(),
  usedDays: decimal("usedDays", { precision: 5, scale: 2 }).default("0").notNull(),
  remainingDays: decimal("remainingDays", { precision: 5, scale: 2 }).notNull(),
  lastUpdated: timestamp("lastUpdated").defaultNow().onUpdateNow().notNull(),
});

export type LeaveBalance = typeof leaveBalance.$inferSelect;
export type InsertLeaveBalance = typeof leaveBalance.$inferInsert;

/**
 * Supervisor remarks for field work - encrypted storage.
 * Stores sensitive notes about staff performance and field observations.
 */
export const supervisorRemarks = mysqlTable("supervisorRemarks", {
  id: int("id").autoincrement().primaryKey(),
  attendanceId: int("attendanceId").notNull(),
  supervisorId: int("supervisorId").notNull(),
  userId: int("userId").notNull(),
  encryptedRemark: text("encryptedRemark").notNull(), // AES-256 encrypted
  encryptionIv: varchar("encryptionIv", { length: 32 }).notNull(), // IV for encryption
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SupervisorRemark = typeof supervisorRemarks.$inferSelect;
export type InsertSupervisorRemark = typeof supervisorRemarks.$inferInsert;

/**
 * Audit log for all system actions - compliance and security tracking.
 * Records user actions, approvals, and system changes.
 */
export const auditLog = mysqlTable("auditLog", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  action: varchar("action", { length: 255 }).notNull(),
  entityType: varchar("entityType", { length: 100 }).notNull(), // attendance, leave, user, etc.
  entityId: int("entityId"),
  changes: json("changes"), // JSON object with before/after values
  ipAddress: varchar("ipAddress", { length: 45 }),
  userAgent: text("userAgent"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AuditLog = typeof auditLog.$inferSelect;
export type InsertAuditLog = typeof auditLog.$inferInsert;

/**
 * Email notification tracking for delivery and status.
 * Ensures reliable notification delivery and provides audit trail.
 */
export const emailNotifications = mysqlTable("emailNotifications", {
  id: int("id").autoincrement().primaryKey(),
  recipientId: int("recipientId").notNull(),
  recipientEmail: varchar("recipientEmail", { length: 320 }).notNull(),
  notificationType: mysqlEnum("notificationType", [
    "leave_approved",
    "leave_rejected",
    "overtime_alert",
    "timesheet_reminder",
    "leave_balance_update",
  ]).notNull(),
  subject: varchar("subject", { length: 255 }).notNull(),
  body: text("body").notNull(),
  status: mysqlEnum("status", ["pending", "sent", "failed", "bounced"]).default("pending").notNull(),
  sentAt: timestamp("sentAt"),
  failureReason: text("failureReason"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type EmailNotification = typeof emailNotifications.$inferSelect;
export type InsertEmailNotification = typeof emailNotifications.$inferInsert;

/**
 * Document storage metadata for encrypted cloud files.
 * Tracks profile photos, reports, and leave supporting documents.
 */
export const documents = mysqlTable("documents", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  documentType: mysqlEnum("documentType", ["profile_photo", "csv_report", "leave_document", "other"]).notNull(),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  fileKey: text("fileKey").notNull(), // S3 file key
  fileUrl: text("fileUrl").notNull(), // S3 URL (encrypted)
  mimeType: varchar("mimeType", { length: 100 }),
  fileSizeBytes: int("fileSizeBytes"),
  encryptionAlgorithm: varchar("encryptionAlgorithm", { length: 50 }).default("AES-256").notNull(),
  uploadedBy: int("uploadedBy").notNull(),
  relatedEntityType: varchar("relatedEntityType", { length: 100 }), // attendance, leave_request, etc.
  relatedEntityId: int("relatedEntityId"),
  expiresAt: timestamp("expiresAt"), // for temporary documents like reports
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Document = typeof documents.$inferSelect;
export type InsertDocument = typeof documents.$inferInsert;

/**
 * System configuration and settings.
 * Stores overtime thresholds, leave policies, and notification settings.
 */
export const systemConfig = mysqlTable("systemConfig", {
  id: int("id").autoincrement().primaryKey(),
  configKey: varchar("configKey", { length: 255 }).notNull().unique(),
  configValue: text("configValue").notNull(),
  description: text("description"),
  updatedBy: int("updatedBy"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SystemConfig = typeof systemConfig.$inferSelect;
export type InsertSystemConfig = typeof systemConfig.$inferInsert;
