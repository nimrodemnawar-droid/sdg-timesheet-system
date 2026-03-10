import { protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import * as db from "./db";
import * as exportService from "./exportService";
import { storagePut } from "./storage";
import { encryptData } from "./encryption";

// Helper to ensure admin role
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
  return next({ ctx });
});

export const exportRouter = router({
  // Export attendance as CSV
  attendanceCSV: adminProcedure
    .input(
      z.object({
        startDate: z.string(),
        endDate: z.string(),
        staffId: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        // Fetch attendance records (this would use db helper)
        const records: any[] = [];

        // Generate CSV
        const csvContent = exportService.generateAttendanceCSV(records);

        // Encrypt and upload to S3
        const fileName = `attendance-${new Date().getTime()}.csv`;
        const encrypted = encryptData(csvContent);
        const encryptedString = JSON.stringify(encrypted);
        const { url } = await storagePut(
          `reports/${fileName}`,
          encryptedString,
          "text/csv"
        );

        return {
          success: true,
          url,
          fileName,
          format: "csv",
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to generate attendance CSV",
        });
      }
    }),

  // Export attendance as PDF
  attendancePDF: adminProcedure
    .input(
      z.object({
        startDate: z.string(),
        endDate: z.string(),
        staffId: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        // Fetch attendance records
        const records: any[] = [];

        // Generate PDF HTML
        const htmlContent = exportService.generateAttendancePDF(records, {
          from: input.startDate,
          to: input.endDate,
        });

        // Encrypt and upload to S3
        const fileName = `attendance-${new Date().getTime()}.html`;
        const encrypted = encryptData(htmlContent);
        const encryptedString = JSON.stringify(encrypted);
        const { url } = await storagePut(
          `reports/${fileName}`,
          encryptedString,
          "text/html"
        );

        return {
          success: true,
          url,
          fileName,
          format: "pdf",
          htmlContent, // Return HTML for client-side PDF generation
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to generate attendance PDF",
        });
      }
    }),

  // Export overtime as CSV
  overtimeCSV: adminProcedure
    .input(
      z.object({
        startDate: z.string(),
        endDate: z.string(),
        staffId: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        // Fetch overtime records
        const records: any[] = [];

        // Generate CSV
        const csvContent = exportService.generateOvertimeCSV(records);

        // Encrypt and upload to S3
        const fileName = `overtime-${new Date().getTime()}.csv`;
        const encrypted = encryptData(csvContent);
        const encryptedString = JSON.stringify(encrypted);
        const { url } = await storagePut(
          `reports/${fileName}`,
          encryptedString,
          "text/csv"
        );

        return {
          success: true,
          url,
          fileName,
          format: "csv",
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to generate overtime CSV",
        });
      }
    }),

  // Export overtime as PDF
  overtimePDF: adminProcedure
    .input(
      z.object({
        startDate: z.string(),
        endDate: z.string(),
        staffId: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        // Fetch overtime records
        const records: any[] = [];

        // Generate PDF HTML
        const htmlContent = exportService.generateOvertimePDF(records, {
          from: input.startDate,
          to: input.endDate,
        });

        // Encrypt and upload to S3
        const fileName = `overtime-${new Date().getTime()}.html`;
        const encrypted = encryptData(htmlContent);
        const encryptedString = JSON.stringify(encrypted);
        const { url } = await storagePut(
          `reports/${fileName}`,
          encryptedString,
          "text/html"
        );

        return {
          success: true,
          url,
          fileName,
          format: "pdf",
          htmlContent,
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to generate overtime PDF",
        });
      }
    }),

  // Export leave as CSV
  leaveCSV: adminProcedure
    .input(
      z.object({
        startDate: z.string(),
        endDate: z.string(),
        staffId: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        // Fetch leave records
        const records: any[] = [];

        // Generate CSV
        const csvContent = exportService.generateLeaveCSV(records);

        // Encrypt and upload to S3
        const fileName = `leave-${new Date().getTime()}.csv`;
        const encrypted = encryptData(csvContent);
        const encryptedString = JSON.stringify(encrypted);
        const { url } = await storagePut(
          `reports/${fileName}`,
          encryptedString,
          "text/csv"
        );

        return {
          success: true,
          url,
          fileName,
          format: "csv",
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to generate leave CSV",
        });
      }
    }),

  // Export leave as PDF
  leavePDF: adminProcedure
    .input(
      z.object({
        startDate: z.string(),
        endDate: z.string(),
        staffId: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        // Fetch leave records
        const records: any[] = [];

        // Generate PDF HTML
        const htmlContent = exportService.generateLeavePDF(records, {
          from: input.startDate,
          to: input.endDate,
        });

        // Encrypt and upload to S3
        const fileName = `leave-${new Date().getTime()}.html`;
        const encrypted = encryptData(htmlContent);
        const encryptedString = JSON.stringify(encrypted);
        const { url } = await storagePut(
          `reports/${fileName}`,
          encryptedString,
          "text/html"
        );

        return {
          success: true,
          url,
          fileName,
          format: "pdf",
          htmlContent,
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to generate leave PDF",
        });
      }
    }),
});
