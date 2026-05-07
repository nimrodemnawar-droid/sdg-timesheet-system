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

  attendance: router({
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

        const result = await db.checkIn(ctx.user.id, {
          latitude: input.latitude,
          longitude: input.longitude,
          accuracy: input.accuracy,
          timestamp: new Date(input.timestamp),
          encryptedLocation: encrypted,
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
        const encrypted = encryptData(
          JSON.stringify({
            latitude: input.latitude,
            longitude: input.longitude,
            accuracy: input.accuracy,
          })
        );

        const result = await db.checkOut(ctx.user.id, {
          latitude: input.latitude,
          longitude: input.longitude,
          accuracy: input.accuracy,
          timestamp: new Date(input.timestamp),
          encryptedLocation: encrypted,
        });

        return result;
      }),

    getToday: protectedProcedure.query(async ({ ctx }) => {
      return db.getTodayAttendance(ctx.user.id);
    }),

    getTodayAllStaff: adminProcedure.query(async () => {
      return db.getAllStaffCheckedInToday();
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
        // TODO: Implement getAdminAttendanceReports or use getAllStaffCheckedInToday
        return [];
      }),


    submitTimesheet: protectedProcedure
      .input(
        z.object({
          attendanceId: z.number(),
          amStartTime: z.string().optional(),
          amEndTime: z.string().optional(),
          pmStartTime: z.string().optional(),
          pmEndTime: z.string().optional(),
          workModality: z.enum(["nairobi_office", "homa_bay_office", "field", "remote"]).optional(),
          activityCategoryId: z.number().optional(),
          sdgGoalId: z.number().optional(),
          kpiId: z.number().optional(),
          program: z.string().optional(),
          taskDescription: z.string().optional(),
          staffRemarks: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        try {
          await db.updateAttendanceWithTimesheetData(input.attendanceId, {
            amStartTime: input.amStartTime,
            amEndTime: input.amEndTime,
            pmStartTime: input.pmStartTime,
            pmEndTime: input.pmEndTime,
            workModality: input.workModality,
            activityCategoryId: input.activityCategoryId,
            sdgGoalId: input.sdgGoalId,
            kpiId: input.kpiId,
            program: input.program,
            taskDescription: input.taskDescription,
            staffRemarks: input.staffRemarks,
          });

          await db.submitTimesheet(input.attendanceId);

          await logAuditEvent({
            userId: ctx.user.id,
            action: "TIMESHEET_SUBMITTED",
            entityType: "ATTENDANCE",
            entityId: input.attendanceId,
            details: { attendanceId: input.attendanceId },
          });

          return { success: true, message: "Timesheet submitted successfully" };
        } catch (error) {
          console.error("[tRPC] Error submitting timesheet:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to submit timesheet",
          });
        }
      }),

    getCompleteTimesheetData: adminProcedure
      .input(z.object({ startDate: z.string().optional(), endDate: z.string().optional() }))
      .query(async ({ input }) => {
        try {
          const data = await db.getCompleteTimesheetData({
            startDate: input.startDate ? new Date(input.startDate) : undefined,
            endDate: input.endDate ? new Date(input.endDate) : undefined,
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
            annual: 0,
            sick: 0,
            casual: 0,
            maternity: 0,
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
          users.map(async (user) => ({
            userId: user.id,
            userName: user.name,
            annual: await db.getLeaveBalance(user.id, 'annual', currentYear),
            sick: await db.getLeaveBalance(user.id, 'sick', currentYear),
            maternity: await db.getLeaveBalance(user.id, 'maternity', currentYear),
            unpaid: await db.getLeaveBalance(user.id, 'unpaid', currentYear),
          }))
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
    getComplete: adminProcedure.query(async () => {
      try {
        return await db.getCompleteTimesheetData();
      } catch (error) {
        console.error('[tRPC] Error fetching complete timesheet data:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch timesheet data',
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
          const data = await db.getCompleteTimesheetData();
          
          const transformedData = data.map((item: any) => ({
            ...item,
            overtimeHours: 0,
            location: item.checkInAddress || '',
            remarks: '',
          }));
          
          if (format === 'excel') {
            const content = await generateExcelContent(transformedData);
            return { success: true, content, filename: `timesheets_${new Date().toISOString()}.xlsx` };
          } else if (format === 'pdf') {
            const content = generateCSVContent(transformedData);
            return { success: true, content, filename: `timesheets_${new Date().toISOString()}.pdf` };
          } else {
            const content = generateCSVContent(transformedData);
            return { success: true, content, filename: `timesheets_${new Date().toISOString()}.csv` };
          }
        } catch (error) {
          console.error('[tRPC] Error exporting timesheets:', error);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to export timesheets',
          });
        }
      }),
  }),
});
export type AppRouter = typeof appRouter;
