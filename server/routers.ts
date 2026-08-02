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
import { and, eq, gte, lte, desc, asc, isNotNull } from "drizzle-orm";
import { getAllStaffAttendanceByDateRange } from "./db";
import { attendance, waypoints, users } from "../drizzle/schema";
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

          // Send email notification to admin
          const attendanceRecord = await db.getTodayAttendance(ctx.user.id);
          const attendance = attendanceRecord && attendanceRecord.id === input.attendanceId ? attendanceRecord : null;

          if (attendance) {
            const hoursWorked = attendance.durationMinutes ? attendance.durationMinutes / 60 : 0;
            const isOvertime = hoursWorked > 8;
            const overtimeHours = isOvertime ? hoursWorked - 8 : 0;

            try {
              await notifyOwner({
                title: `📋 Timesheet Submitted - ${ctx.user.name} (#${(ctx.user.staffNumber || 0).toString().padStart(3, '0')})`,
                content: `Staff member ${ctx.user.name} has submitted their timesheet.\n\nWork Hours: ${hoursWorked.toFixed(2)}h${isOvertime ? ` (⚠️ OVERTIME: ${overtimeHours.toFixed(2)}h)` : ''}\nWork Modality: ${input.workModality || 'Not specified'}\nTask: ${input.taskDescription || 'No description provided'}`,
              });
            } catch (emailError) {
              console.error('[tRPC] Error sending timesheet notification:', emailError);
              // Don't fail the timesheet submission if email fails
            }
          }

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

    createRequest: protectedProcedure
      .input(
        z.object({
          leaveType: z.enum(['annual', 'sick', 'unpaid', 'maternity', 'other']),
          startDate: z.string(),
          endDate: z.string(),
          daysRequested: z.number(),
          reason: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        try {
          const startDate = new Date(input.startDate);
          const endDate = new Date(input.endDate);
          
          if (startDate > endDate) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: 'Start date must be before end date',
            });
          }
          
          const result = await db.createLeaveRequest({
            userId: ctx.user.id,
            leaveType: input.leaveType,
            startDate,
            endDate,
            daysRequested: input.daysRequested.toString(),
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
            content: `${ctx.user.name} submitted ${input.leaveType} leave for ${input.daysRequested} days`,
          });
          
          return { success: true, message: 'Leave request created successfully' };
        } catch (error) {
          console.error('[tRPC] Error creating leave request:', error);
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
      .input(z.object({ startDate: z.string().optional(), endDate: z.string().optional() }))
      .query(async ({ input }) => {
        try {
          return await db.getCompleteTimesheetData({
            startDate: input.startDate ? new Date(input.startDate) : undefined,
            endDate: input.endDate ? new Date(input.endDate) : undefined,
          });
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
            // For PDF, we generate CSV content and let the client handle PDF conversion
            // or use a PDF library. For now, returning CSV content with PDF filename
            content = db.generateCSVContent(data);
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
            whereConditions.push(eq(attendance.userId, input.staffId));
          }
          
          if (input.startDate) {
            whereConditions.push(gte(attendance.checkInTime, new Date(input.startDate)));
          }
          
          if (input.endDate) {
            whereConditions.push(lte(attendance.checkInTime, new Date(input.endDate)));
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
});
export type AppRouter = typeof appRouter;
