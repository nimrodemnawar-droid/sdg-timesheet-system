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
import { analyticsRouter } from "./analyticsRouter";
import { notifyOwner } from "./_core/notification";

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
    me: publicProcedure.query((opts) => opts.ctx.user),
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
        })
      )
      .mutation(async ({ ctx, input }) => {
        await db.createAttendance({
          userId: ctx.user.id,
          checkInLat: input.latitude,
          checkInLng: input.longitude,
          checkInAccuracy: input.accuracy,
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

        // Send notification to admin if enabled and not in quiet hours
        const prefs = await db.getNotificationPreferences(ctx.user.id);
        const isQuietHours = db.isWithinQuietHours(prefs);
        if (prefs?.enableCheckOutNotifications && !isQuietHours) {
          const checkInTime = new Date(attendance.checkInTime);
          const checkOutTime = new Date();
          const hoursWorked = ((checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60)).toFixed(2);
          await notifyOwner({
            title: `Staff Check-Out: ${ctx.user.name}`,
            content: `${ctx.user.name} checked out at ${checkOutTime.toLocaleTimeString()}. Location: (${parseFloat(input.latitude).toFixed(4)}, ${parseFloat(input.longitude).toFixed(4)}). Accuracy: ${parseFloat(input.accuracy).toFixed(1)}m. Hours worked: ${hoursWorked}h. Distance: ${parseFloat(input.distanceTraveled).toFixed(2)}m`,
          }).catch((err) => console.error("Failed to send check-out notification:", err));
        }

        return { success: true };
      }),

    // Staff: Get today's attendance
    getToday: protectedProcedure.query(async ({ ctx }) => {
      return await db.getTodayAttendance(ctx.user.id);
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
});
export type AppRouter = typeof appRouter;
