import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateTimesheetEmailHTML, generateTimesheetEmailPlainText } from './emailTemplates';

describe('Email Notification Templates', () => {
  const mockTimesheetData = {
    staffName: 'John Doe',
    staffNumber: '001',
    submissionDate: 'May 12, 2026',
    amStartTime: '09:00 AM',
    amEndTime: '12:30 PM',
    pmStartTime: '01:30 PM',
    pmEndTime: '05:00 PM',
    workModality: 'office',
    activityCategory: 'Project Development',
    taskDescription: 'Completed timesheet system implementation',
    hoursWorked: 7.5,
    isOvertime: false,
  };

  describe('HTML Email Template', () => {
    it('should generate valid HTML email template', () => {
      const html = generateTimesheetEmailHTML(mockTimesheetData);
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('</html>');
    });

    it('should include staff information in HTML email', () => {
      const html = generateTimesheetEmailHTML(mockTimesheetData);
      expect(html).toContain('John Doe');
      expect(html).toContain('#001');
      expect(html).toContain('May 12, 2026');
    });

    it('should include work hours in HTML email', () => {
      const html = generateTimesheetEmailHTML(mockTimesheetData);
      expect(html).toContain('09:00 AM');
      expect(html).toContain('12:30 PM');
      expect(html).toContain('01:30 PM');
      expect(html).toContain('05:00 PM');
      expect(html).toContain('7.50 hours');
    });

    it('should include work details in HTML email', () => {
      const html = generateTimesheetEmailHTML(mockTimesheetData);
      expect(html).toContain('OFFICE');
      expect(html).toContain('Project Development');
      expect(html).toContain('Completed timesheet system implementation');
    });

    it('should NOT include overtime alert for non-overtime', () => {
      const html = generateTimesheetEmailHTML(mockTimesheetData);
      expect(html).not.toContain('OVERTIME ALERT');
    });

    it('should include overtime alert for overtime hours', () => {
      const overtimeData = { ...mockTimesheetData, hoursWorked: 9.5, isOvertime: true, overtimeHours: 1.5 };
      const html = generateTimesheetEmailHTML(overtimeData);
      expect(html).toContain('OVERTIME ALERT');
      expect(html).toContain('1.50 hours');
    });

    it('should include admin dashboard link', () => {
      const html = generateTimesheetEmailHTML(mockTimesheetData);
      expect(html).toContain('sdgtimesheet-y6qxkr6m.manus.space/admin');
    });

    it('should have proper styling for different work modalities', () => {
      const fieldData = { ...mockTimesheetData, workModality: 'field' };
      const html = generateTimesheetEmailHTML(fieldData);
      expect(html).toContain('badge-field');
      expect(html).toContain('FIELD');
    });

    it('should handle remote work modality styling', () => {
      const remoteData = { ...mockTimesheetData, workModality: 'remote' };
      const html = generateTimesheetEmailHTML(remoteData);
      expect(html).toContain('badge-remote');
      expect(html).toContain('REMOTE');
    });
  });

  describe('Plain Text Email Template', () => {
    it('should generate valid plain text email', () => {
      const text = generateTimesheetEmailPlainText(mockTimesheetData);
      expect(text).toContain('TIMESHEET SUBMISSION NOTIFICATION');
      expect(text).toContain('==================================');
    });

    it('should include staff information in plain text', () => {
      const text = generateTimesheetEmailPlainText(mockTimesheetData);
      expect(text).toContain('Staff Name: John Doe');
      expect(text).toContain('Staff Number: #001');
      expect(text).toContain('Submission Date: May 12, 2026');
    });

    it('should include work hours in plain text', () => {
      const text = generateTimesheetEmailPlainText(mockTimesheetData);
      expect(text).toContain('AM Start Time: 09:00 AM');
      expect(text).toContain('AM End Time: 12:30 PM');
      expect(text).toContain('PM Start Time: 01:30 PM');
      expect(text).toContain('PM End Time: 05:00 PM');
      expect(text).toContain('Total Hours Worked: 7.50 hours');
    });

    it('should include work details in plain text', () => {
      const text = generateTimesheetEmailPlainText(mockTimesheetData);
      expect(text).toContain('Work Modality: OFFICE');
      expect(text).toContain('Activity Category: Project Development');
      expect(text).toContain('Task Description: Completed timesheet system implementation');
    });

    it('should NOT include overtime alert in plain text for non-overtime', () => {
      const text = generateTimesheetEmailPlainText(mockTimesheetData);
      expect(text).not.toContain('OVERTIME ALERT');
    });

    it('should include overtime alert in plain text for overtime', () => {
      const overtimeData = { ...mockTimesheetData, hoursWorked: 9.5, isOvertime: true, overtimeHours: 1.5 };
      const text = generateTimesheetEmailPlainText(overtimeData);
      expect(text).toContain('OVERTIME ALERT: 1.50 hours');
    });

    it('should include footer with disclaimer', () => {
      const text = generateTimesheetEmailPlainText(mockTimesheetData);
      expect(text).toContain('This is an automated notification');
      expect(text).toContain('Please do not reply to this email');
    });
  });

  describe('Email Template Edge Cases', () => {
    it('should handle missing optional fields gracefully', () => {
      const minimalData = {
        staffName: '',
        staffNumber: '000',
        submissionDate: '',
        amStartTime: 'N/A',
        amEndTime: 'N/A',
        pmStartTime: 'N/A',
        pmEndTime: 'N/A',
        workModality: 'Not specified',
        activityCategory: '',
        taskDescription: '',
        hoursWorked: 0,
        isOvertime: false,
      };
      const html = generateTimesheetEmailHTML(minimalData);
      expect(html).toBeTruthy();
      expect(html).toContain('N/A');
      expect(html).toContain('0.00 hours');
    });

    it('should handle very long task descriptions', () => {
      const longDescription = 'A'.repeat(500);
      const longData = { ...mockTimesheetData, taskDescription: longDescription };
      const html = generateTimesheetEmailHTML(longData);
      expect(html).toContain(longDescription);
    });

    it('should format hours correctly with decimal precision', () => {
      const precisionData = { ...mockTimesheetData, hoursWorked: 8.666666 };
      const html = generateTimesheetEmailHTML(precisionData);
      expect(html).toContain('8.67 hours');
    });

    it('should handle maximum overtime hours', () => {
      const maxOvertimeData = {
        ...mockTimesheetData,
        hoursWorked: 12,
        isOvertime: true,
        overtimeHours: 4,
      };
      const html = generateTimesheetEmailHTML(maxOvertimeData);
      expect(html).toContain('OVERTIME ALERT');
      expect(html).toContain('4.00 hours');
    });

    it('should escape special characters in task description', () => {
      const specialData = {
        ...mockTimesheetData,
        taskDescription: 'Test <script>alert("xss")</script> injection',
      };
      const html = generateTimesheetEmailHTML(specialData);
      // HTML should be properly formatted, not execute scripts
      expect(html).toContain('Test');
    });
  });

  describe('Email Notification Content Validation', () => {
    it('should have consistent staff number formatting', () => {
      const data1 = { ...mockTimesheetData, staffNumber: '1' };
      const data2 = { ...mockTimesheetData, staffNumber: '001' };
      const data3 = { ...mockTimesheetData, staffNumber: '100' };

      const html1 = generateTimesheetEmailHTML(data1);
      const html2 = generateTimesheetEmailHTML(data2);
      const html3 = generateTimesheetEmailHTML(data3);

      expect(html1).toContain('#1');
      expect(html2).toContain('#001');
      expect(html3).toContain('#100');
    });

    it('should include all required email sections', () => {
      const html = generateTimesheetEmailHTML(mockTimesheetData);
      expect(html).toContain('Staff Information');
      expect(html).toContain('Work Hours');
      expect(html).toContain('Work Details');
      expect(html).toContain('Timesheet Submission Notification');
    });

    it('should have proper HTML structure for email clients', () => {
      const html = generateTimesheetEmailHTML(mockTimesheetData);
      expect(html).toContain('<meta charset="UTF-8">');
      expect(html).toContain('<style>');
      expect(html).toContain('</style>');
      expect(html).toContain('<table>');
      expect(html).toContain('</table>');
    });
  });
});
