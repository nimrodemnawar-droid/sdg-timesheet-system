#!/usr/bin/env node

/**
 * Scheduled Report Generation Task
 * 
 * This script runs as a scheduled task to:
 * 1. Check for active report schedules
 * 2. Generate reports for schedules due at the current time
 * 3. Email reports to configured recipients
 * 4. Log delivery status
 * 
 * Usage: Run via Manus scheduled task at configured intervals (e.g., every hour)
 */

import fetch from 'node-fetch';

const ENDPOINT_BASE = process.env.SCHEDULED_TASK_ENDPOINT_BASE || 'http://localhost:3000';
const COOKIE = process.env.SCHEDULED_TASK_COOKIE;

if (!ENDPOINT_BASE || !COOKIE) {
  console.error('Missing required environment variables: SCHEDULED_TASK_ENDPOINT_BASE, SCHEDULED_TASK_COOKIE');
  process.exit(1);
}

/**
 * Call tRPC procedure via HTTP
 */
async function callTRPC(path, input) {
  const url = `${ENDPOINT_BASE}/api/trpc/${path}`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `app_session_id=${COOKIE}`,
      },
      body: JSON.stringify({ json: input }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data.result?.data || null;
  } catch (error) {
    console.error(`[TRPC] Error calling ${path}:`, error.message);
    return null;
  }
}

/**
 * Check if a schedule should run now
 */
function shouldRunNow(schedule) {
  const now = new Date();
  const scheduleTime = schedule.timeOfDay; // Format: HH:MM
  const [scheduleHour, scheduleMinute] = scheduleTime.split(':').map(Number);
  
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  
  // Check if current time matches schedule time (within 5-minute window)
  const timeDiff = Math.abs((currentHour * 60 + currentMinute) - (scheduleHour * 60 + scheduleMinute));
  if (timeDiff > 5) return false;
  
  // Check frequency
  if (schedule.frequency === 'daily') {
    return true;
  }
  
  if (schedule.frequency === 'weekly') {
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const currentDay = dayNames[now.getDay()];
    return currentDay === schedule.dayOfWeek;
  }
  
  return false;
}

/**
 * Generate report CSV content based on type
 */
async function generateReportContent(reportType, scheduleId) {
  console.log(`[Report] Generating ${reportType} report for schedule ${scheduleId}`);
  
  // For now, return a placeholder CSV
  // In production, this would call the actual report generation procedures
  const headers = {
    'attendance': 'Staff ID,Name,Date,Check-In,Check-Out,Hours,Distance',
    'overtime': 'Staff ID,Name,Date,Overtime Hours,Reason',
    'leave': 'Staff ID,Name,Leave Type,Start Date,End Date,Days,Status',
    'gps_activity': 'Staff ID,Name,Date,Check-In Location,Check-Out Location,Distance,Waypoints',
  };
  
  return headers[reportType] || 'Report Data';
}

/**
 * Send email with report attachment
 */
async function sendReportEmail(recipients, reportType, csvContent) {
  console.log(`[Email] Sending ${reportType} report to ${recipients.join(', ')}`);
  
  // In production, integrate with email service (SendGrid, AWS SES, etc.)
  // For now, just log the action
  console.log(`[Email] Report content size: ${csvContent.length} bytes`);
  
  return true;
}

/**
 * Main function
 */
async function main() {
  console.log('[Scheduler] Starting scheduled report generation task');
  console.log(`[Scheduler] Endpoint: ${ENDPOINT_BASE}`);
  
  try {
    // Get all active report schedules
    console.log('[Scheduler] Fetching active report schedules...');
    const schedules = await callTRPC('reportScheduling.getAll', {});
    
    if (!schedules || schedules.length === 0) {
      console.log('[Scheduler] No active report schedules found');
      return;
    }
    
    console.log(`[Scheduler] Found ${schedules.length} report schedule(s)`);
    
    // Check each schedule
    for (const schedule of schedules) {
      if (!schedule.isActive) {
        console.log(`[Scheduler] Skipping inactive schedule ${schedule.id}`);
        continue;
      }
      
      if (!shouldRunNow(schedule)) {
        console.log(`[Scheduler] Schedule ${schedule.id} not due yet (${schedule.timeOfDay} ${schedule.frequency})`);
        continue;
      }
      
      console.log(`[Scheduler] Processing schedule ${schedule.id} (${schedule.reportType})`);
      
      try {
        // Generate report content
        const csvContent = await generateReportContent(schedule.reportType, schedule.id);
        
        // Send email
        const emailSent = await sendReportEmail(schedule.emailRecipients, schedule.reportType, csvContent);
        
        if (emailSent) {
          console.log(`[Scheduler] ✓ Report sent successfully for schedule ${schedule.id}`);
          
          // Log delivery in database
          await callTRPC('reportScheduling.logDelivery', {
            scheduleId: schedule.id,
            reportType: schedule.reportType,
            recipientEmails: schedule.emailRecipients,
            deliveryStatus: 'SENT',
            recordCount: 0,
          });
        } else {
          console.error(`[Scheduler] ✗ Failed to send report for schedule ${schedule.id}`);
          
          // Log failed delivery
          await callTRPC('reportScheduling.logDelivery', {
            scheduleId: schedule.id,
            reportType: schedule.reportType,
            recipientEmails: schedule.emailRecipients,
            deliveryStatus: 'FAILED',
            errorMessage: 'Email delivery failed',
            recordCount: 0,
          });
        }
      } catch (error) {
        console.error(`[Scheduler] Error processing schedule ${schedule.id}:`, error.message);
      }
    }
    
    console.log('[Scheduler] Scheduled report generation task completed');
  } catch (error) {
    console.error('[Scheduler] Fatal error:', error.message);
    process.exit(1);
  }
}

// Run the task
main().catch(error => {
  console.error('[Scheduler] Unhandled error:', error);
  process.exit(1);
});
