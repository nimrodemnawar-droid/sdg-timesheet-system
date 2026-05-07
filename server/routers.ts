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
      ctx.res.clearCookie("app_session_id", getSessionCookieOptions());
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
        return db.getAttendanceByDateRange(ctx.user.id, new Date(input.startDate), new Date(input.endDate));
      }),

    getAdminReports: adminProcedure
      .input(
        z.object({
          startDate: z.string(),
          endDate: z.string(),
        })
      )
      .query(async ({ input }) => {
        return db.getAdminAttendanceReports(new Date(input.startDate), new Date(input.endDate));
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
            amStartTime: input.amStartTime ? new Date(input.amStartTime) : undefined,
            amEndTime: input.amEndTime ? new Date(input.amEndTime) : undefined,
            pmStartTime: input.pmStartTime ? new Date(input.pmStartTime) : undefined,
            pmEndTime: input.pmEndTime ? new Date(input.pmEndTime) : undefined,
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
            details: `Submitted timesheet for attendance ID ${input.attendanceId}`,
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
  }),
});

export type AppRouter = typeof appRouter;
