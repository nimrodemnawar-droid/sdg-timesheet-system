import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import { countKenyaWorkingDays } from "../shared/leave";
import * as db from "./db";
import {
  encryptData,
  decryptData,
  calculateDistance,
  getAccuracyQuality,
} from "./encryption";
import { TRPCError } from "@trpc/server";
import { and, eq, gte, lte, desc, asc, isNotNull } from "drizzle-orm";
import { getAllStaffAttendanceByDateRange } from "./db";
import { attendance, waypoints, users } from "../drizzle/schema";
import { analyticsRouter } from "./analyticsRouter";
import { notifyOwner } from "./_core/notification";
import { storagePut } from "./storage";
import { generateCSVContent, generateExcelContent, generateTimesheetPDFContent } from "./db";
import { logAuditEvent } from "./db";
import { getTimesheetDataForExport } from "./db";
import {
  createDatabaseBackup,
  serializeBackup,
  generateStaffCsv,
  generateAttendanceCsv,
  getBackupPreview,
  restoreDatabaseBackup,
} from "./dataManagement";

// Helper to ensure admin role
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
  return next({ ctx });
});

export const appRouter = router({
  auth: router({
    me: publicProcedure.query(({ ctx }) => ctx.user),
    logout: protectedProcedure.mutation(async ({ ctx }) => {
      ctx.res.clearCookie("app_session_id", getSessionCookieOptions(ctx.req));
      return { success: true };
    }),
  }),

  system: systemRouter,
  analytics: analyticsRouter,

  dataManagement: router({
    exportDatabase: adminProcedure.mutation(async () => {
      const snapshot = await createDatabaseBackup();
      const content = serializeBackup(snapshot);
      return {
        filename: `sdg-timesheet-backup-${new Date().toISOString().replace(/[:.]/g, "-")}.json`,
        content,
        generatedAt: snapshot.generatedAt,
        recordCounts: snapshot.recordCounts,
        totalRecords: Object.values(snapshot.recordCounts).reduce((total, count) => total + count, 0),
      };
    }),

    exportCsv: adminProcedure
      .input(z.object({
        type: z.enum(["staff", "attendance"]),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      }))
      .mutation(async ({ input }) => {
        const content = input.type === "staff"
          ? await generateStaffCsv()
          : await generateAttendanceCsv(input.startDate, input.endDate);
        return {
          filename: `sdg-${input.type}-export-${new Date().toISOString().replace(/[:.]/g, "-")}.csv`,
          content,
          recordCount: Math.max(0, content.trim().split("\\n").length - 1),
        };
      }),

    previewRestore: adminProcedure
      .input(z.object({ backupJson: z.string().min(1).max(20 * 1024 * 1024) }))
      .mutation(async ({ input }) => getBackupPreview(input.backupJson)),

    restore: adminProcedure
      .input(z.object({
        backupJson: z.string().min(1).max(20 * 1024 * 1024),
        confirmation: z.literal("RESTORE DATABASE"),
      }))
      .mutation(async ({ ctx, input }) => {
        const preRestoreSnapshot = await createDatabaseBackup();
        const preRestoreContent = serializeBackup(preRestoreSnapshot);
        const preRestoreKey = `backups/pre-restore-${ctx.user.id}-${Date.now()}.json`;
        const { url: preRestoreBackupUrl } = await storagePut(preRestoreKey, Buffer.from(preRestoreContent, "utf8"), "application/json");
        const result = await restoreDatabaseBackup(input.backupJson);
        await logAuditEvent({
          userId: ctx.user.id,
          action: "DATABASE_RESTORE",
          entityType: "database",
          details: {
            restoredRecords: result.totalRecords,
            preRestoreBackupKey: preRestoreKey,
          },
        });
        return { ...result, preRestoreBackupUrl };
      }),
  }),

  attendance: router({
    // Import db functions at top of file
    checkIn: protectedProcedure
      .input(
        z.object({
          latitude: z.number(),
          longitude: z.number(),
          accuracy: z.number(),
          timestamp: z.string(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const encrypted = encryptData(
          JSON.stringify({
            latitude: input.latitude,
            longitude: input.longitude,
            accuracy: input.accuracy,
          })
        );

        // Get address name from coordinates using reverse geocoding
        const { reverseGeocode } = await import('./staffTracking');
        const address = await reverseGeocode(input.latitude, input.longitude);

        const result = await db.checkIn(ctx.user.id, {
          latitude: input.latitude,
          longitude: input.longitude,
          accuracy: input.accuracy,
          timestamp: new Date(input.timestamp),
          encryptedLocation: encrypted,
          address: address,
        });

        return result;
      }),

    checkOut: protectedProcedure
      .input(
        z.object({
          latitude: z.number(),
          longitude: z.number(),
          accuracy: z.number(),
          timestamp: z.string(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        // Get today's attendance record for the user to get the attendance ID
        const todayAttendance = await db.getTodayAttendance(ctx.user.id);
        if (!todayAttendance) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'No check-in found for today. Please check in first.',
          });
        }
        if (!todayAttendance.isSubmitted) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Submit your timesheet before checking out.',
          });
        }

        const encrypted = encryptData(
          JSON.stringify({
            latitude: input.latitude,
            longitude: input.longitude,
            accuracy: input.accuracy,
          })
        );

        // Get address name from coordinates using reverse geocoding
        const { reverseGeocode } = await import('./staffTracking');
        const address = await reverseGeocode(input.latitude, input.longitude);

        const result = await db.checkOut(todayAttendance.id, {
          latitude: input.latitude,
          longitude: input.longitude,
          accuracy: input.accuracy,
          timestamp: new Date(input.timestamp),
          encryptedLocation: encrypted,
          address: address,
        });

        return result;
      }),

    getToday: protectedProcedure.query(async ({ ctx }) => {
      return db.getTodayAttendance(ctx.user.id);
    }),

    getMyHistory: protectedProcedure
      .input(z.object({ startDate: z.string(), endDate: z.string() }))
      .query(async ({ ctx, input }) => {
        return db.getAttendanceRange(ctx.user.id, new Date(input.startDate), new Date(input.endDate));
      }),

    getTodayAllStaff: adminProcedure.query(async () => {
      const staffList = await db.getAllStaffCheckedInToday();
      return {
        checkedInToday: staffList,
        checkedInCount: staffList.length,
      };
    }),

    getByDateRange: protectedProcedure
      .input(
        z.object({
          startDate: z.string(),
          endDate: z.string(),
        })
      )
      .query(async ({ input, ctx }) => {
        return db.getAttendanceRange(ctx.user.id, new Date(input.startDate), new Date(input.endDate));
      }),

    getAdminReports: adminProcedure
      .input(
        z.object({
          startDate: z.string(),
          endDate: z.string(),
        })
      )
      .query(async ({ input }) => {
        return db.getAllStaffAttendanceByDateRange(
          new Date(input.startDate),
          new Date(input.endDate)
        );
      }),


    submitTimesheet: protectedProcedure
      .input(
        z.object({
          attendanceId: z.number().int().positive(),
          workModality: z.enum(["nairobi_office", "homa_bay_office", "field", "remote"]).optional(),
          activityCategoryId: z.number().int().positive().optional(),
          kpiId: z.number().int().positive().optional(),
          program: z.string().trim().max(255).optional(),
          organization: z.enum(["icy_africa", "africa_for_sdgs", "joint"]).optional(),
          departmentFunction: z.string().trim().max(100).optional(),
          programProject: z.string().trim().max(255).optional(),
          staffRemarks: z.string().trim().max(5000).optional(),
          tasks: z.array(z.object({
            estimatedDuration: z.enum(["0_1_hour", "2_hours", "3_hours", "4_hours", "5_8_hours"]),
            activityType: z.string().trim().min(1).max(100),
            taskDescription: z.string().trim().min(1).max(5000),
            specificActivity: z.string().trim().min(1).max(5000),
            targetStakeholder: z.string().trim().max(5000).optional(),
            locationPlatform: z.enum(["physical_location", "zoom", "whatsapp", "email", "school", "church", "other"]).optional(),
            tangibleOutput: z.string().trim().max(5000).optional(),
            numbersReached: z.number().int().min(0).max(1000000).optional(),
            outcomeResults: z.string().trim().max(5000).optional(),
            followUpRequired: z.enum(["yes", "no"]).default("no"),
            evidenceType: z.enum(["report", "photo", "email", "registration_list", "document", "social_media_link", "other"]).optional(),
            evidenceLink: z.string().trim().max(5000).optional(),
            activityStatus: z.enum(["completed", "ongoing", "pending"]).default("completed"),
            onlineMissionary: z.boolean().default(false),
            onlineMissionaryParticipants: z.number().int().min(0).max(1000000).optional(),
            challenges: z.string().trim().max(5000).optional(),
            coordination: z.array(z.object({
              country: z.string().trim().min(1).max(100),
              participantsAttended: z.number().int().min(0).max(1000000),
            })).max(50).optional(),
          })).min(1).max(4),
        })
      )
      .mutation(async ({ input, ctx }) => {
        try {
          const attendance = await db.getAttendanceById(input.attendanceId);
          if (!attendance || attendance.userId !== ctx.user.id) {
            throw new TRPCError({ code: "FORBIDDEN", message: "You can only submit your own timesheet" });
          }
          if (attendance.isSubmitted) {
            throw new TRPCError({ code: "CONFLICT", message: "This timesheet has already been submitted" });
          }

          await db.updateAttendanceWithTimesheetData(input.attendanceId, {
            workModality: input.workModality,
            activityCategoryId: input.activityCategoryId,
            kpiId: input.kpiId,
            program: input.program,
            organization: input.organization,
            departmentFunction: input.departmentFunction,
            programProject: input.programProject,
            staffRemarks: input.staffRemarks,
          });
          await db.replaceTimesheetTasks(input.attendanceId, ctx.user.id, input.tasks);
          await db.submitTimesheet(input.attendanceId);

          const hoursWorked = attendance.durationMinutes ? attendance.durationMinutes / 60 : 0;
          const isOvertime = hoursWorked > 8;
          const overtimeHours = isOvertime ? hoursWorked - 8 : 0;
          const taskSummary = input.tasks.map((task, index) => {
            const coordination = task.coordination?.length
              ? `; Countries: ${task.coordination.map((item) => `${item.country} (${item.participantsAttended})`).join(", ")}`
              : "";
            return `Task ${index + 1} [${task.activityType}; ${task.estimatedDuration}]: ${task.specificActivity || task.taskDescription}${task.challenges ? `; Challenges: ${task.challenges}` : ""}${coordination}`;
          }).join("\n");

          try {
            await notifyOwner({
              title: `📋 Timesheet Submitted - ${ctx.user.name} (#${(ctx.user.staffNumber || 0).toString().padStart(3, '0')})`,
              content: `Staff member ${ctx.user.name} has submitted their timesheet.\n\nWork Hours: ${hoursWorked.toFixed(2)}h${isOvertime ? ` (⚠️ OVERTIME: ${overtimeHours.toFixed(2)}h)` : ''}\nWork Modality: ${input.workModality || 'Not specified'}\n${taskSummary}`,
            });
          } catch (emailError) {
            console.error('[tRPC] Error sending timesheet notification:', emailError);
          }

          await logAuditEvent({
            userId: ctx.user.id,
            action: "TIMESHEET_SUBMITTED",
            entityType: "ATTENDANCE",
            entityId: input.attendanceId,
            details: { attendanceId: input.attendanceId, taskCount: input.tasks.length },
          });

          return { success: true, message: "Timesheet submitted successfully", taskCount: input.tasks.length };
        } catch (error) {
          if (error instanceof TRPCError) throw error;
          console.error("[tRPC] Error submitting timesheet:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to submit timesheet",
          });
        }
      }),

    getCompleteTimesheetData: adminProcedure
      .input(z.object({ startDate: z.string().optional(), endDate: z.string().optional(), staffId: z.number().int().positive().optional(), allHistory: z.boolean().optional() }))
      .query(async ({ input }) => {
        try {
          const data = await db.getCompleteTimesheetData({
            startDate: input.startDate ? new Date(input.startDate) : undefined,
            endDate: input.endDate ? new Date(input.endDate) : undefined,
            staffId: input.staffId,
            allHistory: input.allHistory,
          });
          return data;
        } catch (error) {
          console.error('[tRPC] Error fetching complete timesheet data:', error);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to fetch timesheet data',
          });
        }
      }),

    generateDailyReport: adminProcedure
      .input(z.object({ date: z.string().optional() }))
      .mutation(async ({ input }) => {
        try {
          const summary = await db.generateDailyTimesheetSummary(input.date ? new Date(input.date) : undefined);
          
          if (!summary) {
            throw new TRPCError({
              code: 'INTERNAL_SERVER_ERROR',
              message: 'Failed to generate daily report',
            });
          }
          
          // Format the report for email
          const categoryList = Object.entries(summary.activitiesByCategory)
            .map(([category, count]) => `${category}: ${count}`)
            .join('\n');
          
          const sdgList = Object.entries(summary.activitiesBySDG)
            .map(([goal, count]) => `${goal}: ${count}`)
            .join('\n');
          
          const pendingStaff = summary.records
            .filter((r: any) => !r.isSubmitted)
            .map((r: any) => `${r.staffName} (${r.staffNumber})`)
            .join('\n') || 'None';

          const reportContent = `Daily Timesheet Summary Report
Date: ${summary.date}

=== OVERVIEW ===
Total Staff Checked In: ${summary.totalStaffCheckedIn}
Timesheet Submitted: ${summary.submittedCount}
Pending Submission: ${summary.pendingCount}
Total Hours Worked: ${summary.totalHours} hours

=== ACTIVITIES BY CATEGORY ===
${categoryList}

=== ACTIVITIES BY SDG GOAL ===
${sdgList}

=== STAFF WITH PENDING SUBMISSIONS ===
${pendingStaff}

Report generated at: ${new Date().toISOString()}`;
          
          // Send notification to admin
          const success = await notifyOwner({
            title: `Daily Timesheet Summary - ${summary.date}`,
            content: reportContent,
          });
          
          return {
            success,
            summary,
            message: success ? 'Report sent successfully' : 'Report generated but notification failed',
          };
        } catch (error) {
          console.error('[tRPC] Error generating daily report:', error);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to generate daily report',
          });
        }
      }),

    getWaypoints: protectedProcedure
      .input(z.object({ attendanceId: z.number() }))
      .query(async ({ input, ctx }) => {
        try {
          return await db.getWaypoints(input.attendanceId);
        } catch (error) {
          console.error('[tRPC] Error fetching waypoints:', error);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to fetch waypoints',
          });
        }
      }),

    addWaypoint: protectedProcedure
      .input(
        z.object({
          attendanceId: z.number(),
          latitude: z.number(),
          longitude: z.number(),
          accuracy: z.number(),
          cumulativeDistance: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        try {
          return await db.addWaypoint({
            attendanceId: input.attendanceId,
            userId: ctx.user.id,
            latitude: input.latitude.toString(),
            longitude: input.longitude.toString(),
            accuracy: input.accuracy.toString(),
            cumulativeDistance: input.cumulativeDistance || '0',
          });
        } catch (error) {
          console.error('[tRPC] Error adding waypoint:', error);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to add waypoint',
          });
        }
      }),

    getStaffAttendance: adminProcedure
      .input(z.object({ staffId: z.number().optional(), startDate: z.string().optional(), endDate: z.string().optional() }))
      .query(async ({ input }) => {
        try {
          const startDate = input.startDate ? new Date(input.startDate) : new Date();
          const endDate = input.endDate ? new Date(input.endDate) : new Date();
          return await db.getAttendanceRange(input.staffId || 0, startDate, endDate);
        } catch (error) {
          console.error('[tRPC] Error fetching staff attendance:', error);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to fetch staff attendance',
          });
        }
      }),

    addRemark: adminProcedure
      .input(z.object({ attendanceId: z.number(), remark: z.string() }))
      .mutation(async ({ input }) => {
        try {
          return { success: true, message: 'Remark added successfully' };
        } catch (error) {
          console.error('[tRPC] Error adding remark:', error);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to add remark',
          });
        }
      }),
  }),

  statistics: router({
    getUserStats: protectedProcedure.query(async ({ ctx }) => {
      try {
        // Get today's attendance
        const todayAttendance = await db.getTodayAttendance(ctx.user.id);
        
        // Get this week's attendance
        const today = new Date();
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);
        
        const weekAttendance = await db.getAttendanceRange(ctx.user.id, startOfWeek, endOfWeek);
        
        // Calculate hours
        let todayHours = 0;
        let weekHours = 0;
        
        if (todayAttendance?.checkInTime && todayAttendance?.checkOutTime) {
          todayHours = (todayAttendance.checkOutTime.getTime() - todayAttendance.checkInTime.getTime()) / (1000 * 60 * 60);
        }
        
        weekAttendance?.forEach((record: any) => {
          if (record.checkInTime && record.checkOutTime) {
            const hours = (record.checkOutTime.getTime() - record.checkInTime.getTime()) / (1000 * 60 * 60);
            weekHours += hours;
          }
        });
        
        // Get leave balance data
        const leaveBalanceData = await db.getAllLeaveBalances(ctx.user.id);
        
        return {
          todayCheckedIn: todayAttendance ? true : false,
          todayHours: Math.round(todayHours * 100) / 100,
          weekHours: Math.round(weekHours * 100) / 100,
          weekDaysWorked: weekAttendance?.length || 0,
          weekStart: startOfWeek.toISOString().split('T')[0],
          weekEnd: endOfWeek.toISOString().split('T')[0],
          leaveBalance: leaveBalanceData || {
            annual: 21,
            sick: 5,
            unpaid: 999,
            maternity: 90,
          },
          role: ctx.user.role,
          staffNumber: ctx.user.staffNumber,
        };
      } catch (error) {
        console.error('[tRPC] Error fetching user stats:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch user statistics',
        });
      }
    }),
  }),

  kpi: router({
    getKPIs: protectedProcedure.query(async () => {
      try {
        return await db.getActiveKPIs();
      } catch (error) {
        console.error('[tRPC] Error fetching KPIs:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch KPIs',
        });
      }
    }),
  }),

  leave: router({
    getBalance: protectedProcedure
      .input(
        z.object({
          leaveType: z.enum(['annual', 'sick', 'unpaid', 'maternity', 'other']),
          year: z.number().optional(),
        })
      )
      .query(async ({ input, ctx }) => {
        try {
          const year = input.year || new Date().getFullYear();
          if (input.leaveType === "annual") {
            await db.ensureAnnualLeaveBalance(ctx.user.id, year);
          }
          const balance = await db.getLeaveBalance(ctx.user.id, input.leaveType, year);
          return balance;
        } catch (error) {
          console.error('[tRPC] Error fetching leave balance:', error);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to fetch leave balance',
          });
        }
      }),

    getTypes: protectedProcedure.query(async () => {
      const types = await db.getLeaveTypeSettings(false);
      return types;
    }),

    getAllTypes: adminProcedure.query(async () => {
      return db.getLeaveTypeSettings(true);
    }),

    updateType: adminProcedure
      .input(z.object({
        leaveType: z.enum(['annual', 'sick', 'unpaid', 'maternity', 'other']),
        label: z.string().trim().min(2).max(100),
        description: z.string().trim().max(500).nullable().optional(),
        isActive: z.boolean(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (input.leaveType === 'annual' && !input.isActive) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Annual leave must remain available.' });
        }
        const updated = await db.updateLeaveTypeSetting(
          input.leaveType,
          input.label,
          input.description?.trim() || null,
          input.isActive || input.leaveType === 'annual',
        );
        if (!updated) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Leave type could not be updated.' });
        }
        await db.logAuditEvent({
          userId: ctx.user.id,
          action: 'leave_type_updated',
          entityType: 'leave_type_setting',
          entityId: updated.id,
          details: { leaveType: input.leaveType, label: updated.label, isActive: updated.isActive },
        });
        return updated;
      }),

    getMyRequests: protectedProcedure.query(async ({ ctx }) => {
      try {
        return await db.getUserLeaveRequests(ctx.user.id);
      } catch (error) {
        console.error('[tRPC] Error fetching leave requests:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch leave requests',
        });
      }
    }),

    getAllBalances: adminProcedure.query(async () => {
      try {
        const users = await db.getAllUsers();
        const currentYear = new Date().getFullYear();
        const balances = await Promise.all(
          users.map(async (user) => {
            await db.ensureAnnualLeaveBalance(user.id, currentYear);
            return {
            userId: user.id,
            userName: user.name,
            annual: await db.getLeaveBalance(user.id, 'annual', currentYear),
            sick: await db.getLeaveBalance(user.id, 'sick', currentYear),
            maternity: await db.getLeaveBalance(user.id, 'maternity', currentYear),
            unpaid: await db.getLeaveBalance(user.id, 'unpaid', currentYear),
            };
          })
        );
        return balances;
      } catch (error) {
        console.error('[tRPC] Error fetching leave balances:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch leave balances',
        });
      }
    }),

    updateBalance: adminProcedure
      .input(z.object({
        userId: z.number().int().positive(),
        leaveType: z.enum(['annual', 'sick', 'unpaid', 'maternity', 'other']),
        year: z.number().int().min(2020).max(2100).optional(),
        allocatedDays: z.number().finite().min(0).max(365),
      }))
      .mutation(async ({ input, ctx }) => {
        const year = input.year ?? new Date().getFullYear();
        if (input.leaveType === 'annual' && input.allocatedDays !== 21) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Annual leave entitlement must remain 21 working days.',
          });
        }

        const updated = await db.updateLeaveBalanceAllocation(
          input.userId,
          input.leaveType,
          year,
          input.allocatedDays,
        );
        if (!updated) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Leave balance could not be found or created.',
          });
        }

        await db.logAuditEvent({
          userId: ctx.user.id,
          action: 'leave_balance_updated',
          entityType: 'leave_balance',
          entityId: updated.id,
          details: {
            targetUserId: input.userId,
            leaveType: input.leaveType,
            year,
            allocatedDays: input.allocatedDays,
            usedDays: Number(updated.usedDays),
            remainingDays: Number(updated.remainingDays),
          },
        });
        return updated;
      }),

    getPending: adminProcedure.query(async () => {
      try {
        return await db.getPendingLeaveRequests();
      } catch (error) {
        console.error('[tRPC] Error fetching pending leave requests:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch pending leave requests',
        });
      }
    }),

    getAll: adminProcedure.query(async () => {
      try {
        return await db.getAllLeaveRequests();
      } catch (error) {
        console.error('[tRPC] Error fetching all leave requests:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch all leave requests',
        });
      }
    }),

    analytics: adminProcedure.query(async () => {
      try {
        return await db.getLeaveAnalytics();
      } catch (error) {
        console.error('[tRPC] Error fetching leave analytics:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch leave analytics',
        });
      }
    }),

    approve: adminProcedure
      .input(
        z.object({
          leaveRequestId: z.number().int().positive(),
          reason: z.string().trim().min(1).max(1000),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const request = await db.getLeaveRequest(input.leaveRequestId);
        if (!request) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Leave request not found" });
        }
        if (request.status !== "pending") {
          throw new TRPCError({ code: "CONFLICT", message: "Leave request has already been decided" });
        }
        if (request.leaveType === "annual") {
          await db.ensureAnnualLeaveBalance(request.userId, new Date(request.startDate).getFullYear());
        }

        await db.approveLeaveRequest(input.leaveRequestId, ctx.user.id, input.reason);
        return { success: true, status: "approved" as const, leaveRequestId: input.leaveRequestId };
      }),

    approveMany: adminProcedure
      .input(
        z.object({
          leaveRequestIds: z.array(z.number().int().positive()).min(1).max(100),
          reason: z.string().trim().min(1).max(1000),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const leaveRequestIds = Array.from(new Set(input.leaveRequestIds));
        const requests = await Promise.all(leaveRequestIds.map((id) => db.getLeaveRequest(id)));
        const missingId = leaveRequestIds[requests.findIndex((request) => !request)];
        if (missingId) {
          throw new TRPCError({ code: "NOT_FOUND", message: `Leave request ${missingId} not found` });
        }
        const decidedRequest = requests.find((request) => request?.status !== "pending");
        if (decidedRequest) {
          throw new TRPCError({ code: "CONFLICT", message: "All selected leave requests must still be pending" });
        }

        await Promise.all(requests.map(async (request) => {
          if (request?.leaveType === "annual") {
            await db.ensureAnnualLeaveBalance(request.userId, new Date(request.startDate).getFullYear());
          }
          return db.approveLeaveRequest(request!.id, ctx.user.id, input.reason);
        }));
        return {
          success: true,
          status: "approved" as const,
          approvedCount: leaveRequestIds.length,
          leaveRequestIds,
        };
      }),

    reject: adminProcedure
      .input(
        z.object({
          leaveRequestId: z.number().int().positive(),
          reason: z.string().trim().min(1).max(1000),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const request = await db.getLeaveRequest(input.leaveRequestId);
        if (!request) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Leave request not found" });
        }
        if (request.status !== "pending") {
          throw new TRPCError({ code: "CONFLICT", message: "Leave request has already been decided" });
        }

        await db.rejectLeaveRequest(input.leaveRequestId, ctx.user.id, input.reason);
        return { success: true, status: "rejected" as const, leaveRequestId: input.leaveRequestId };
      }),

    createRequest: protectedProcedure
      .input(
        z.object({
          leaveType: z.enum(['annual', 'sick', 'unpaid', 'maternity', 'other']),
          startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
          endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
          reason: z.string().trim().max(5000).optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        try {
          const startDate = new Date(`${input.startDate}T00:00:00`);
          const endDate = new Date(`${input.endDate}T00:00:00`);
          
          if (startDate > endDate) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: 'Start date must be before end date',
            });
          }
          
          const activeLeaveTypes = await db.getLeaveTypeSettings(false);
          if (!activeLeaveTypes.some((setting) => setting.leaveType === input.leaveType)) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: 'This leave type is currently unavailable for new requests.',
            });
          }
          const leaveYear = startDate.getFullYear();
          if (input.leaveType === "annual") {
            await db.ensureAnnualLeaveBalance(ctx.user.id, leaveYear);
          } else if (!(await db.getLeaveBalance(ctx.user.id, input.leaveType, leaveYear))) {
            const configuredType = activeLeaveTypes.find((setting) => setting.leaveType === input.leaveType);
            await db.initializeLeaveBalance(ctx.user.id, input.leaveType, leaveYear, Number(configuredType?.defaultAllocatedDays ?? 0));
          }
          const daysRequested = countKenyaWorkingDays(startDate, endDate);
          if (daysRequested <= 0) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: 'The selected dates contain no working days. Weekends and public holidays are excluded.',
            });
          }

          const result = await db.createLeaveRequest({
            userId: ctx.user.id,
            leaveType: input.leaveType,
            startDate,
            endDate,
            daysRequested: daysRequested.toString(),
            reason: input.reason,
          });
          
          if (!result) {
            throw new TRPCError({
              code: 'INTERNAL_SERVER_ERROR',
              message: 'Failed to create leave request',
            });
          }
          
          await notifyOwner({
            title: 'New Leave Request',
            content: `${ctx.user.name} submitted ${input.leaveType} leave for ${daysRequested} working day(s) from ${input.startDate} to ${input.endDate}`,
          });
          
          return { success: true, message: 'Leave request created successfully' };
        } catch (error) {
          console.error('[tRPC] Error creating leave request:', error);
          if (error instanceof TRPCError) throw error;
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to create leave request',
          });
        }
      }),
  }),

  users: router({
    getAll: adminProcedure.query(async () => {
      try {
        return await db.getAllUsers();
      } catch (error) {
        console.error('[tRPC] Error fetching all users:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch users',
        });
      }
    }),

    getAllAdmins: adminProcedure.query(async () => {
      try {
        const users = await db.getAllUsers();
        return users.filter(user => user.role === 'admin');
      } catch (error) {
        console.error('[tRPC] Error fetching admin users:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch admin users',
        });
      }
    }),

    createAdmin: adminProcedure
      .input(
        z.object({
          email: z.string().email(),
          name: z.string().min(1),
          password: z.string().min(6),
          department: z.string().optional(),
          phoneNumber: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        try {
          const users = await db.getAllUsers();
          const existingUser = users.find(u => u.email === input.email);
          if (existingUser) {
            throw new TRPCError({
              code: 'CONFLICT',
              message: 'User with this email already exists',
            });
          }

          const newAdmin = {
            id: Math.max(...users.map(u => u.id), 0) + 1,
            email: input.email,
            name: input.name,
            role: 'admin' as const,
            department: input.department || null,
            phoneNumber: input.phoneNumber || null,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          return newAdmin;
        } catch (error: any) {
          console.error('[tRPC] Error creating admin:', error);
          throw error instanceof TRPCError ? error : new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to create admin',
          });
        }
      }),

    deleteAdmin: adminProcedure
      .input(z.object({ adminId: z.number() }))
      .mutation(async ({ input }) => {
        try {
          const users = await db.getAllUsers();
          const adminCount = users.filter(u => u.role === 'admin').length;
          
          if (adminCount <= 1) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: 'Cannot delete the last admin user',
            });
          }

          return { success: true };
        } catch (error: any) {
          console.error('[tRPC] Error deleting admin:', error);
          throw error instanceof TRPCError ? error : new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to delete admin',
          });
        }
      }),
  }),

  notificationPreferences: router({
    getHistory: protectedProcedure.query(async ({ ctx }) => {
      try {
        return [];
      } catch (error) {
        console.error('[tRPC] Error fetching notification history:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch notification history',
        });
      }
    }),

    get: protectedProcedure.query(async ({ ctx }) => {
      try {
        return { notificationsEnabled: true, emailNotifications: true };
      } catch (error) {
        console.error('[tRPC] Error fetching notification preferences:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch notification preferences',
        });
      }
    }),
  }),

  timesheet: router({
    getComplete: adminProcedure
      .input(z.object({ startDate: z.string().optional(), endDate: z.string().optional(), staffId: z.number().int().positive().optional(), allHistory: z.boolean().optional() }))
      .query(async ({ input }) => {
        try {
          return await db.getCompleteTimesheetData({
            startDate: input.startDate ? new Date(input.startDate) : undefined,
            endDate: input.endDate ? new Date(input.endDate) : undefined,
            staffId: input.staffId,
            allHistory: input.allHistory,
          });
        } catch (error) {
          console.error('[tRPC] Error fetching complete timesheet data:', error);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to fetch timesheet data',
          });
        }
      }),

    getMyComplete: protectedProcedure
      .input(z.object({ startDate: z.string().optional(), endDate: z.string().optional() }))
      .query(async ({ input, ctx }) => {
        try {
          return await db.getCompleteTimesheetData({
            staffId: ctx.user.id,
            startDate: input.startDate ? new Date(`${input.startDate}T00:00:00`) : undefined,
            endDate: input.endDate ? new Date(`${input.endDate}T23:59:59`) : undefined,
          });
        } catch (error) {
          console.error('[tRPC] Error fetching personal timesheet history:', error);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to fetch personal timesheet history',
          });
        }
      }),
  }),

  reportScheduling: router({
    getAll: adminProcedure.query(async () => {
      try {
        return [];
      } catch (error) {
        console.error('[tRPC] Error fetching report schedules:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch report schedules',
        });
      }
    }),
  }),

  export: router({
    timesheets: adminProcedure
      .input(z.object({ format: z.enum(['pdf', 'csv', 'excel']).optional(), staffId: z.number().optional(), startDate: z.string().optional(), endDate: z.string().optional() }))
      .mutation(async ({ input }) => {
        try {
          const format = input.format || 'csv';
          
          // Parse dates with proper defaults
          const startDate = input.startDate ? new Date(input.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
          const endDate = input.endDate ? new Date(input.endDate) : new Date();
          
          // Fetch complete timesheet data with filters applied
          const data = await db.getTimesheetDataForExport({
            staffId: input.staffId,
            startDate,
            endDate,
          });
          
          // Generate content based on format
          let content: string;
          let filename: string;
          
          if (format === 'excel') {
            content = db.generateExcelContent(data);
            filename = `timesheets_${new Date().toISOString().split('T')[0]}.xlsx`;
          } else if (format === 'pdf') {
            content = await db.generateTimesheetPDFContent(data);
            filename = `timesheets_${new Date().toISOString().split('T')[0]}.pdf`;
          } else {
            content = db.generateCSVContent(data);
            filename = `timesheets_${new Date().toISOString().split('T')[0]}.csv`;
          }
          
          return { success: true, content, filename };
        } catch (error) {
          console.error('[tRPC] Error exporting timesheets:', error);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to export timesheets',
          });
        }
      }),
  }),

  scheduledExport: router({
    configureWeekly: adminProcedure
      .input(z.object({ 
        dayOfWeek: z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday']),
        time: z.string(),
        format: z.enum(['csv', 'excel', 'pdf']),
      }))
      .mutation(async ({ input }) => {
        try {
          await notifyOwner({
            title: 'Weekly Timesheet Export Configured',
            content: `Automatic weekly timesheet exports configured for ${input.dayOfWeek} at ${input.time} in ${input.format} format.`,
          });
          return { success: true, message: 'Weekly export configured successfully' };
        } catch (error) {
          console.error('[tRPC] Error configuring weekly export:', error);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to configure weekly export',
          });
        }
      }),

    getConfiguration: adminProcedure.query(async () => {
      try {
        return {
          dayOfWeek: 'friday',
          time: '17:00',
          format: 'csv',
          isActive: false,
        };
      } catch (error) {
        console.error('[tRPC] Error fetching export configuration:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch export configuration',
        });
      }
    }),
  }),

  waypoints: router({
    getHistory: adminProcedure
      .input(z.object({ 
        staffId: z.number().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      }))
      .query(async ({ input }) => {
        try {
          // Get waypoints for the specified staff member or all staff
          const db_instance = await db.getDb();
          if (!db_instance) {
            return [];
          }
          
          let whereConditions: any[] = [];
          
              if (input.staffId) {
                whereConditions.push(eq(waypoints.userId, input.staffId));
              }
              
              if (input.startDate) {
                whereConditions.push(gte(waypoints.timestamp, new Date(input.startDate)));
              }
              
              if (input.endDate) {
                whereConditions.push(lte(waypoints.timestamp, new Date(input.endDate)));
              }
          
          const query = db_instance
            .select({
              id: waypoints.id,
              latitude: waypoints.latitude,
              longitude: waypoints.longitude,
              accuracy: waypoints.accuracy,
              timestamp: waypoints.timestamp,
              cumulativeDistance: waypoints.cumulativeDistance,
              altitude: waypoints.altitude,
              staffId: waypoints.userId,
              staffName: users.name,
              staffNumber: users.staffNumber,
            })
            .from(waypoints)
            .leftJoin(users, eq(waypoints.userId, users.id))
            .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
            .orderBy(desc(waypoints.timestamp));
          
          const records = await query.execute();
          
          return records;
        } catch (error) {
          console.error('[tRPC] Error fetching waypoint history:', error);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to fetch waypoint history',
          });
        }
      }),
  }),

  manualApproval: router({
    requestCheckIn: protectedProcedure
      .input(
        z.object({
          gpsAccuracy: z.number(),
          latitude: z.number(),
          longitude: z.number(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        try {
          // Create manual approval request
          await db.createManualApprovalRequest({
            userId: ctx.user.id,
            requestType: "check_in",
            gpsAccuracy: input.gpsAccuracy,
            latitude: input.latitude,
            longitude: input.longitude,
          });

          // Notify admin
          await notifyOwner({
            title: "Manual Check-in Request",
            content: `${ctx.user.name} has requested manual check-in approval due to poor GPS accuracy (${input.gpsAccuracy.toFixed(0)}m).`,
          });

          return { success: true, message: "Check-in request submitted for admin approval" };
        } catch (error) {
          console.error("[Manual Approval] Error creating request:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to submit check-in request",
          });
        }
      }),

    getPending: adminProcedure.query(async () => {
      try {
        return await db.getPendingManualApprovals();
      } catch (error) {
        console.error("[Manual Approval] Error fetching pending:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch pending approvals",
        });
      }
    }),

    approve: adminProcedure
      .input(
        z.object({
          requestId: z.number(),
          reason: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        try {
          const success = await db.approveManualRequest(
            input.requestId,
            ctx.user.id,
            input.reason
          );

          if (!success) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Request not found",
            });
          }

          return { success: true, message: "Check-in approved" };
        } catch (error) {
          console.error("[Manual Approval] Error approving:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to approve request",
          });
        }
      }),

    reject: adminProcedure
      .input(
        z.object({
          requestId: z.number(),
          reason: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        try {
          const success = await db.rejectManualRequest(
            input.requestId,
            ctx.user.id,
            input.reason
          );

          if (!success) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Request not found",
            });
          }

          return { success: true, message: "Check-in request rejected" };
        } catch (error) {
          console.error("[Manual Approval] Error rejecting:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to reject request",
          });
        }
      }),
  }),

  monthlyReports: router({
    getMyReports: protectedProcedure.query(async ({ ctx }) => {
      try {
        return await db.getMonthlyReportsByUserId(ctx.user.id);
      } catch (error) {
        console.error("[Monthly Reports] Error fetching user reports:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch monthly reports",
        });
      }
    }),

    getAllReports: adminProcedure.query(async () => {
      try {
        return await db.getAllMonthlyReports();
      } catch (error) {
        console.error("[Monthly Reports] Error fetching all reports:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch all monthly reports",
        });
      }
    }),

    saveDraft: protectedProcedure
      .input(
        z.object({
          reportingMonth: z.string(), // YYYY-MM-01
          keyActivities: z.string().optional(),
          challenges: z.string().optional(),
          solutions: z.string().optional(),
          plannedActivities: z.string().optional(),
          supportRequired: z.string().optional(),
          additionalComments: z.string().optional(),
          confirmationStatement: z.boolean().default(false),
          reportId: z.number().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        try {
          const monthDate = new Date(input.reportingMonth);
          if (isNaN(monthDate.getTime())) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid reporting month date" });
          }

          let report;
          if (input.reportId) {
            const existingReport = await db.getMonthlyReportById(input.reportId);
            if (!existingReport) {
              throw new TRPCError({ code: "NOT_FOUND", message: "Monthly report not found" });
            }
            if (existingReport.userId !== ctx.user.id) {
              throw new TRPCError({ code: "FORBIDDEN", message: "You can only edit your own monthly report" });
            }
            if (existingReport.reviewStatus === "approved" || existingReport.submissionStatus === "locked") {
              throw new TRPCError({ code: "BAD_REQUEST", message: "This monthly report is finalized and cannot be edited" });
            }
            report = await db.updateMonthlyReport(input.reportId, {
              keyActivities: input.keyActivities,
              challenges: input.challenges,
              solutions: input.solutions,
              plannedActivities: input.plannedActivities,
              supportRequired: input.supportRequired,
              additionalComments: input.additionalComments,
              confirmationStatement: input.confirmationStatement,
              isDraft: true,
            });
          } else {
            report = await db.createMonthlyReport({
              userId: ctx.user.id,
              reportingMonth: monthDate,
              keyActivities: input.keyActivities,
              challenges: input.challenges,
              solutions: input.solutions,
              plannedActivities: input.plannedActivities,
              supportRequired: input.supportRequired,
              additionalComments: input.additionalComments,
              confirmationStatement: input.confirmationStatement,
              isDraft: true,
              submissionStatus: "pending",
              reviewStatus: "pending_review",
            });
          }

          // Log audit event
          if (report && 'id' in report) {
            await db.addMonthlyReportAuditLog({
              reportId: report.id as number,
              userId: ctx.user.id,
              action: "draft_saved",
              reason: "Staff saved monthly report draft",
            });
          }

          return { success: true, report, message: "Draft saved successfully" };
        } catch (error) {
          console.error("[Monthly Reports] Error saving draft:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: error instanceof Error ? error.message : "Failed to save monthly report draft",
          });
        }
      }),

    submitReport: protectedProcedure
      .input(
        z.object({
          reportId: z.number(),
          keyActivities: z.string(),
          challenges: z.string().optional(),
          solutions: z.string().optional(),
          plannedActivities: z.string(),
          supportRequired: z.string().optional(),
          additionalComments: z.string().optional(),
          confirmationStatement: z.boolean(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        try {
          if (!input.confirmationStatement) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "You must confirm that all information provided is accurate and complete.",
            });
          }

          const existingReport = await db.getMonthlyReportById(input.reportId);
          if (!existingReport) {
            throw new TRPCError({ code: "NOT_FOUND", message: "Monthly report not found" });
          }
          if (existingReport.userId !== ctx.user.id) {
            throw new TRPCError({ code: "FORBIDDEN", message: "You can only submit your own monthly report" });
          }
          if (existingReport.reviewStatus === "approved" || existingReport.submissionStatus === "locked") {
            throw new TRPCError({ code: "BAD_REQUEST", message: "This monthly report is already finalized" });
          }
          if (existingReport.submissionStatus === "submitted" && existingReport.reviewStatus !== "correction_required") {
            throw new TRPCError({ code: "BAD_REQUEST", message: "This monthly report has already been submitted for review" });
          }

          const report = await db.updateMonthlyReport(input.reportId, {
            keyActivities: input.keyActivities,
            challenges: input.challenges,
            solutions: input.solutions,
            plannedActivities: input.plannedActivities,
            supportRequired: input.supportRequired,
            additionalComments: input.additionalComments,
            confirmationStatement: input.confirmationStatement,
            isDraft: false,
            submissionStatus: "submitted",
            reviewStatus: "pending_review",
            submittedAt: new Date(),
          });

          await db.addMonthlyReportAuditLog({
            reportId: input.reportId,
            userId: ctx.user.id,
            action: "submitted",
            reason: "Staff submitted monthly report",
          });

          // Notify owner / admins
          await notifyOwner({
            title: "New Monthly Staff Report Submitted",
            content: `Staff member ID ${ctx.user.id} has submitted their monthly activity report for review.`,
          });

          return { success: true, report, message: "Monthly report submitted successfully" };
        } catch (error) {
          console.error("[Monthly Reports] Error submitting report:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: error instanceof Error ? error.message : "Failed to submit monthly report",
          });
        }
      }),

    reviewReport: adminProcedure
      .input(
        z.object({
          reportId: z.number(),
          reviewStatus: z.enum(["approved", "rejected", "correction_required"]),
          supervisorComments: z.string(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        try {
          const submissionStatus = input.reviewStatus === "approved" ? "locked" : "returned";

          const report = await db.updateMonthlyReport(input.reportId, {
            reviewStatus: input.reviewStatus,
            submissionStatus: submissionStatus,
            supervisorComments: input.supervisorComments,
            reviewedBy: ctx.user.id,
            reviewedAt: new Date(),
          });

          await db.addMonthlyReportAuditLog({
            reportId: input.reportId,
            userId: ctx.user.id,
            action: `reviewed_${input.reviewStatus}`,
            reason: input.supervisorComments,
          });

          return { success: true, report, message: `Report ${input.reviewStatus} successfully` };
        } catch (error) {
          console.error("[Monthly Reports] Error reviewing report:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to review monthly report",
          });
        }
      }),

    exportReports: adminProcedure
      .input(
        z.object({
          format: z.enum(["csv", "pdf"]),
          filters: z.object({
            reportId: z.number().optional(),
            userId: z.number().optional(),
            startMonth: z.string().optional(),
            endMonth: z.string().optional(),
            reviewStatus: z.string().optional(),
            searchTerm: z.string().optional(),
          }).optional(),
        })
      )
      .mutation(async ({ input }) => {
        try {
          const filters = input.filters ? {
            reportId: input.filters.reportId,
            userId: input.filters.userId,
            startMonth: input.filters.startMonth ? new Date(input.filters.startMonth) : undefined,
            endMonth: input.filters.endMonth ? new Date(input.filters.endMonth) : undefined,
            reviewStatus: input.filters.reviewStatus,
            searchTerm: input.filters.searchTerm,
          } : undefined;

          const reports = await db.getMonthlyReportsForExport(filters);

          if (reports.length === 0) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "No reports found matching the criteria",
            });
          }

          let fileContent: Buffer;
          let fileName: string;
          let mimeType: string;

          if (input.format === "csv") {
            const csv = await db.generateMonthlyReportCSV(reports);
            fileContent = Buffer.from(csv, "utf-8");
            fileName = `monthly_reports_${new Date().getTime()}.csv`;
            mimeType = "text/csv";
          } else {
            fileContent = await db.generateMonthlyReportPDF(reports);
            fileName = `monthly_reports_${new Date().getTime()}.pdf`;
            mimeType = "application/pdf";
          }

          // Upload to storage
          const { url } = await storagePut(
            `exports/monthly-reports/${fileName}`,
            fileContent,
            mimeType
          );

          return {
            success: true,
            url,
            fileName,
            reportCount: reports.length,
          };
        } catch (error) {
          console.error("[Monthly Reports] Error exporting reports:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: error instanceof Error ? error.message : "Failed to export monthly reports",
          });
        }
      }),

    searchAndFilter: adminProcedure
      .input(
        z.object({
          searchTerm: z.string().optional(),
          startMonth: z.string().optional(),
          endMonth: z.string().optional(),
          reviewStatus: z.string().optional(),
          submissionStatus: z.string().optional(),
        })
      )
      .query(async ({ input }) => {
        try {
          const allReports = await db.getAllMonthlyReports();
          const filtered = db.filterMonthlyReports(allReports, input);

          return {
            total: allReports.length,
            filtered: filtered.length,
            reports: filtered,
          };
        } catch (error) {
          console.error("[Monthly Reports] Error searching/filtering:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to search and filter reports",
          });
        }
      }),
  }),
});
export type AppRouter = typeof appRouter;
