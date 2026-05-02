# Report Scheduling Setup Guide

## Overview

The SDG Timesheet System includes automated report generation and email delivery functionality. Admins can configure schedules to automatically generate and email reports (Attendance, Overtime, Leave, GPS Activity) at specified times.

## Features

✅ **Daily & Weekly Schedules** - Configure reports to run daily or on specific days of the week
✅ **Multiple Report Types** - Generate Attendance, Overtime, Leave, or GPS Activity reports
✅ **Email Distribution** - Send reports to multiple email addresses automatically
✅ **Timezone Support** - Configure schedules in different timezones
✅ **Delivery Tracking** - View history of sent reports and delivery status
✅ **Active/Inactive Toggle** - Enable/disable schedules without deleting them

## How to Use

### 1. Access Report Scheduling

1. Log in as an admin
2. Go to **Admin Dashboard**
3. Click the **Report Scheduling** tab

### 2. Create a New Schedule

1. Click **New Schedule** button
2. Fill in the form:
   - **Report Type**: Choose which report to generate (Attendance, Overtime, Leave, GPS Activity, or All)
   - **Frequency**: Select Daily or Weekly
   - **Day of Week** (if Weekly): Choose which day to run
   - **Time of Day**: Set the time (HH:MM format)
   - **Timezone**: Select your timezone
   - **Email Recipients**: Add email addresses (comma-separated)
3. Click **Create Schedule**

### 3. Manage Schedules

- **Edit**: Click the edit icon to modify time or recipients
- **Delete**: Click the trash icon to remove a schedule
- **View History**: See delivery status and timestamps for each report sent

## Backend Setup

### Database Tables

Two tables are automatically created:

**reportSchedules** - Stores schedule configurations
- `id`: Schedule ID
- `userId`: Admin who created the schedule
- `reportType`: Type of report (attendance, overtime, leave, gps_activity, all)
- `frequency`: Daily or weekly
- `dayOfWeek`: For weekly schedules
- `timeOfDay`: Time in HH:MM format
- `timezone`: Timezone for scheduling
- `emailRecipients`: JSON array of email addresses
- `isActive`: Enable/disable flag
- `lastSentAt`: Last execution timestamp
- `nextScheduledAt`: Next scheduled execution

**reportDeliveryHistory** - Tracks all sent reports
- `id`: Delivery record ID
- `scheduleId`: Reference to schedule
- `reportType`: Type of report sent
- `generatedAt`: When report was generated
- `sentAt`: When email was sent
- `recipientEmails`: Recipients who received it
- `deliveryStatus`: PENDING, SENT, or FAILED
- `errorMessage`: Error details if failed
- `fileUrl`: S3 URL to generated report file
- `recordCount`: Number of records in report

### API Endpoints

All endpoints are admin-only:

**Create Schedule**
```
POST /api/trpc/reportScheduling.create
{
  reportType: "attendance" | "overtime" | "leave" | "gps_activity" | "all",
  frequency: "daily" | "weekly",
  dayOfWeek?: "monday" | "tuesday" | ... (required if weekly),
  timeOfDay: "HH:MM",
  timezone: "UTC" | "Africa/Nairobi" | ...,
  emailRecipients: ["email1@example.com", "email2@example.com"]
}
```

**Get All Schedules**
```
GET /api/trpc/reportScheduling.getAll
```

**Update Schedule**
```
POST /api/trpc/reportScheduling.update
{
  id: number,
  isActive?: boolean,
  timeOfDay?: "HH:MM",
  emailRecipients?: ["email@example.com"]
}
```

**Delete Schedule**
```
POST /api/trpc/reportScheduling.delete
{
  id: number
}
```

**Get Delivery History**
```
POST /api/trpc/reportScheduling.getDeliveryHistory
{
  scheduleId: number
}
```

## Scheduled Task Execution

### Option 1: Manus Scheduled Tasks (Recommended)

The system uses Manus scheduled tasks to execute report generation:

1. **Daily Execution**: Create a scheduled task that runs every day at your preferred time
2. **Weekly Execution**: Create a scheduled task that runs on specific days

Example scheduled task configuration:
- **Name**: "Generate Scheduled Reports"
- **Type**: Cron
- **Schedule**: `0 */1 * * * *` (every hour)
- **Prompt**: "Generate and email all scheduled reports that are due to run at this time"

### Option 2: Custom Integration

To integrate with your own scheduling system:

1. Call the script: `node scripts/generate-scheduled-reports.mjs`
2. Provide environment variables:
   - `SCHEDULED_TASK_ENDPOINT_BASE`: Your app URL (e.g., https://yourapp.manus.space)
   - `SCHEDULED_TASK_COOKIE`: Session cookie for authentication

### Option 3: Cron Job

Set up a cron job to run the report generation:

```bash
# Run every hour
0 * * * * cd /path/to/app && node scripts/generate-scheduled-reports.mjs
```

## Email Integration

Currently, the system logs report generation but doesn't send actual emails. To enable email delivery:

1. **Choose an Email Service**:
   - SendGrid
   - AWS SES
   - Mailgun
   - Resend
   - Your custom SMTP server

2. **Update the Script**:
   - Modify `scripts/generate-scheduled-reports.mjs`
   - Replace the `sendReportEmail()` function with your email service integration
   - Add API keys/credentials to environment variables

3. **Example with SendGrid**:
```javascript
import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

async function sendReportEmail(recipients, reportType, csvContent) {
  const msg = {
    to: recipients,
    from: process.env.REPORT_FROM_EMAIL,
    subject: `${reportType} Report - ${new Date().toLocaleDateString()}`,
    text: `Your scheduled ${reportType} report is attached.`,
    attachments: [{
      content: Buffer.from(csvContent).toString('base64'),
      filename: `${reportType}_report_${Date.now()}.csv`,
      type: 'text/csv',
      disposition: 'attachment'
    }]
  };
  
  await sgMail.send(msg);
  return true;
}
```

## Troubleshooting

### Schedule Not Running

1. Check if schedule is **Active** (toggle in UI)
2. Verify the **Time of Day** matches current time
3. For weekly: Confirm the **Day of Week** is correct
4. Check **Timezone** setting

### Emails Not Received

1. Verify **Email Recipients** are correct
2. Check email service configuration
3. Look for delivery errors in **Delivery History**
4. Check spam/junk folders

### Reports Empty

1. Ensure there's data in the database for the report period
2. Check date range filters in report generation
3. Verify staff members have check-in/check-out records

## Best Practices

1. **Schedule During Off-Hours**: Run reports at times when system load is low
2. **Use Multiple Schedules**: Create separate schedules for different report types
3. **Test First**: Create a test schedule with your email to verify it works
4. **Monitor Delivery**: Regularly check the Delivery History tab
5. **Backup Reports**: Store important reports in your email or cloud storage
6. **Update Recipients**: Keep email lists current as team members change

## Support

For issues or questions:
1. Check the Delivery History for error messages
2. Review server logs for scheduling errors
3. Verify database connectivity
4. Ensure email service is configured correctly
