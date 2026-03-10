import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import {
  getAttendanceMetrics,
  getOvertimeLeaderboard,
  getAttendanceTrend,
  getDepartmentMetrics,
} from "./analytics";

export const analyticsRouter = router({
  metrics: protectedProcedure
    .input(
      z.object({
        startDate: z.date(),
        endDate: z.date(),
      })
    )
    .query(async ({ input }) => {
      return await getAttendanceMetrics(input.startDate, input.endDate);
    }),

  overtimeLeaderboard: protectedProcedure
    .input(
      z.object({
        startDate: z.date(),
        endDate: z.date(),
        limit: z.number().default(10),
      })
    )
    .query(async ({ input }) => {
      return await getOvertimeLeaderboard(input.startDate, input.endDate, input.limit);
    }),

  attendanceTrend: protectedProcedure
    .input(
      z.object({
        startDate: z.date(),
        endDate: z.date(),
      })
    )
    .query(async ({ input }) => {
      return await getAttendanceTrend(input.startDate, input.endDate);
    }),

  departmentMetrics: protectedProcedure
    .input(
      z.object({
        startDate: z.date(),
        endDate: z.date(),
      })
    )
    .query(async ({ input }) => {
      return await getDepartmentMetrics(input.startDate, input.endDate);
    }),
});
