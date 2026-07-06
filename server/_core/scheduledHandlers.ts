import type { Request, Response } from "express";
import { sdk } from "./sdk";
import * as db from "../db";
import { notifyOwner } from "./notification";

/**
 * Handler for daily timesheet summary report scheduled task
 * Runs daily at end of business day (6 PM EAT / 3 PM UTC)
 */
export async function dailyTimesheetReportHandler(req: Request, res: Response) {
  try {
    // Authenticate as cron caller
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron || !user.taskUid) {
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
