import { getDb } from "./db";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { attendance, leaveRequests, users } from "../drizzle/schema";
import { encryptData } from "./encryption";

interface AttendanceRecord {
  staffName: string;
  email: string;
  date: string;
  checkInTime: string;
  checkOutTime: string;
  duration: string;
  distance: string;
  checkInLocation: string;
  checkOutLocation: string;
  accuracy: string;
  sdgGoal: string;
  workModality: string;
  status: string;
}

interface OvertimeRecord {
  staffName: string;
  email: string;
  date: string;
  hoursWorked: string;
  overtimeHours: string;
  rate: string;
  totalOvertimePay: string;
}

interface LeaveRecord {
  staffName: string;
  email: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  days: string;
  reason: string;
  status: string;
  approvedBy: string;
  approvalDate: string;
}

/**
 * Generate CSV content for attendance records
 */
export function generateAttendanceCSV(records: AttendanceRecord[]): string {
  const headers = [
    "Staff Name",
    "Email",
    "Date",
    "Check-In Time",
    "Check-Out Time",
    "Duration (hours)",
    "Distance (km)",
    "Check-In Location",
    "Check-Out Location",
    "GPS Accuracy",
    "SDG Goal",
    "Work Modality",
    "Status",
  ];

  const rows = records.map((record) => [
    escapeCSV(record.staffName),
    escapeCSV(record.email),
    record.date,
    record.checkInTime,
    record.checkOutTime,
    record.duration,
    record.distance,
    escapeCSV(record.checkInLocation),
    escapeCSV(record.checkOutLocation),
    record.accuracy,
    record.sdgGoal || "N/A",
    record.workModality || "N/A",
    record.status,
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map((row) => row.join(",")),
  ].join("\n");

  return csvContent;
}

/**
 * Generate CSV content for overtime records
 */
export function generateOvertimeCSV(records: OvertimeRecord[]): string {
  const headers = [
    "Staff Name",
    "Email",
    "Date",
    "Hours Worked",
    "Overtime Hours",
    "Overtime Rate",
    "Total Overtime Pay",
  ];

  const rows = records.map((record) => [
    escapeCSV(record.staffName),
    escapeCSV(record.email),
    record.date,
    record.hoursWorked,
    record.overtimeHours,
    record.rate,
    record.totalOvertimePay,
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map((row) => row.join(",")),
  ].join("\n");

  return csvContent;
}

/**
 * Generate CSV content for leave records
 */
export function generateLeaveCSV(records: LeaveRecord[]): string {
  const headers = [
    "Staff Name",
    "Email",
    "Leave Type",
    "Start Date",
    "End Date",
    "Days",
    "Reason",
    "Status",
    "Approved By",
    "Approval Date",
  ];

  const rows = records.map((record) => [
    escapeCSV(record.staffName),
    escapeCSV(record.email),
    record.leaveType,
    record.startDate,
    record.endDate,
    record.days,
    escapeCSV(record.reason),
    record.status,
    escapeCSV(record.approvedBy || "N/A"),
    record.approvalDate || "N/A",
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map((row) => row.join(",")),
  ].join("\n");

  return csvContent;
}

/**
 * Escape CSV values to handle commas and quotes
 */
function escapeCSV(value: string): string {
  if (!value) return '""';
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Generate PDF content for attendance report
 */
export function generateAttendancePDF(
  records: AttendanceRecord[],
  dateRange: { from: string; to: string }
): string {
  const title = "Attendance Report";
  const subtitle = `Period: ${dateRange.from} to ${dateRange.to}`;
  const generatedDate = new Date().toLocaleDateString();

  let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
        h1 { color: #1f2937; text-align: center; }
        .subtitle { text-align: center; color: #6b7280; margin-bottom: 20px; }
        .meta { text-align: right; color: #9ca3af; font-size: 12px; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th { background-color: #1f2937; color: white; padding: 12px; text-align: left; font-weight: bold; }
        td { padding: 10px; border-bottom: 1px solid #e5e7eb; }
        tr:nth-child(even) { background-color: #f9fafb; }
        .total-row { background-color: #f3f4f6; font-weight: bold; }
        .footer { margin-top: 30px; text-align: center; color: #9ca3af; font-size: 12px; }
      </style>
    </head>
    <body>
      <h1>${title}</h1>
      <div class="subtitle">${subtitle}</div>
      <div class="meta">Generated: ${generatedDate}</div>
      <table>
        <thead>
          <tr>
            <th>Staff Name</th>
            <th>Email</th>
            <th>Date</th>
            <th>Check-In</th>
            <th>Check-Out</th>
            <th>Duration</th>
            <th>Distance</th>
            <th>GPS Accuracy</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
  `;

  let totalHours = 0;
  let totalDistance = 0;

  records.forEach((record) => {
    const hours = parseFloat(record.duration) || 0;
    const distance = parseFloat(record.distance) || 0;
    totalHours += hours;
    totalDistance += distance;

    html += `
      <tr>
        <td>${record.staffName}</td>
        <td>${record.email}</td>
        <td>${record.date}</td>
        <td>${record.checkInTime}</td>
        <td>${record.checkOutTime}</td>
        <td>${record.duration}h</td>
        <td>${record.distance}km</td>
        <td>${record.accuracy}</td>
        <td>${record.status}</td>
      </tr>
    `;
  });

  html += `
        </tbody>
      </table>
      <table style="margin-top: 30px; width: 300px;">
        <tr class="total-row">
          <td>Total Hours Worked:</td>
          <td>${totalHours.toFixed(2)}h</td>
        </tr>
        <tr class="total-row">
          <td>Total Distance Covered:</td>
          <td>${totalDistance.toFixed(2)}km</td>
        </tr>
        <tr class="total-row">
          <td>Number of Records:</td>
          <td>${records.length}</td>
        </tr>
      </table>
      <div class="footer">
        <p>This is an automated report. For inquiries, contact your administrator.</p>
      </div>
    </body>
    </html>
  `;

  return html;
}

/**
 * Generate PDF content for overtime report
 */
export function generateOvertimePDF(
  records: OvertimeRecord[],
  dateRange: { from: string; to: string }
): string {
  const title = "Overtime Report";
  const subtitle = `Period: ${dateRange.from} to ${dateRange.to}`;
  const generatedDate = new Date().toLocaleDateString();

  let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
        h1 { color: #1f2937; text-align: center; }
        .subtitle { text-align: center; color: #6b7280; margin-bottom: 20px; }
        .meta { text-align: right; color: #9ca3af; font-size: 12px; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th { background-color: #1f2937; color: white; padding: 12px; text-align: left; font-weight: bold; }
        td { padding: 10px; border-bottom: 1px solid #e5e7eb; }
        tr:nth-child(even) { background-color: #f9fafb; }
        .total-row { background-color: #f3f4f6; font-weight: bold; }
        .footer { margin-top: 30px; text-align: center; color: #9ca3af; font-size: 12px; }
      </style>
    </head>
    <body>
      <h1>${title}</h1>
      <div class="subtitle">${subtitle}</div>
      <div class="meta">Generated: ${generatedDate}</div>
      <table>
        <thead>
          <tr>
            <th>Staff Name</th>
            <th>Email</th>
            <th>Date</th>
            <th>Hours Worked</th>
            <th>Overtime Hours</th>
            <th>Rate</th>
            <th>Total Pay</th>
          </tr>
        </thead>
        <tbody>
  `;

  let totalOvertimeHours = 0;
  let totalOvertimePay = 0;

  records.forEach((record) => {
    const hours = parseFloat(record.overtimeHours) || 0;
    const pay = parseFloat(record.totalOvertimePay) || 0;
    totalOvertimeHours += hours;
    totalOvertimePay += pay;

    html += `
      <tr>
        <td>${record.staffName}</td>
        <td>${record.email}</td>
        <td>${record.date}</td>
        <td>${record.hoursWorked}h</td>
        <td>${record.overtimeHours}h</td>
        <td>${record.rate}</td>
        <td>$${record.totalOvertimePay}</td>
      </tr>
    `;
  });

  html += `
        </tbody>
      </table>
      <table style="margin-top: 30px; width: 300px;">
        <tr class="total-row">
          <td>Total Overtime Hours:</td>
          <td>${totalOvertimeHours.toFixed(2)}h</td>
        </tr>
        <tr class="total-row">
          <td>Total Overtime Pay:</td>
          <td>$${totalOvertimePay.toFixed(2)}</td>
        </tr>
        <tr class="total-row">
          <td>Number of Records:</td>
          <td>${records.length}</td>
        </tr>
      </table>
      <div class="footer">
        <p>This is an automated report. For inquiries, contact your administrator.</p>
      </div>
    </body>
    </html>
  `;

  return html;
}

/**
 * Generate PDF content for leave report
 */
export function generateLeavePDF(
  records: LeaveRecord[],
  dateRange: { from: string; to: string }
): string {
  const title = "Leave Report";
  const subtitle = `Period: ${dateRange.from} to ${dateRange.to}`;
  const generatedDate = new Date().toLocaleDateString();

  let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
        h1 { color: #1f2937; text-align: center; }
        .subtitle { text-align: center; color: #6b7280; margin-bottom: 20px; }
        .meta { text-align: right; color: #9ca3af; font-size: 12px; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th { background-color: #1f2937; color: white; padding: 12px; text-align: left; font-weight: bold; }
        td { padding: 10px; border-bottom: 1px solid #e5e7eb; }
        tr:nth-child(even) { background-color: #f9fafb; }
        .total-row { background-color: #f3f4f6; font-weight: bold; }
        .status-approved { color: #10b981; }
        .status-pending { color: #f59e0b; }
        .status-rejected { color: #ef4444; }
        .footer { margin-top: 30px; text-align: center; color: #9ca3af; font-size: 12px; }
      </style>
    </head>
    <body>
      <h1>${title}</h1>
      <div class="subtitle">${subtitle}</div>
      <div class="meta">Generated: ${generatedDate}</div>
      <table>
        <thead>
          <tr>
            <th>Staff Name</th>
            <th>Leave Type</th>
            <th>Start Date</th>
            <th>End Date</th>
            <th>Days</th>
            <th>Status</th>
            <th>Approved By</th>
          </tr>
        </thead>
        <tbody>
  `;

  let totalDays = 0;
  const statusCounts: Record<string, number> = {};

  records.forEach((record) => {
    const days = parseFloat(record.days) || 0;
    totalDays += days;
    statusCounts[record.status] = (statusCounts[record.status] || 0) + 1;

    const statusClass =
      record.status === "approved"
        ? "status-approved"
        : record.status === "pending"
          ? "status-pending"
          : "status-rejected";

    html += `
      <tr>
        <td>${record.staffName}</td>
        <td>${record.leaveType}</td>
        <td>${record.startDate}</td>
        <td>${record.endDate}</td>
        <td>${record.days}</td>
        <td><span class="${statusClass}">${record.status.toUpperCase()}</span></td>
        <td>${record.approvedBy || "N/A"}</td>
      </tr>
    `;
  });

  html += `
        </tbody>
      </table>
      <table style="margin-top: 30px; width: 400px;">
        <tr class="total-row">
          <td>Total Leave Days:</td>
          <td>${totalDays.toFixed(1)}</td>
        </tr>
        <tr class="total-row">
          <td>Approved Requests:</td>
          <td>${statusCounts["approved"] || 0}</td>
        </tr>
        <tr class="total-row">
          <td>Pending Requests:</td>
          <td>${statusCounts["pending"] || 0}</td>
        </tr>
        <tr class="total-row">
          <td>Rejected Requests:</td>
          <td>${statusCounts["rejected"] || 0}</td>
        </tr>
      </table>
      <div class="footer">
        <p>This is an automated report. For inquiries, contact your administrator.</p>
      </div>
    </body>
    </html>
  `;

  return html;
}
