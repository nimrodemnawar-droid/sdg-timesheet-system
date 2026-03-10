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
 * SDG Goals (1-17) with official colors and descriptions
 */
export const sdgGoals = mysqlTable("sdgGoals", {
  id: int("id").autoincrement().primaryKey(),
  goalNumber: int("goalNumber").notNull().unique(), // 1-17
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  color: varchar("color", { length: 7 }).notNull(), // Hex color code
  icon: text("icon"), // SVG or icon URL
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SDGGoal = typeof sdgGoals.$inferSelect;
export type InsertSDGGoal = typeof sdgGoals.$inferInsert;

/**
 * Activity Categories (20+ predefined, admin can add more)
 */
export const activityCategories = mysqlTable("activityCategories", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  description: text("description"),
  icon: text("icon"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ActivityCategory = typeof activityCategories.$inferSelect;
export type InsertActivityCategory = typeof activityCategories.$inferInsert;

/**
 * KPIs linked to SDG Goals
 */
export const kpis = mysqlTable("kpis", {
  id: int("id").autoincrement().primaryKey(),
  sdgGoalId: int("sdgGoalId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  targetValue: decimal("targetValue", { precision: 10, scale: 2 }),
  unit: varchar("unit", { length: 50 }),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type KPI = typeof kpis.$inferSelect;
export type InsertKPI = typeof kpis.$inferInsert;

/**
 * Attendance records for GPS check-in and check-out with 8-decimal precision.
 * Extended with timesheet fields (AM/PM times, work modality, SDG, activity, etc.)
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
  durationMinutes: int("durationMinutes"), // calculated field
  overtimeMinutes: int("overtimeMinutes"), // calculated: max(0, durationMinutes - 480)
  
  // Timesheet fields
  amStartTime: datetime("amStartTime"), // AM session start
  amEndTime: datetime("amEndTime"), // AM session end
  pmStartTime: datetime("pmStartTime"), // PM session start
  pmEndTime: datetime("pmEndTime"), // PM session end
  workModality: mysqlEnum("workModality", ["nairobi_office", "homa_bay_office", "field", "remote"]),
  activityCategoryId: int("activityCategoryId"), // Foreign key to activity categories
  sdgGoalId: int("sdgGoalId"), // Foreign key to SDG goals
  program: varchar("program", { length: 255 }), // Program/Department
  kpiId: int("kpiId"), // Linked KPI
  taskDescription: text("taskDescription"),
  evidenceUploadKey: text("evidenceUploadKey"), // S3 file key for evidence
  staffRemarks: text("staffRemarks"),
  
  isSubmitted: boolean("isSubmitted").default(false).notNull(),
  submittedAt: timestamp("submittedAt"),
  isApproved: boolean("isApproved").default(false).notNull(),
  approvedBy: int("approvedBy"), // Admin user ID
  approvedAt: timestamp("approvedAt"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Attendance = typeof attendance.$inferSelect;
export type InsertAttendance = typeof attendance.$inferInsert;

/**
 * Supervisor Confirmation - Separate workflow from staff submission
 * Stores supervisor review, signature, and private remarks (encrypted)
 */
export const supervisorConfirmations = mysqlTable("supervisorConfirmations", {
  id: int("id").autoincrement().primaryKey(),
  attendanceId: int("attendanceId").notNull(),
  staffUserId: int("staffUserId").notNull(),
  supervisorUserId: int("supervisorUserId").notNull(),
  supervisorName: varchar("supervisorName", { length: 255 }).notNull(),
  supervisorPhone: varchar("supervisorPhone", { length: 20 }).notNull(),
  digitalSignature: text("digitalSignature"), // Base64 encoded signature
  privateRemarks: text("privateRemarks"), // Encrypted field
  remarksIv: varchar("remarksIv", { length: 32 }), // Encryption IV
  confirmedAt: timestamp("confirmedAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SupervisorConfirmation = typeof supervisorConfirmations.$inferSelect;
export type InsertSupervisorConfirmation = typeof supervisorConfirmations.$inferInsert;

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
  supportingDocumentKey: text("supportingDocumentKey"), // S3 file key for supporting docs
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type LeaveRequest = typeof leaveRequests.$inferSelect;
export type InsertLeaveRequest = typeof leaveRequests.$inferInsert;

/**
 * Leave Balance tracking per user per year
 */
export const leaveBalance = mysqlTable("leaveBalance", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  year: int("year").notNull(),
  leaveType: mysqlEnum("leaveType", ["annual", "sick", "unpaid", "maternity", "other"]).notNull(),
  allocatedDays: decimal("allocatedDays", { precision: 5, scale: 2 }).notNull(),
  usedDays: decimal("usedDays", { precision: 5, scale: 2 }).default("0").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type LeaveBalance = typeof leaveBalance.$inferSelect;
export type InsertLeaveBalance = typeof leaveBalance.$inferInsert;

/**
 * Supervisor Remarks - Encrypted field notes for supervisors
 */
export const supervisorRemarks = mysqlTable("supervisorRemarks", {
  id: int("id").autoincrement().primaryKey(),
  attendanceId: int("attendanceId").notNull(),
  supervisorId: int("supervisorId").notNull(),
  userId: int("userId").notNull(),
  encryptedRemark: text("encryptedRemark").notNull(),
  encryptionIv: varchar("encryptionIv", { length: 32 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SupervisorRemark = typeof supervisorRemarks.$inferSelect;
export type InsertSupervisorRemark = typeof supervisorRemarks.$inferInsert;

/**
 * Email Notifications tracking
 */
export const emailNotifications = mysqlTable("emailNotifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  type: varchar("type", { length: 50 }).notNull(), // leave_approval, overtime_alert, etc.
  subject: varchar("subject", { length: 255 }).notNull(),
  content: text("content"),
  sentAt: timestamp("sentAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type EmailNotification = typeof emailNotifications.$inferSelect;
export type InsertEmailNotification = typeof emailNotifications.$inferInsert;

/**
 * Documents - Profile photos, reports, leave supporting docs
 */
export const documents = mysqlTable("documents", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  documentType: varchar("documentType", { length: 50 }).notNull(), // profile_photo, report, leave_doc
  fileKey: text("fileKey").notNull(), // S3 file key
  fileName: varchar("fileName", { length: 255 }).notNull(),
  fileSize: int("fileSize"),
  mimeType: varchar("mimeType", { length: 100 }),
  isEncrypted: boolean("isEncrypted").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Document = typeof documents.$inferSelect;
export type InsertDocument = typeof documents.$inferInsert;

/**
 * Audit Log - Full audit trail for compliance
 */
export const auditLog = mysqlTable("auditLog", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  action: varchar("action", { length: 100 }).notNull(), // CHECK_IN, CHECK_OUT, SUBMIT_TIMESHEET, etc.
  entityType: varchar("entityType", { length: 50 }).notNull(), // attendance, leave, user, etc.
  entityId: int("entityId"),
  details: text("details"), // JSON details
  ipAddress: varchar("ipAddress", { length: 45 }),
  userAgent: text("userAgent"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AuditLog = typeof auditLog.$inferSelect;
export type InsertAuditLog = typeof auditLog.$inferInsert;

/**
 * System Configuration - Editable settings
 */
export const systemConfig = mysqlTable("systemConfig", {
  id: int("id").autoincrement().primaryKey(),
  configKey: varchar("configKey", { length: 100 }).notNull().unique(),
  configValue: text("configValue").notNull(),
  description: text("description"),
  updatedBy: int("updatedBy"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SystemConfig = typeof systemConfig.$inferSelect;
export type InsertSystemConfig = typeof systemConfig.$inferInsert;

/**
 * Activity Heatmap Data - Pre-calculated for performance
 */
export const activityHeatmap = mysqlTable("activityHeatmap", {
  id: int("id").autoincrement().primaryKey(),
  date: datetime("date").notNull(),
  latitude: decimal("latitude", { precision: 11, scale: 8 }).notNull(),
  longitude: decimal("longitude", { precision: 11, scale: 8 }).notNull(),
  intensity: int("intensity"), // 1-100 scale
  activityCount: int("activityCount"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ActivityHeatmap = typeof activityHeatmap.$inferSelect;
export type InsertActivityHeatmap = typeof activityHeatmap.$inferInsert;
