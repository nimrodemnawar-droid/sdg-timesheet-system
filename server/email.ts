import { notifyOwner } from "./_core/notification";

interface EmailTemplate {
  subject: string;
  html: string;
}

/**
 * Generate leave approval email template
 */
export function generateLeaveApprovalEmail(
  staffName: string,
  leaveType: string,
  startDate: Date,
  endDate: Date,
  approvalReason: string
): EmailTemplate {
  const formatDate = (date: Date) =>
    new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

  return {
    subject: `Your ${leaveType} leave request has been approved`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #10b981;">Leave Request Approved</h2>
        <p>Dear ${staffName},</p>
        <p>Your ${leaveType} leave request has been <strong>approved</strong>.</p>
        
        <div style="background-color: #f0fdf4; border-left: 4px solid #10b981; padding: 16px; margin: 20px 0;">
          <p><strong>Leave Details:</strong></p>
          <ul style="margin: 10px 0; padding-left: 20px;">
            <li><strong>Type:</strong> ${leaveType}</li>
            <li><strong>Start Date:</strong> ${formatDate(startDate)}</li>
            <li><strong>End Date:</strong> ${formatDate(endDate)}</li>
            <li><strong>Approval Note:</strong> ${approvalReason}</li>
          </ul>
        </div>
        
        <p>Please ensure all your work is handed over before your leave period begins.</p>
        <p>If you have any questions, please contact your supervisor.</p>
        
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
        <p style="color: #6b7280; font-size: 12px;">SDG Timesheet System</p>
      </div>
    `,
  };
}

/**
 * Generate leave rejection email template
 */
export function generateLeaveRejectionEmail(
  staffName: string,
  leaveType: string,
  startDate: Date,
  endDate: Date,
  rejectionReason: string
): EmailTemplate {
  const formatDate = (date: Date) =>
    new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

  return {
    subject: `Your ${leaveType} leave request has been rejected`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #ef4444;">Leave Request Rejected</h2>
        <p>Dear ${staffName},</p>
        <p>Your ${leaveType} leave request has been <strong>rejected</strong>.</p>
        
        <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; margin: 20px 0;">
          <p><strong>Leave Details:</strong></p>
          <ul style="margin: 10px 0; padding-left: 20px;">
            <li><strong>Type:</strong> ${leaveType}</li>
            <li><strong>Requested Dates:</strong> ${formatDate(startDate)} to ${formatDate(endDate)}</li>
            <li><strong>Rejection Reason:</strong> ${rejectionReason}</li>
          </ul>
        </div>
        
        <p>Please contact your supervisor to discuss alternative dates or other leave options.</p>
        
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
        <p style="color: #6b7280; font-size: 12px;">SDG Timesheet System</p>
      </div>
    `,
  };
}

/**
 * Generate overtime alert email template for admins
 */
export function generateOvertimeAlertEmail(
  staffName: string,
  overtimeHours: number,
  workDate: Date
): EmailTemplate {
  const formatDate = (date: Date) =>
    new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

  return {
    subject: `Overtime Alert: ${staffName} worked ${overtimeHours}h overtime`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #f59e0b;">Overtime Alert</h2>
        <p>An employee has exceeded the standard 8-hour workday.</p>
        
        <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 16px; margin: 20px 0;">
          <p><strong>Overtime Details:</strong></p>
          <ul style="margin: 10px 0; padding-left: 20px;">
            <li><strong>Staff Member:</strong> ${staffName}</li>
            <li><strong>Work Date:</strong> ${formatDate(workDate)}</li>
            <li><strong>Overtime Hours:</strong> ${overtimeHours.toFixed(1)}h</li>
          </ul>
        </div>
        
        <p>Please review this overtime entry and ensure proper compensation is provided.</p>
        
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
        <p style="color: #6b7280; font-size: 12px;">SDG Timesheet System</p>
      </div>
    `,
  };
}

/**
 * Generate timesheet submission reminder email
 */
export function generateTimesheetReminderEmail(staffName: string): EmailTemplate {
  return {
    subject: "Reminder: Submit your daily timesheet",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #3b82f6;">Timesheet Submission Reminder</h2>
        <p>Dear ${staffName},</p>
        <p>This is a friendly reminder to <strong>submit your daily timesheet</strong> before end of day.</p>
        
        <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 16px; margin: 20px 0;">
          <p><strong>Action Required:</strong></p>
          <ul style="margin: 10px 0; padding-left: 20px;">
            <li>Log in to the SDG Timesheet System</li>
            <li>Review your check-in and check-out times</li>
            <li>Click "Submit Timesheet" to finalize your entry</li>
          </ul>
        </div>
        
        <p>Timesheets must be submitted daily to maintain accurate attendance records.</p>
        
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
        <p style="color: #6b7280; font-size: 12px;">SDG Timesheet System</p>
      </div>
    `,
  };
}

/**
 * Generate leave balance update email
 */
export function generateLeaveBalanceEmail(
  staffName: string,
  leaveType: string,
  allocatedDays: number,
  usedDays: number,
  remainingDays: number
): EmailTemplate {
  return {
    subject: `Your ${leaveType} leave balance has been updated`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #06b6d4;">Leave Balance Update</h2>
        <p>Dear ${staffName},</p>
        <p>Your ${leaveType} leave balance has been updated.</p>
        
        <div style="background-color: #ecfdf5; border-left: 4px solid #06b6d4; padding: 16px; margin: 20px 0;">
          <p><strong>Updated Balance:</strong></p>
          <ul style="margin: 10px 0; padding-left: 20px;">
            <li><strong>Leave Type:</strong> ${leaveType}</li>
            <li><strong>Allocated Days:</strong> ${allocatedDays}</li>
            <li><strong>Used Days:</strong> ${usedDays}</li>
            <li><strong>Remaining Days:</strong> <strong style="color: #059669;">${remainingDays}</strong></li>
          </ul>
        </div>
        
        <p>Plan your leave accordingly to make the best use of your allocated days.</p>
        
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
        <p style="color: #6b7280; font-size: 12px;">SDG Timesheet System</p>
      </div>
    `,
  };
}

/**
 * Send email notification via owner notification system
 * In production, integrate with SendGrid, AWS SES, or similar service
 */
export async function sendEmailNotification(
  recipientName: string,
  recipientEmail: string,
  template: EmailTemplate
): Promise<boolean> {
  try {
    // For now, use the built-in notification system to alert the owner
    // In production, replace with actual email service
    const result = await notifyOwner({
      title: template.subject,
      content: `Email to ${recipientName} (${recipientEmail}): ${template.subject}`,
    });

    return result;
  } catch (error) {
    console.error("[Email] Failed to send notification:", error);
    return false;
  }
}

/**
 * Send leave approval notification
 */
export async function sendLeaveApprovalNotification(
  staffName: string,
  staffEmail: string,
  leaveType: string,
  startDate: Date,
  endDate: Date,
  approvalReason: string
): Promise<boolean> {
  const template = generateLeaveApprovalEmail(
    staffName,
    leaveType,
    startDate,
    endDate,
    approvalReason
  );
  return sendEmailNotification(staffName, staffEmail, template);
}

/**
 * Send leave rejection notification
 */
export async function sendLeaveRejectionNotification(
  staffName: string,
  staffEmail: string,
  leaveType: string,
  startDate: Date,
  endDate: Date,
  rejectionReason: string
): Promise<boolean> {
  const template = generateLeaveRejectionEmail(
    staffName,
    leaveType,
    startDate,
    endDate,
    rejectionReason
  );
  return sendEmailNotification(staffName, staffEmail, template);
}

/**
 * Send overtime alert to admin
 */
export async function sendOvertimeAlert(
  staffName: string,
  staffEmail: string,
  overtimeHours: number,
  workDate: Date
): Promise<boolean> {
  const template = generateOvertimeAlertEmail(staffName, overtimeHours, workDate);
  return sendEmailNotification(staffName, staffEmail, template);
}

/**
 * Send timesheet reminder
 */
export async function sendTimesheetReminder(
  staffName: string,
  staffEmail: string
): Promise<boolean> {
  const template = generateTimesheetReminderEmail(staffName);
  return sendEmailNotification(staffName, staffEmail, template);
}

/**
 * Send leave balance update
 */
export async function sendLeaveBalanceUpdate(
  staffName: string,
  staffEmail: string,
  leaveType: string,
  allocatedDays: number,
  usedDays: number,
  remainingDays: number
): Promise<boolean> {
  const template = generateLeaveBalanceEmail(
    staffName,
    leaveType,
    allocatedDays,
    usedDays,
    remainingDays
  );
  return sendEmailNotification(staffName, staffEmail, template);
}
