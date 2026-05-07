/**
 * Report Export Utility
 * Provides functions to generate and download CSV and PDF reports
 */

export interface AttendanceRecord {
  staffId: number;
  name: string;
  date: string;
  checkInTime: string;
  checkOutTime: string;
  status: string;
  distance?: number;
  hoursWorked?: string | number;
  workModality?: string;
  checkInLat?: string;
  checkInLng?: string;
  checkOutLat?: string;
  checkOutLng?: string;
  checkInAccuracy?: string;
  checkOutAccuracy?: string;
}

export interface LeaveRecord {
  staffId: number;
  name: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  days: number;
  status: string;
}

export interface OvertimeRecord {
  staffId: number;
  name: string;
  date: string;
  overtimeHours: number;
  reason: string;
}

export interface GPSActivityRecord {
  staffId: number;
  name: string;
  date: string;
  checkInLocation: string;
  checkOutLocation: string;
  totalDistance: number;
  waypointCount: number;
  checkInLat?: string;
  checkInLng?: string;
  checkOutLat?: string;
  checkOutLng?: string;
  checkInAccuracy?: string;
  checkOutAccuracy?: string;
}

/**
 * Generate CSV content from data array
 */
export function generateCSV(headers: string[], rows: (string | number)[][]): string {
  const csvContent = [
    headers.map(h => `"${h}"`).join(","),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
  ].join("\n");
  
  return csvContent;
}

/**
 * Download CSV file
 */
export function downloadCSV(filename: string, content: string): void {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Generate Attendance Report CSV
 */
export function generateAttendanceReportCSV(records: AttendanceRecord[]): void {
  const headers = [
    "Staff ID", 
    "Name", 
    "Date", 
    "Check-In Time", 
    "Check-Out Time", 
    "Hours Worked",
    "Status", 
    "Work Modality",
    "Check-In Lat",
    "Check-In Lng",
    "Check-In Accuracy",
    "Check-Out Lat",
    "Check-Out Lng",
    "Check-Out Accuracy",
    "Distance (km)"
  ];
  const rows = records.map(r => [
    r.staffId,
    r.name,
    r.date,
    r.checkInTime,
    r.checkOutTime,
    r.hoursWorked || 0,
    r.status,
    r.workModality ? r.workModality.replace(/_/g, ' ').toUpperCase() : 'N/A',
    r.checkInLat || 'N/A',
    r.checkInLng || 'N/A',
    r.checkInAccuracy || 'N/A',
    r.checkOutLat || 'N/A',
    r.checkOutLng || 'N/A',
    r.checkOutAccuracy || 'N/A',
    r.distance || 0
  ]);
  
  const csv = generateCSV(headers, rows);
  downloadCSV(`attendance-report-${new Date().toISOString().split('T')[0]}.csv`, csv);
}

/**
 * Generate Leave Report CSV
 */
export function generateLeaveReportCSV(records: LeaveRecord[]): void {
  const headers = ["Staff ID", "Name", "Leave Type", "Start Date", "End Date", "Days", "Status"];
  const rows = records.map(r => [
    r.staffId,
    r.name,
    r.leaveType,
    r.startDate,
    r.endDate,
    r.days,
    r.status
  ]);
  
  const csv = generateCSV(headers, rows);
  downloadCSV(`leave-report-${new Date().toISOString().split('T')[0]}.csv`, csv);
}

/**
 * Generate Overtime Report CSV
 */
export function generateOvertimeReportCSV(records: OvertimeRecord[]): void {
  const headers = ["Staff ID", "Name", "Date", "Overtime Hours", "Reason"];
  const rows = records.map(r => [
    r.staffId,
    r.name,
    r.date,
    r.overtimeHours,
    r.reason
  ]);
  
  const csv = generateCSV(headers, rows);
  downloadCSV(`overtime-report-${new Date().toISOString().split('T')[0]}.csv`, csv);
}

/**
 * Generate GPS Activity Report CSV
 */
export function generateGPSActivityReportCSV(records: GPSActivityRecord[]): void {
  const headers = [
    "Staff ID", 
    "Name", 
    "Date", 
    "Check-In Location", 
    "Check-Out Location", 
    "Check-In Lat",
    "Check-In Lng",
    "Check-In Accuracy",
    "Check-Out Lat",
    "Check-Out Lng",
    "Check-Out Accuracy",
    "Total Distance (km)", 
    "Waypoints"
  ];
  const rows = records.map(r => [
    r.staffId,
    r.name,
    r.date,
    r.checkInLocation,
    r.checkOutLocation,
    r.checkInLat || 'N/A',
    r.checkInLng || 'N/A',
    r.checkInAccuracy || 'N/A',
    r.checkOutLat || 'N/A',
    r.checkOutLng || 'N/A',
    r.checkOutAccuracy || 'N/A',
    r.totalDistance,
    r.waypointCount
  ]);
  
  const csv = generateCSV(headers, rows);
  downloadCSV(`gps-activity-report-${new Date().toISOString().split('T')[0]}.csv`, csv);
}

/**
 * Generate Summary Report CSV
 */
export function generateSummaryReportCSV(summary: Record<string, any>): void {
  const headers = ["Metric", "Value"];
  const rows = Object.entries(summary).map(([key, value]) => [
    key.replace(/([A-Z])/g, ' $1').trim(),
    value
  ]);
  
  const csv = generateCSV(headers, rows);
  downloadCSV(`summary-report-${new Date().toISOString().split('T')[0]}.csv`, csv);
}
