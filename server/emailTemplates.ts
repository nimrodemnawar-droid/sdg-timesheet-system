/**
 * Email templates for timesheet notifications
 */

export interface TimesheetEmailData {
  staffName: string;
  staffNumber: string;
  submissionDate: string;
  amStartTime: string;
  amEndTime: string;
  pmStartTime: string;
  pmEndTime: string;
  workModality: string;
  activityCategory: string;
  taskDescription: string;
  hoursWorked: number;
  isOvertime: boolean;
  overtimeHours?: number;
}

export function generateTimesheetEmailHTML(data: TimesheetEmailData): string {
  const overtimeSection = data.isOvertime
    ? `
      <tr style="background-color: #fff3cd; border: 1px solid #ffc107;">
        <td style="padding: 12px; font-weight: bold; color: #856404;">⚠️ OVERTIME ALERT</td>
        <td style="padding: 12px; color: #856404;">${data.overtimeHours?.toFixed(2)} hours</td>
      </tr>
    `
    : '';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
          background-color: #f5f5f5;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          background-color: #ffffff;
          padding: 20px;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 20px;
          border-radius: 8px 8px 0 0;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 24px;
        }
        .content {
          padding: 20px 0;
        }
        .section {
          margin-bottom: 20px;
        }
        .section-title {
          font-size: 16px;
          font-weight: bold;
          color: #667eea;
          margin-bottom: 10px;
          border-bottom: 2px solid #667eea;
          padding-bottom: 8px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 15px;
        }
        td {
          padding: 10px;
          border: 1px solid #ddd;
        }
        td:first-child {
          font-weight: bold;
          background-color: #f8f9fa;
          width: 40%;
        }
        .hours-worked {
          background-color: #d4edda;
          border: 1px solid #c3e6cb;
          font-size: 18px;
          font-weight: bold;
          color: #155724;
          text-align: center;
          padding: 15px;
          border-radius: 4px;
        }
        .footer {
          background-color: #f8f9fa;
          padding: 15px;
          text-align: center;
          font-size: 12px;
          color: #666;
          border-top: 1px solid #ddd;
          margin-top: 20px;
        }
        .badge {
          display: inline-block;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: bold;
        }
        .badge-office {
          background-color: #e3f2fd;
          color: #1976d2;
        }
        .badge-field {
          background-color: #f3e5f5;
          color: #7b1fa2;
        }
        .badge-remote {
          background-color: #e8f5e9;
          color: #388e3c;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📋 Timesheet Submission Notification</h1>
          <p style="margin: 5px 0;">Africa for SDGs Timesheet System</p>
        </div>

        <div class="content">
          <!-- Staff Information -->
          <div class="section">
            <div class="section-title">Staff Information</div>
            <table>
              <tr>
                <td>Staff Name</td>
                <td>${data.staffName}</td>
              </tr>
              <tr>
                <td>Staff Number</td>
                <td>#${data.staffNumber}</td>
              </tr>
              <tr>
                <td>Submission Date</td>
                <td>${data.submissionDate}</td>
              </tr>
            </table>
          </div>

          <!-- Work Hours -->
          <div class="section">
            <div class="section-title">Work Hours</div>
            <table>
              <tr>
                <td>AM Start Time</td>
                <td>${data.amStartTime}</td>
              </tr>
              <tr>
                <td>AM End Time</td>
                <td>${data.amEndTime}</td>
              </tr>
              <tr>
                <td>PM Start Time</td>
                <td>${data.pmStartTime}</td>
              </tr>
              <tr>
                <td>PM End Time</td>
                <td>${data.pmEndTime}</td>
              </tr>
              ${overtimeSection}
            </table>
            <div class="hours-worked">
              Total Hours Worked: ${data.hoursWorked.toFixed(2)} hours
            </div>
          </div>

          <!-- Work Details -->
          <div class="section">
            <div class="section-title">Work Details</div>
            <table>
              <tr>
                <td>Work Modality</td>
                <td>
                  <span class="badge ${
                    data.workModality === 'office'
                      ? 'badge-office'
                      : data.workModality === 'field'
                        ? 'badge-field'
                        : 'badge-remote'
                  }">
                    ${data.workModality.toUpperCase()}
                  </span>
                </td>
              </tr>
              <tr>
                <td>Activity Category</td>
                <td>${data.activityCategory}</td>
              </tr>
              <tr>
                <td>Task Description</td>
                <td>${data.taskDescription}</td>
              </tr>
            </table>
          </div>

          <!-- Call to Action -->
          <div class="section" style="text-align: center; background-color: #f0f4ff; padding: 15px; border-radius: 4px;">
            <p style="margin: 0;">
              <strong>Review this timesheet in your Admin Dashboard</strong><br>
              <a href="https://sdgtimesheet-y6qxkr6m.manus.space/admin" style="color: #667eea; text-decoration: none; font-weight: bold;">
                Open Admin Dashboard →
              </a>
            </p>
          </div>
        </div>

        <div class="footer">
          <p>This is an automated notification from the Africa for SDGs Timesheet System.</p>
          <p>Please do not reply to this email. For support, contact your system administrator.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export function generateTimesheetEmailPlainText(data: TimesheetEmailData): string {
  return `
TIMESHEET SUBMISSION NOTIFICATION
==================================

STAFF INFORMATION
-----------------
Staff Name: ${data.staffName}
Staff Number: #${data.staffNumber}
Submission Date: ${data.submissionDate}

WORK HOURS
----------
AM Start Time: ${data.amStartTime}
AM End Time: ${data.amEndTime}
PM Start Time: ${data.pmStartTime}
PM End Time: ${data.pmEndTime}
Total Hours Worked: ${data.hoursWorked.toFixed(2)} hours
${data.isOvertime ? `OVERTIME ALERT: ${data.overtimeHours?.toFixed(2)} hours\n` : ''}

WORK DETAILS
-----------
Work Modality: ${data.workModality.toUpperCase()}
Activity Category: ${data.activityCategory}
Task Description: ${data.taskDescription}

---
This is an automated notification from the Africa for SDGs Timesheet System.
Please do not reply to this email.
  `.trim();
}
