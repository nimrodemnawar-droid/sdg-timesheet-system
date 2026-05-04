import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import {
  encryptData,
  decryptData,
  calculateDistance,
  getAccuracyQuality,
} from "./encryption";
import { TRPCError } from "@trpc/server";
import { and, gte, lte, eq } from "drizzle-orm";
import { attendance } from "../drizzle/schema";
import { analyticsRouter } from "./analyticsRouter";
import { notifyOwner } from "./_core/notification";
import { storagePut } from "./storage";
import { generateCSVContent, generateExcelContent } from "./db";
import { logAuditEvent } from "./db";
import { getTimesheetDataForExport } from "./db";

// Helper to ensure admin role
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
  return next({ ctx });
});

// Helper to ensure supervisor or admin role
const supervisorProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "supervisor" && ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
  return next({ ctx });
});

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query(async (opts) => {
      // Assign staff number on first login if not already assigned
      if (opts.ctx.user && opts.ctx.user.id) {
        const userWithNumber = await db.getUserWithStaffNumber(opts.ctx.user.id);
        if (userWithNumber && !userWithNumber.staffNumber) {
          const assignedNumber = await db.assignStaffNumberIfNeeded(opts.ctx.user.id);
          if (assignedNumber) {
            return {
              ...opts.ctx.user,
              staffNumber: assignedNumber,
            };
          }
        }
      }
      return opts.ctx.user;
    }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // ============ ATTENDANCE PROCEDURES ============

  attendance: router({
    // Staff: Check in with GPS location
    checkIn: protectedProcedure
      .input(
        z.object({
          latitude: z.string(),
          longitude: z.string(),
          accuracy: z.string(),
          workModality: z.enum(["nairobi_office", "homa_bay_office", "field", "remote"]).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await db.createAttendance({
          userId: ctx.user.id,
          checkInLat: input.latitude,
          checkInLng: input.longitude,
          checkInAccuracy: input.accuracy,
          workModality: input.workModality,
        });

        await db.logAuditEvent({
          userId: ctx.user.id,
          action: "CHECK_IN",
          entityType: "attendance",
          ipAddress: ctx.req.ip,
        });

        // Send notification to admin if enabled and not in quiet hours
        const prefs = await db.getNotificationPreferences(ctx.user.id);
        const isQuietHours = db.isWithinQuietHours(prefs);
        if (prefs?.enableCheckInNotifications && !isQuietHours) {
          await notifyOwner({
            title: `Staff Check-In: ${ctx.user.name}`,
            content: `${ctx.user.name} checked in at ${new Date().toLocaleTimeString()}. Location: (${parseFloat(input.latitude || "0").toFixed(4)}, ${parseFloat(input.longitude || "0").toFixed(4)}). Accuracy: ${parseFloat(input.accuracy || "0").toFixed(1)}m`,
          }).catch((err) => console.error("Failed to send check-in notification:", err));
        }

        return { success: true };
      }),

    // Staff: Check out with GPS location
    checkOut: protectedProcedure
      .input(
        z.object({
          attendanceId: z.number(),
          latitude: z.string(),
          longitude: z.string(),
          accuracy: z.string(),
          distanceTraveled: z.string(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const attendance = await db.getAttendanceById(input.attendanceId);
        if (!attendance) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }

        if (attendance.userId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }

        await db.completeAttendance(input.attendanceId, {
          checkOutLat: input.latitude,
          checkOutLng: input.longitude,
          checkOutAccuracy: input.accuracy,
          distanceTraveled: input.distanceTraveled,
        });

        await db.logAuditEvent({
          userId: ctx.user.id,
          action: "CHECK_OUT",
          entityType: "attendance",
          entityId: input.attendanceId,
          ipAddress: ctx.req.ip,
        });

        // Calculate overtime and send notifications
        const checkInTime = new Date(attendance.checkInTime);
        const checkOutTime = new Date();
        const hoursWorked = ((checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60)).toFixed(2);
        const overtimeHours = db.calculateOvertimeHours(checkInTime, checkOutTime, 8);
        
        // Log overtime if any
        if (overtimeHours > 0) {
          await db.logOvertimeAlert({
            userId: ctx.user.id,
            attendanceId: input.attendanceId,
            overtimeHours,
            checkInTime,
            checkOutTime,
          });
        }

        // Send notification to admin if enabled and not in quiet hours
        const prefs = await db.getNotificationPreferences(ctx.user.id);
        const isQuietHours = db.isWithinQuietHours(prefs);
        if (prefs?.enableCheckOutNotifications && !isQuietHours) {
          const notificationContent = overtimeHours > 0
            ? `${ctx.user.name} checked out at ${checkOutTime.toLocaleTimeString()}. Location: (${parseFloat(input.latitude).toFixed(4)}, ${parseFloat(input.longitude).toFixed(4)}). Accuracy: ${parseFloat(input.accuracy).toFixed(1)}m. Hours worked: ${hoursWorked}h. OVERTIME: ${overtimeHours}h. Distance: ${parseFloat(input.distanceTraveled).toFixed(2)}m`
            : `${ctx.user.name} checked out at ${checkOutTime.toLocaleTimeString()}. Location: (${parseFloat(input.latitude).toFixed(4)}, ${parseFloat(input.longitude).toFixed(4)}). Accuracy: ${parseFloat(input.accuracy).toFixed(1)}m. Hours worked: ${hoursWorked}h. Distance: ${parseFloat(input.distanceTraveled).toFixed(2)}m`;
          
          await notifyOwner({
            title: overtimeHours > 0 ? `OVERTIME ALERT: ${ctx.user.name}` : `Staff Check-Out: ${ctx.user.name}`,
            content: notificationContent,
          }).catch((err) => console.error("Failed to send check-out notification:", err));
        }

        return { success: true };
      }),

    // Staff: Get today's attendance
    getToday: protectedProcedure.query(async ({ ctx }) => {
      return await db.getTodayAttendance(ctx.user.id);
    }),

    // Admin: Get all staff checked in today
    getTodayAllStaff: adminProcedure.query(async () => {
      return await db.getAllStaffCheckedInToday();
    }),

    // Staff: Get attendance history
    getHistory: protectedProcedure
      .input(
        z.object({
          startDate: z.date(),
          endDate: z.date(),
        })
      )
      .query(async ({ ctx, input }) => {
        return await db.getAttendanceRange(
          ctx.user.id,
          input.startDate,
          input.endDate
        );
      }),

    // Staff: Submit timesheet
    submitTimesheet: protectedProcedure
      .input(z.object({ attendanceId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const attendance = await db.getAttendanceById(input.attendanceId);
        if (!attendance) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }

        if (attendance.userId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }

        await db.submitTimesheet(input.attendanceId);

        await db.logAuditEvent({
          userId: ctx.user.id,
          action: "SUBMIT_TIMESHEET",
          entityType: "attendance",
          entityId: input.attendanceId,
          ipAddress: ctx.req.ip,
        });

        return { success: true };
      }),

    // Supervisor/Admin: Get staff attendance for date range
    getStaffAttendance: supervisorProcedure
      .input(
        z.object({
          userId: z.number(),
          startDate: z.date(),
          endDate: z.date(),
        })
      )
      .query(async ({ input }) => {
        return await db.getAttendanceRange(
          input.userId,
          input.startDate,
          input.endDate
        );
      }),

    // Supervisor/Admin: Add encrypted remark to attendance
    addRemark: supervisorProcedure
      .input(
        z.object({
          attendanceId: z.number(),
          userId: z.number(),
          remark: z.string(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { encryptedData, iv } = encryptData(input.remark);

        await db.addSupervisorRemark({
          attendanceId: input.attendanceId,
          supervisorId: ctx.user.id,
          userId: input.userId,
          encryptedRemark: encryptedData,
          encryptionIv: iv,
        });

        await db.logAuditEvent({
          userId: ctx.user.id,
          action: "ADD_REMARK",
          entityType: "attendance",
          entityId: input.attendanceId,
          ipAddress: ctx.req.ip,
        });

        return { success: true };
      }),

    // Supervisor/Admin: Get remarks for attendance
    getRemarks: supervisorProcedure
      .input(z.object({ attendanceId: z.number() }))
      .query(async ({ input }) => {
        const remarks = await db.getSupervisorRemarks(input.attendanceId);
        return remarks.map((r) => ({
          ...r,
          decryptedRemark: decryptData(r.encryptedRemark, r.encryptionIv),
        }));
      }),

    // Supervisor/Admin: Get waypoints for attendance (for map visualization)
    getWaypoints: supervisorProcedure
      .input(z.object({ attendanceId: z.number() }))
      .query(async ({ input }) => {
        return await db.getWaypoints(input.attendanceId);
      }),

    // Staff: Add waypoint during field work
    addWaypoint: protectedProcedure
      .input(
        z.object({
          attendanceId: z.number(),
          latitude: z.string(),
          longitude: z.string(),
          accuracy: z.string(),
          cumulativeDistance: z.string().optional(),
          altitude: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const attendance = await db.getAttendanceById(input.attendanceId);
        if (!attendance) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }

        if (attendance.userId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }

        await db.addWaypoint({
          attendanceId: input.attendanceId,
          userId: ctx.user.id,
          latitude: input.latitude,
          longitude: input.longitude,
          accuracy: input.accuracy,
          cumulativeDistance: input.cumulativeDistance || '0',
          altitude: input.altitude,
        });

        await db.logAuditEvent({
          userId: ctx.user.id,
          action: "ADD_WAYPOINT",
          entityType: "waypoint",
          entityId: input.attendanceId,
          ipAddress: ctx.req.ip,
        });

        return { success: true };
      }),

    // Admin: Get attendance report with filters
    getReport: adminProcedure
      .input(
        z.object({
          startDate: z.date(),
          endDate: z.date(),
          userId: z.number().optional(),
        })
      )
      .query(async ({ input }) => {
        const db_instance = await db.getDb();
        if (!db_instance) return [];

        try {
          let query = db_instance
            .select({
              id: attendance.id,
              userId: attendance.userId,
              checkInTime: attendance.checkInTime,
              checkOutTime: attendance.checkOutTime,
              checkInLat: attendance.checkInLat,
              checkInLng: attendance.checkInLng,
              checkOutLat: attendance.checkOutLat,
              checkOutLng: attendance.checkOutLng,
              workModality: attendance.workModality,
              distanceTraveled: attendance.distanceTraveled,
            })
            .from(attendance)
            .where(
              and(
                gte(attendance.checkInTime, input.startDate),
                lte(attendance.checkInTime, input.endDate),
                input.userId ? eq(attendance.userId, input.userId) : undefined
              )
            );

          const records = await query;
          
          // Get user names for each record
          const enrichedRecords = await Promise.all(
            records.map(async (record) => {
              const user = await db.getUserById(record.userId);
              const checkInTime = new Date(record.checkInTime);
              const checkOutTime = record.checkOutTime ? new Date(record.checkOutTime) : null;
              const hoursWorked = checkOutTime
                ? ((checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60)).toFixed(2)
                : '0';

              return {
                id: record.id,
                staffId: record.userId,
                name: user?.name || 'Unknown',
                date: checkInTime.toISOString().split('T')[0],
                checkInTime: checkInTime.toLocaleTimeString(),
                checkOutTime: checkOutTime ? checkOutTime.toLocaleTimeString() : 'Not checked out',
                status: checkOutTime ? 'Present' : 'Checked In',
                distance: record.distanceTraveled ? parseFloat(record.distanceTraveled as any).toFixed(2) : '0',
                hoursWorked,
                workModality: record.workModality || 'N/A',
              };
            })
          );

          return enrichedRecords;
        } catch (error) {
          console.error('Error generating attendance report:', error);
          return [];
        }
      }),
  }),

  // ============ WAYPOINT PROCEDURES ============

  waypoints: router({
    // Staff: Add waypoint during field work
    add: protectedProcedure
      .input(
        z.object({
          attendanceId: z.number(),
          latitude: z.string(),
          longitude: z.string(),
          accuracy: z.string(),
          cumulativeDistance: z.string(),
          altitude: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const attendance = await db.getAttendanceById(input.attendanceId);
        if (!attendance) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }

        if (attendance.userId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }

        await db.addWaypoint({
          attendanceId: input.attendanceId,
          userId: ctx.user.id,
          latitude: input.latitude,
          longitude: input.longitude,
          accuracy: input.accuracy,
          cumulativeDistance: input.cumulativeDistance,
          altitude: input.altitude,
        });

        return { success: true };
      }),

    // Supervisor/Admin: Get waypoints for attendance
    get: supervisorProcedure
      .input(z.object({ attendanceId: z.number() }))
      .query(async ({ input }) => {
        return await db.getWaypoints(input.attendanceId);
      }),
  }),

  // ============ LEAVE PROCEDURES ============

  leave: router({
    // Staff: Create leave request
    createRequest: protectedProcedure
      .input(
        z.object({
          leaveType: z.enum(["annual", "sick", "unpaid", "maternity", "other"]),
          startDate: z.date(),
          endDate: z.date(),
          daysRequested: z.string(),
          reason: z.string().optional(),

          supportingDocumentKey: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await db.createLeaveRequest({
          userId: ctx.user.id,
          leaveType: input.leaveType,
          startDate: input.startDate,
          endDate: input.endDate,
          daysRequested: input.daysRequested,
          reason: input.reason,

          supportingDocumentKey: input.supportingDocumentKey,
        });

        await db.logAuditEvent({
          userId: ctx.user.id,
          action: "CREATE_LEAVE_REQUEST",
          entityType: "leave_request",
          ipAddress: ctx.req.ip,
        });

        // Send notification to admin
        const startDateStr = input.startDate.toLocaleDateString();
        const endDateStr = input.endDate.toLocaleDateString();
        await notifyOwner({
          title: `New Leave Request from ${ctx.user.name}`,
          content: `${ctx.user.name} has requested ${input.leaveType} leave from ${startDateStr} to ${endDateStr} (${input.daysRequested} days). Reason: ${input.reason || "Not provided"}. Please review and approve/decline in the Admin Dashboard.`,
        }).catch((err) => console.error("Failed to send leave request notification:", err));

        return { success: true };
      }),

    // Staff: Get own leave requests
    getMyRequests: protectedProcedure.query(async ({ ctx }) => {
      return await db.getUserLeaveRequests(ctx.user.id);
    }),

    // Staff: Get leave balance
    getBalance: protectedProcedure
      .input(
        z.object({
          leaveType: z.string(),
          year: z.number().optional(),
        })
      )
      .query(async ({ ctx, input }) => {
        const year = input.year || new Date().getFullYear();
        return await db.getLeaveBalance(ctx.user.id, input.leaveType, year);
      }),

    // Staff: Get all leave balances for dashboard
    getAllBalances: protectedProcedure
      .input(
        z.object({
          year: z.number().optional(),
        })
      )
      .query(async ({ ctx, input }) => {
        const year = input.year || new Date().getFullYear();
        const leaveTypes = ["annual", "sick", "maternity", "unpaid", "other"];
        const balances = [];

        for (const leaveType of leaveTypes) {
          const balance = await db.getLeaveBalance(ctx.user.id, leaveType, year);
          if (balance) {
            balances.push(balance);
          }
        }

        return balances;
      }),

    // Admin: Get pending leave requests
    getPending: adminProcedure.query(async () => {
      return await db.getPendingLeaveRequests();
    }),

    // Admin: Approve leave request
    approve: adminProcedure
      .input(
        z.object({
          leaveRequestId: z.number(),
          reason: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await db.approveLeaveRequest(
          input.leaveRequestId,
          ctx.user.id,
          input.reason
        );

        await db.logAuditEvent({
          userId: ctx.user.id,
          action: "APPROVE_LEAVE",
          entityType: "leave_request",
          entityId: input.leaveRequestId,
          ipAddress: ctx.req.ip,
        });

        // Get leave request and send notifications to staff
        const leaveRequest = await db.getLeaveRequest(input.leaveRequestId);
        if (leaveRequest) {
          // Create in-app notification for staff
          await db.logNotification({
            userId: leaveRequest.userId,
            title: "Leave Request Approved",
            content: `Your ${leaveRequest.leaveType} leave request from ${new Date(leaveRequest.startDate).toLocaleDateString()} to ${new Date(leaveRequest.endDate).toLocaleDateString()} has been approved.${input.reason ? ` Admin note: ${input.reason}` : ""}`,
            eventType: "LEAVE_APPROVAL",
            eventEntityId: input.leaveRequestId,
            channels: { inApp: true, email: true, push: false },
          });

          // Create email notification
          await db.createEmailNotification({
            userId: leaveRequest.userId,
            type: "leave_approved",
            subject: "Leave Request Approved",
            content: `Your leave request for ${leaveRequest.leaveType} leave from ${leaveRequest.startDate} to ${leaveRequest.endDate} has been approved.`,
          });
        }

        return { success: true };
      }),

    // Admin: Reject leave request
    reject: adminProcedure
      .input(
        z.object({
          leaveRequestId: z.number(),
          reason: z.string(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await db.rejectLeaveRequest(
          input.leaveRequestId,
          ctx.user.id,
          input.reason
        );

        await db.logAuditEvent({
          userId: ctx.user.id,
          action: "REJECT_LEAVE",
          entityType: "leave_request",
          entityId: input.leaveRequestId,
          ipAddress: ctx.req.ip,
        });

        // Get leave request and send notifications to staff
        const leaveRequest = await db.getLeaveRequest(input.leaveRequestId);
        if (leaveRequest) {
          // Create in-app notification for staff
          await db.logNotification({
            userId: leaveRequest.userId,
            title: "Leave Request Declined",
            content: `Your ${leaveRequest.leaveType} leave request from ${new Date(leaveRequest.startDate).toLocaleDateString()} to ${new Date(leaveRequest.endDate).toLocaleDateString()} has been declined. Reason: ${input.reason}`,
            eventType: "LEAVE_APPROVAL",
            eventEntityId: input.leaveRequestId,
            channels: { inApp: true, email: true, push: false },
          });

          // Create email notification
          await db.createEmailNotification({
            userId: leaveRequest.userId,
            type: "leave_rejected",
            subject: "Leave Request Declined",
            content: `Your leave request for ${leaveRequest.leaveType} leave has been declined. Reason: ${input.reason}`,
          });
        }

        return { success: true };
      }),

    // Admin: Initialize leave balance for user
    initializeBalance: adminProcedure
      .input(
        z.object({
          userId: z.number(),
          leaveType: z.string(),
          year: z.number(),
          allocatedDays: z.number(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await db.initializeLeaveBalance(
          input.userId,
          input.leaveType,
          input.year,
          input.allocatedDays
        );

        await db.logAuditEvent({
          userId: ctx.user.id,
          action: "INITIALIZE_LEAVE_BALANCE",
          entityType: "leave_balance",
          entityId: input.userId,
          ipAddress: ctx.req.ip,
        });

        return { success: true };
      }),
  }),

  // ============ USER MANAGEMENT PROCEDURES ============

  users: router({
    // Get all active users
    getAll: supervisorProcedure.query(async () => {
      return await db.getAllUsers();
    }),

    // Get user by ID
    getById: supervisorProcedure
      .input(z.object({ userId: z.number() }))
      .query(async ({ input }) => {
        return await db.getUserById(input.userId);
      }),

    // Admin: Update user profile
    updateProfile: adminProcedure
      .input(
        z.object({
          userId: z.number(),
          name: z.string().optional(),
          department: z.string().optional(),
          phoneNumber: z.string().optional(),
          role: z.enum(["staff", "supervisor", "admin"]).optional(),
          isActive: z.boolean().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { userId, ...updates } = input;
        await db.updateUserProfile(userId, updates);

        await db.logAuditEvent({
          userId: ctx.user.id,
          action: "UPDATE_USER_PROFILE",
          entityType: "user",
          entityId: userId,
          details: updates,
          ipAddress: ctx.req.ip,
        });

        return { success: true };
      }),

    // Admin: Get all admins
    getAllAdmins: adminProcedure.query(async () => {
      return await db.getAllUsers().then(users => users.filter(u => u.role === 'admin'));
    }),

    // Admin: Create new admin user
    createAdmin: adminProcedure
      .input(
        z.object({
          email: z.string().email(),
          name: z.string(),
          password: z.string().min(8),
          department: z.string().optional(),
          phoneNumber: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        try {
          // Check if email already exists
          const existingUser = await db.getUserByEmail(input.email);
          if (existingUser) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: 'Email already exists',
            });
          }

          // Create new admin user
          const newAdmin = await db.createAdminUser({
            email: input.email,
            name: input.name,
            password: input.password,
            department: input.department,
            phoneNumber: input.phoneNumber,
            role: 'admin',
          });

          await db.logAuditEvent({
            userId: ctx.user.id,
            action: 'CREATE_ADMIN',
            entityType: 'user',
            entityId: newAdmin.id,
            details: { email: input.email, name: input.name },
            ipAddress: ctx.req.ip,
          });

          return { success: true, adminId: newAdmin.id };
        } catch (error) {
          console.error('[Admin Management] Error creating admin:', error);
          throw error;
        }
      }),

    // Admin: Delete admin user
    deleteAdmin: adminProcedure
      .input(z.object({ adminId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        try {
          // Prevent deleting self
          if (input.adminId === ctx.user.id) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: 'Cannot delete your own admin account',
            });
          }

          await db.deleteUser(input.adminId);

          await db.logAuditEvent({
            userId: ctx.user.id,
            action: 'DELETE_ADMIN',
            entityType: 'user',
            entityId: input.adminId,
            ipAddress: ctx.req.ip,
          });

          return { success: true };
        } catch (error) {
          console.error('[Admin Management] Error deleting admin:', error);
          throw error;
        }
      }),
  }),

  // ============ DOCUMENT PROCEDURES ============

  documents: router({
    // Get user's documents
    getByUser: protectedProcedure.query(async ({ ctx }) => {
      return await db.getDocumentsByUser(ctx.user.id);
    }),

    // Create document record
    create: protectedProcedure
      .input(
        z.object({
          documentType: z.enum([
            "profile_photo",
            "csv_report",
            "leave_document",
            "other",
          ]),
          fileName: z.string(),
          fileKey: z.string(),
          fileUrl: z.string(),
          mimeType: z.string().optional(),
          fileSizeBytes: z.number().optional(),
          relatedEntityType: z.string().optional(),
          relatedEntityId: z.number().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await db.addDocument({
          userId: ctx.user.id,
          documentType: input.documentType,
          fileName: input.fileName,
          fileKey: input.fileKey,
          mimeType: input.mimeType,
          fileSize: input.fileSizeBytes,
          isEncrypted: true,
        });

        return { success: true };
      }),
   }),

  // ============ NOTIFICATION PREFERENCES ============
  notificationPreferences: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      let prefs = await db.getNotificationPreferences(ctx.user.id);
      if (!prefs) {
        prefs = await db.createNotificationPreferences(ctx.user.id);
      }
      return prefs;
    }),

    getHistory: protectedProcedure
      .input(
        z.object({
          limit: z.number().optional().default(50),
          offset: z.number().optional().default(0),
          eventType: z.string().optional(),
          deliveryStatus: z.string().optional(),
          startDate: z.date().optional(),
          endDate: z.date().optional(),
        })
      )
      .query(async ({ ctx, input }) => {
        return await db.getNotificationHistory(ctx.user.id, input);
      }),

    update: protectedProcedure
      .input(
        z.object({
          enableCheckInNotifications: z.boolean().optional(),
          enableCheckOutNotifications: z.boolean().optional(),
          enableLeaveApprovalNotifications: z.boolean().optional(),
          enableOvertimeAlerts: z.boolean().optional(),
          quietHoursEnabled: z.boolean().optional(),
          quietHoursStart: z.string().optional().nullable(),
          quietHoursEnd: z.string().optional().nullable(),
          quietHoursTimezone: z.string().optional(),
          notificationChannels: z
            .object({
              inApp: z.boolean().optional(),
              email: z.boolean().optional(),
              push: z.boolean().optional(),
            })
            .optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const updated = await db.updateNotificationPreferences(ctx.user.id, input);
        return updated || { success: false };
      }),
  }),

  // ============ ANALYTICS PROCEDURES ============
  analytics: analyticsRouter,

  // ============ STATISTICS PROCEDURES ============
  statistics: router({
    getUserStats: protectedProcedure.query(async ({ ctx }) => {
      try {
        // Get leave balance
        const leaveBalance = await db.getAllLeaveBalances(ctx.user.id);
        
        // Get hours worked this week
        const now = new Date();
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay()); // Start of week (Sunday)
        weekStart.setHours(0, 0, 0, 0);
        
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6); // End of week (Saturday)
        weekEnd.setHours(23, 59, 59, 999);
        
        const weeklyHours = await db.getHoursWorkedInRange(ctx.user.id, weekStart, weekEnd);
        
        return {
          leaveBalance: leaveBalance || { annual: 0, sick: 0, casual: 0, maternity: 0 },
          weeklyHours: weeklyHours || 0,
          weekStart: weekStart.toISOString().split('T')[0],
          weekEnd: weekEnd.toISOString().split('T')[0],
        };
      } catch (error) {
        console.error('[Statistics] Error fetching user stats:', error);
        return {
          leaveBalance: { annual: 0, sick: 0, casual: 0, maternity: 0 },
          weeklyHours: 0,
          weekStart: new Date().toISOString().split('T')[0],
          weekEnd: new Date().toISOString().split('T')[0],
        };
      }
    }),
  }),

  // ============ TIMESHEET EXPORT PROCEDURES ============
  export: router({
    timesheets: protectedProcedure
      .input(
        z.object({
          format: z.enum(["csv", "pdf", "excel"]),
          staffId: z.number().optional(),
          startDate: z.string(),
          endDate: z.string(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        try {
          // Only admins can export timesheets
          if (ctx.user.role !== "admin") {
            throw new TRPCError({ code: "FORBIDDEN" });
          }

          const startDate = new Date(input.startDate);
          const endDate = new Date(input.endDate);

          // Fetch timesheet data
          const timesheetData = await getTimesheetDataForExport({
            staffId: input.staffId,
            startDate,
            endDate,
          });

          if (timesheetData.length === 0) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "No timesheet data found for the selected criteria",
            });
          }

          let fileContent: string;
          let mimeType: string;
          let filename: string;

          if (input.format === "csv") {
            fileContent = generateCSVContent(timesheetData);
            mimeType = "text/csv";
            filename = `timesheet_${new Date().getTime()}.csv`;
          } else if (input.format === "excel") {
            fileContent = generateExcelContent(timesheetData);
            mimeType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
            filename = `timesheet_${new Date().getTime()}.xlsx`;
          } else {
            // PDF format - use CSV format for now (can be converted to PDF by user)
            fileContent = generateCSVContent(timesheetData);
            mimeType = "text/csv";
            filename = `timesheet_${new Date().getTime()}.pdf`;
          }

          // Store the file and generate a download URL
          const { url } = await storagePut(
            `exports/${ctx.user.id}/${filename}`,
            Buffer.from(fileContent),
            mimeType
          );

          // Log the export action
          await logAuditEvent({
            userId: ctx.user.id,
            action: "EXPORT_TIMESHEET",
            entityType: "TIMESHEET",
            details: {
              format: input.format,
              staffId: input.staffId || "all",
              startDate: input.startDate,
              endDate: input.endDate,
              recordCount: timesheetData.length,
            },
          });

          return {
            success: true,
            url,
            filename,
            recordCount: timesheetData.length,
          };
        } catch (error) {
          console.error("[Export] Error exporting timesheets:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to export timesheets",
          });
        }
      }),
  }),

  // ============ REPORT SCHEDULING ============
  reportScheduling: router({
    // Create a new report schedule
    create: adminProcedure
      .input(
        z.object({
          reportType: z.enum(["attendance", "overtime", "leave", "gps_activity", "all"]),
          frequency: z.enum(["daily", "weekly"]),
          dayOfWeek: z.string().optional(),
          timeOfDay: z.string(),
          timezone: z.string().default("UTC"),
          emailRecipients: z.array(z.string().email()),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const schedule = await db.createReportSchedule({
          userId: ctx.user.id,
          reportType: input.reportType,
          frequency: input.frequency,
          dayOfWeek: input.dayOfWeek,
          timeOfDay: input.timeOfDay,
          timezone: input.timezone,
          emailRecipients: input.emailRecipients,
          isActive: true,
          nextScheduledAt: new Date(),
        });

        if (!schedule) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create report schedule",
          });
        }

        await db.logAuditEvent({
          userId: ctx.user.id,
          action: "CREATE_REPORT_SCHEDULE",
          entityType: "report_schedule",
          entityId: schedule.id,
          details: { reportType: input.reportType, frequency: input.frequency },
        });

        return schedule;
      }),

    // Get all schedules for current admin
    getAll: adminProcedure.query(async ({ ctx }) => {
      return await db.getReportSchedules(ctx.user.id);
    }),

    // Update a report schedule
    update: adminProcedure
      .input(
        z.object({
          id: z.number(),
          isActive: z.boolean().optional(),
          timeOfDay: z.string().optional(),
          emailRecipients: z.array(z.string().email()).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const schedule = await db.updateReportSchedule(input.id, {
          isActive: input.isActive,
          timeOfDay: input.timeOfDay,
          emailRecipients: input.emailRecipients,
        });

        if (!schedule) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Report schedule not found",
          });
        }

        await db.logAuditEvent({
          userId: ctx.user.id,
          action: "UPDATE_REPORT_SCHEDULE",
          entityType: "report_schedule",
          entityId: input.id,
        });

        return schedule;
      }),

    // Delete a report schedule
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const success = await db.deleteReportSchedule(input.id);

        if (!success) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Report schedule not found",
          });
        }

        await db.logAuditEvent({
          userId: ctx.user.id,
          action: "DELETE_REPORT_SCHEDULE",
          entityType: "report_schedule",
          entityId: input.id,
        });

        return { success: true };
      }),

    // Get delivery history for a schedule
    getDeliveryHistory: adminProcedure
      .input(z.object({ scheduleId: z.number() }))
      .query(async ({ input }) => {
        return await db.getReportDeliveryHistory(input.scheduleId);
      }),
  }),
});
export type AppRouter = typeof appRouter;
