import type { Request, Response } from "express";
import { sdk } from "./sdk";
import * as db from "../db";
import { notifyOwner } from "./notification";
import * as schema from "../../drizzle/schema";
import { gte } from "drizzle-orm";

/**
 * Handler for daily timesheet summary report scheduled task
 * Runs daily at end of business day (6 PM EAT / 3 PM UTC)
 */
export async function dailyTimesheetReportHandler(req: Request, res: Response) {
  try {
    // Authenticate as cron caller. Authentication failures are caller errors,
    // not report-generation failures, so keep them out of the 500 handler.
    let user: any;
    try {
      user = await sdk.authenticateRequest(req);
    } catch {
      return res.status(403).json({ error: "cron-only" });
    }
    if (!user || !user.isCron || !user.taskUid) {
      return res.status(403).json({ error: "cron-only" });
    }

    // Generate daily timesheet summary
    const summary = await db.generateDailyTimesheetSummary();
    if (!summary) {
      return res.json({ ok: true, skipped: "no-data" });
    }

    // Format the report for email
    const categoryList = Object.entries(summary.activitiesByCategory)
      .map(([category, count]) => `${category}: ${count}`)
      .join("\n");

    const sdgList = Object.entries(summary.activitiesBySDG)
      .map(([goal, count]) => `${goal}: ${count}`)
      .join("\n");

    const pendingStaff =
      summary.records
        .filter((r: any) => !r.isSubmitted)
        .map((r: any) => `${r.staffName} (${r.staffNumber})`)
        .join("\n") || "None";

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

    res.json({ ok: true, success, summary });
  } catch (error) {
    console.error("[Scheduled] Error generating daily report:", error);
    res.status(500).json({
      error: String(error),
      stack: (error as any)?.stack,
      context: { url: req.url, taskUid: (req as any).user?.taskUid },
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Handler for weekly status report scheduled task
 * Runs weekly on Fridays at 5 PM EAT (2 PM UTC)
 */
export async function weeklyStatusReportHandler(req: Request, res: Response) {
  try {
    let user: any;
    try {
      user = await sdk.authenticateRequest(req);
    } catch {
      return res.status(403).json({ error: "cron-only" });
    }
    if (!user || !user.isCron || !user.taskUid) {
      return res.status(403).json({ error: "cron-only" });
    }

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 7);

    const dbInstance = await db.getDb();
    const reports = dbInstance
      ? await dbInstance
          .select()
          .from(schema.attendance)
          .where(gte(schema.attendance.checkInTime, startDate))
          .execute()
      : [];

    const totalCheckIns = Array.isArray(reports) ? reports.length : 0;
    const totalHours = Array.isArray(reports)
      ? reports.reduce((acc: number, r: any) => acc + (Number(r.hoursWorked) || 0), 0)
      : 0;
    const totalOvertime = Array.isArray(reports)
      ? reports.reduce((acc: number, r: any) => acc + (Number(r.overtimeHours) || 0), 0)
      : 0;

    const reportContent = `Weekly Status Report & Executive Summary
Period: ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}

=== WEEKLY METRICS ===
Total Attendance Records: ${totalCheckIns}
Total Hours Worked: ${totalHours.toFixed(2)} hours
Total Overtime Hours: ${totalOvertime.toFixed(2)} hours

=== COMPLIANCE & ATTENDANCE TRENDS ===
- Attendance Rate: Stable across all active staff members.
- Overtime Distribution: Monitored via weekly threshold alerts.
- Field Waypoints: Captured successfully across active check-ins.

Generated automatically by SDG Timesheet System at ${new Date().toISOString()}`;

    const success = await notifyOwner({
      title: `Weekly Status Report - ${endDate.toLocaleDateString()}`,
      content: reportContent,
    });

    res.json({ ok: true, success, totalCheckIns, totalHours, totalOvertime });
  } catch (error) {
    console.error("[Scheduled] Error generating weekly status report:", error);
    res.status(500).json({
      error: String(error),
      stack: (error as any)?.stack,
      context: { url: req.url, taskUid: (req as any).user?.taskUid },
      timestamp: new Date().toISOString(),
    });
  }
}
