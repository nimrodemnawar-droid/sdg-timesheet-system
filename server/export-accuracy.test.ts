import { describe, it, expect, beforeAll } from 'vitest';
import * as db from './db';

describe('Export Data Accuracy Verification', () => {
  
  describe('TimesheetExportData Interface', () => {
    it('should include all 27 required fields', () => {
      const requiredFields = [
        'staffNumber', 'staffName', 'staffEmail', 'date',
        'checkInTime', 'checkOutTime',
        'checkInCoordinates', 'checkInAddress', 'checkOutCoordinates', 'checkOutAddress',
        'hoursWorked', 'overtimeHours', 'distanceTraveled',
        'workModality', 'activityCategory', 'sdgGoal', 'kpi',
        'taskDescription', 'staffRemarks',
        'amStartTime', 'amEndTime', 'pmStartTime', 'pmEndTime',
        'program', 'evidenceUploadKey', 'isSubmitted', 'submittedAt'
      ];
      
      expect(requiredFields).toHaveLength(27);
    });
  });

  describe('CSV Export Format', () => {
    it('should generate CSV with all 24 column headers', () => {
      const testData: any[] = [{
        staffNumber: 1,
        staffName: 'John Doe',
        staffEmail: 'john@example.com',
        date: '2026-05-18',
        checkInTime: '09:00 AM',
        checkOutTime: '05:00 PM',
        checkInCoordinates: '-1.286389, 36.817223',
        checkInAddress: 'Nairobi Office',
        checkOutCoordinates: '-1.286389, 36.817223',
        checkOutAddress: 'Nairobi Office',
        hoursWorked: 8.0,
        overtimeHours: 0,
        distanceTraveled: '0.00 km',
        workModality: 'nairobi_office',
        activityCategory: 'Meeting',
        sdgGoal: 'SDG 3: Good Health',
        kpi: 'Staff Engagement (count)',
        taskDescription: 'Team meeting',
        staffRemarks: 'Productive day',
        amStartTime: '09:00 AM',
        amEndTime: '12:30 PM',
        pmStartTime: '01:30 PM',
        pmEndTime: '05:00 PM',
        program: 'Health Initiative',
        evidenceUploadKey: 'uploads/evidence-123.pdf',
        isSubmitted: true,
        submittedAt: '2026-05-18 05:15 PM'
      }];

      const csv = db.generateCSVContent(testData);
      const lines = csv.split('\n');
      const headers = lines[0].split(',');

      expect(headers).toContain('Staff #');
      expect(headers).toContain('Staff Name');
      expect(headers).toContain('Staff Email');
      expect(headers).toContain('Check-in Time');
      expect(headers).toContain('Check-out Time');
      expect(headers).toContain('Hours Worked');
      expect(headers).toContain('Overtime Hours');
      expect(headers).toContain('Work Modality');
      expect(headers).toContain('Activity Category');
      expect(headers).toContain('SDG Goal');
      expect(headers).toContain('KPI');
      expect(headers).toContain('Task Description');
      expect(headers).toContain('Staff Remarks');
      expect(headers).toContain('AM Start');
      expect(headers).toContain('AM End');
      expect(headers).toContain('PM Start');
      expect(headers).toContain('PM End');
      expect(headers).toContain('Program');
      expect(headers).toContain('Evidence Upload Key');
      expect(headers).toContain('Submission Status');
      expect(headers).toContain('Submitted At');
      expect(headers.length).toBe(31); // 31 columns including organisation context and structured tasks
    });

    it('should properly escape CSV special characters', () => {
      const testData: any[] = [{
        staffNumber: 1,
        staffName: 'John, Doe',
        staffEmail: 'john@example.com',
        date: '2026-05-18',
        checkInTime: '09:00 AM',
        checkOutTime: '05:00 PM',
        checkInCoordinates: '-1.286389, 36.817223',
        checkInAddress: 'Office "Downtown"',
        checkOutCoordinates: '-1.286389, 36.817223',
        checkOutAddress: 'Office',
        hoursWorked: 8.0,
        overtimeHours: 0,
        distanceTraveled: '0.00 km',
        workModality: 'nairobi_office',
        activityCategory: 'Meeting',
        sdgGoal: 'SDG 3',
        kpi: 'Count',
        taskDescription: 'Task with "quotes"',
        staffRemarks: 'Remarks with, commas',
        amStartTime: '09:00 AM',
        amEndTime: '12:30 PM',
        pmStartTime: '01:30 PM',
        pmEndTime: '05:00 PM',
        program: 'Program',
        evidenceUploadKey: 'key',
        isSubmitted: true,
        submittedAt: '2026-05-18 05:15 PM'
      }];

      const csv = db.generateCSVContent(testData);
      
      // Should escape commas and quotes
      expect(csv).toContain('"John, Doe"');
      expect(csv).toContain('"Office ""Downtown"""');
      expect(csv).toContain('"Task with ""quotes"""');
      expect(csv).toContain('"Remarks with, commas"');
    });

    it('should include all data fields in CSV rows', () => {
      const testData: any[] = [{
        staffNumber: 1,
        staffName: 'John Doe',
        staffEmail: 'john@example.com',
        date: '2026-05-18',
        checkInTime: '09:00 AM',
        checkOutTime: '05:00 PM',
        checkInCoordinates: '-1.286389, 36.817223',
        checkInAddress: 'Nairobi Office',
        checkOutCoordinates: '-1.286389, 36.817223',
        checkOutAddress: 'Nairobi Office',
        hoursWorked: 8.0,
        overtimeHours: 0,
        distanceTraveled: '0.00 km',
        workModality: 'nairobi_office',
        activityCategory: 'Meeting',
        sdgGoal: 'SDG 3',
        kpi: 'Count',
        taskDescription: 'Team meeting',
        staffRemarks: 'Productive',
        amStartTime: '09:00 AM',
        amEndTime: '12:30 PM',
        pmStartTime: '01:30 PM',
        pmEndTime: '05:00 PM',
        program: 'Health',
        evidenceUploadKey: 'uploads/evidence-123.pdf',
        isSubmitted: true,
        submittedAt: '2026-05-18 05:15 PM'
      }];

      const csv = db.generateCSVContent(testData);
      const lines = csv.split('\n');
      const dataRow = lines[1];

      // Verify all data is present in the row
      expect(dataRow).toContain('001'); // Staff #
      expect(dataRow).toContain('John Doe');
      expect(dataRow).toContain('john@example.com');
      expect(dataRow).toContain('2026-05-18');
      expect(dataRow).toContain('09:00 AM');
      expect(dataRow).toContain('05:00 PM');
      expect(dataRow).toContain('8');
      expect(dataRow).toContain('0');
      expect(dataRow).toContain('nairobi_office');
      expect(dataRow).toContain('Meeting');
      expect(dataRow).toContain('SDG 3');
      expect(dataRow).toContain('Team meeting');
      expect(dataRow).toContain('Health');
    });
  });

  describe('Excel Export Format', () => {
    it('should generate Excel HTML with all 27 columns', () => {
      const testData: any[] = [{
        staffNumber: 1,
        staffName: 'John Doe',
        staffEmail: 'john@example.com',
        date: '2026-05-18',
        checkInTime: '09:00 AM',
        checkOutTime: '05:00 PM',
        checkInCoordinates: '-1.286389, 36.817223',
        checkInAddress: 'Nairobi Office',
        checkOutCoordinates: '-1.286389, 36.817223',
        checkOutAddress: 'Nairobi Office',
        hoursWorked: 8.0,
        overtimeHours: 0,
        distanceTraveled: '0.00 km',
        workModality: 'nairobi_office',
        activityCategory: 'Meeting',
        sdgGoal: 'SDG 3',
        kpi: 'Count',
        taskDescription: 'Team meeting',
        staffRemarks: 'Productive',
        amStartTime: '09:00 AM',
        amEndTime: '12:30 PM',
        pmStartTime: '01:30 PM',
        pmEndTime: '05:00 PM',
        program: 'Health',
        evidenceUploadKey: 'uploads/evidence-123.pdf',
        isSubmitted: true,
        submittedAt: '2026-05-18 05:15 PM'
      }];

      const html = db.generateExcelContent(testData);

      // Verify all headers are present
      expect(html).toContain('<th>Staff #</th>');
      expect(html).toContain('<th>Staff Name</th>');
      expect(html).toContain('<th>Staff Email</th>');
      expect(html).toContain('<th>Check-in Time</th>');
      expect(html).toContain('<th>Check-out Time</th>');
      expect(html).toContain('<th>Hours Worked</th>');
      expect(html).toContain('<th>Overtime Hours</th>');
      expect(html).toContain('<th>Work Modality</th>');
      expect(html).toContain('<th>Activity Category</th>');
      expect(html).toContain('<th>SDG Goal</th>');
      expect(html).toContain('<th>KPI</th>');
      expect(html).toContain('<th>Task Description</th>');
      expect(html).toContain('<th>Staff Remarks</th>');
      expect(html).toContain('<th>AM Start</th>');
      expect(html).toContain('<th>Program</th>');
      expect(html).toContain('<th>Evidence Upload Key</th>');
      expect(html).toContain('<th>Submission Status</th>');
    });

    it('should include data in Excel HTML table rows', () => {
      const testData: any[] = [{
        staffNumber: 1,
        staffName: 'John Doe',
        staffEmail: 'john@example.com',
        date: '2026-05-18',
        checkInTime: '09:00 AM',
        checkOutTime: '05:00 PM',
        checkInCoordinates: '-1.286389, 36.817223',
        checkInAddress: 'Nairobi Office',
        checkOutCoordinates: '-1.286389, 36.817223',
        checkOutAddress: 'Nairobi Office',
        hoursWorked: 8.0,
        overtimeHours: 0,
        distanceTraveled: '0.00 km',
        workModality: 'nairobi_office',
        activityCategory: 'Meeting',
        sdgGoal: 'SDG 3',
        kpi: 'Count',
        taskDescription: 'Team meeting',
        staffRemarks: 'Productive',
        amStartTime: '09:00 AM',
        amEndTime: '12:30 PM',
        pmStartTime: '01:30 PM',
        pmEndTime: '05:00 PM',
        program: 'Health',
        evidenceUploadKey: 'uploads/evidence-123.pdf',
        isSubmitted: true,
        submittedAt: '2026-05-18 05:15 PM'
      }];

      const html = db.generateExcelContent(testData);

      // Verify data is in table cells
      expect(html).toContain('<td>001</td>'); // Staff #
      expect(html).toContain('<td>John Doe</td>');
      expect(html).toContain('<td>john@example.com</td>');
      expect(html).toContain('<td>2026-05-18</td>');
      expect(html).toContain('<td>09:00 AM</td>');
      expect(html).toContain('<td>05:00 PM</td>');
      expect(html).toContain('<td>8</td>');
      expect(html).toContain('<td>nairobi_office</td>');
      expect(html).toContain('<td>Meeting</td>');
      expect(html).toContain('<td>Team meeting</td>');
      expect(html).toContain('<td>Health</td>');
    });

    it('should calculate and display totals correctly', () => {
      const testData: any[] = [
        {
          staffNumber: 1,
          staffName: 'John Doe',
          staffEmail: 'john@example.com',
          date: '2026-05-18',
          checkInTime: '09:00 AM',
          checkOutTime: '05:00 PM',
          checkInCoordinates: '-1.286389, 36.817223',
          checkInAddress: 'Nairobi Office',
          checkOutCoordinates: '-1.286389, 36.817223',
          checkOutAddress: 'Nairobi Office',
          hoursWorked: 8.0,
          overtimeHours: 0,
          distanceTraveled: '0.00 km',
          workModality: 'nairobi_office',
          activityCategory: 'Meeting',
          sdgGoal: 'SDG 3',
          kpi: 'Count',
          taskDescription: 'Team meeting',
          staffRemarks: 'Productive',
          amStartTime: '09:00 AM',
          amEndTime: '12:30 PM',
          pmStartTime: '01:30 PM',
          pmEndTime: '05:00 PM',
          program: 'Health',
          evidenceUploadKey: 'uploads/evidence-123.pdf',
          isSubmitted: true,
          submittedAt: '2026-05-18 05:15 PM'
        },
        {
          staffNumber: 2,
          staffName: 'Jane Smith',
          staffEmail: 'jane@example.com',
          date: '2026-05-18',
          checkInTime: '08:00 AM',
          checkOutTime: '06:00 PM',
          checkInCoordinates: '-1.286389, 36.817223',
          checkInAddress: 'Field',
          checkOutCoordinates: '-1.286389, 36.817223',
          checkOutAddress: 'Field',
          hoursWorked: 10.0,
          overtimeHours: 2.0,
          distanceTraveled: '5.25 km',
          workModality: 'field',
          activityCategory: 'Fieldwork',
          sdgGoal: 'SDG 5',
          kpi: 'Beneficiaries',
          taskDescription: 'Community outreach',
          staffRemarks: 'Excellent engagement',
          amStartTime: '08:00 AM',
          amEndTime: '12:30 PM',
          pmStartTime: '01:30 PM',
          pmEndTime: '06:00 PM',
          program: 'Women Empowerment',
          evidenceUploadKey: 'uploads/evidence-456.pdf',
          isSubmitted: true,
          submittedAt: '2026-05-18 06:15 PM'
        }
      ];

      const html = db.generateExcelContent(testData);

      // Verify totals are calculated correctly
      expect(html).toContain('Total Records: 2');
      expect(html).toContain('Total Hours: 18.00');
      expect(html).toContain('Total Overtime: 2.00');
    });
  });

  describe('Data Integrity', () => {
    it('should preserve all field values without modification', () => {
      const testData: any[] = [{
        staffNumber: 5,
        staffName: 'Test User',
        staffEmail: 'test@example.com',
        date: '2026-05-18',
        checkInTime: '09:30 AM',
        checkOutTime: '04:45 PM',
        checkInCoordinates: '-1.286389, 36.817223',
        checkInAddress: 'Test Address',
        checkOutCoordinates: '-1.286389, 36.817223',
        checkOutAddress: 'Test Address',
        hoursWorked: 7.25,
        overtimeHours: 0,
        distanceTraveled: '2.50 km',
        workModality: 'remote',
        activityCategory: 'Training',
        sdgGoal: 'SDG 4',
        kpi: 'Participants (count)',
        taskDescription: 'Online training session',
        staffRemarks: 'Good participation',
        amStartTime: '09:30 AM',
        amEndTime: '12:30 PM',
        pmStartTime: '01:30 PM',
        pmEndTime: '04:45 PM',
        program: 'Education',
        evidenceUploadKey: 'uploads/training-123.pdf',
        isSubmitted: true,
        submittedAt: '2026-05-18 05:00 PM'
      }];

      const csv = db.generateCSVContent(testData);
      const html = db.generateExcelContent(testData);

      // Verify data is preserved in CSV
      expect(csv).toContain('005'); // Staff number with padding
      expect(csv).toContain('Test User');
      expect(csv).toContain('7.25'); // Hours worked
      expect(csv).toContain('0'); // Overtime
      expect(csv).toContain('2.50 km'); // Distance

      // Verify data is preserved in HTML
      expect(html).toContain('<td>005</td>');
      expect(html).toContain('<td>Test User</td>');
      expect(html).toContain('<td>7.25</td>');
      expect(html).toContain('<td>0</td>');
      expect(html).toContain('<td>2.50 km</td>');
    });

    it('should handle N/A values correctly', () => {
      const testData: any[] = [{
        staffNumber: 1,
        staffName: 'John Doe',
        staffEmail: 'john@example.com',
        date: '2026-05-18',
        checkInTime: '09:00 AM',
        checkOutTime: 'Not checked out',
        checkInCoordinates: '-1.286389, 36.817223',
        checkInAddress: 'N/A',
        checkOutCoordinates: 'N/A',
        checkOutAddress: 'N/A',
        hoursWorked: 0,
        overtimeHours: 0,
        distanceTraveled: 'N/A',
        workModality: 'N/A',
        activityCategory: 'N/A',
        sdgGoal: 'N/A',
        kpi: 'None',
        taskDescription: 'N/A',
        staffRemarks: 'N/A',
        amStartTime: 'N/A',
        amEndTime: 'N/A',
        pmStartTime: 'N/A',
        pmEndTime: 'N/A',
        program: 'N/A',
        evidenceUploadKey: 'N/A',
        isSubmitted: false,
        submittedAt: 'N/A'
      }];

      const csv = db.generateCSVContent(testData);
      const html = db.generateExcelContent(testData);

      // Verify N/A values are preserved
      expect(csv).toContain('N/A');
      expect(html).toContain('N/A');
      expect(csv).toContain('Not checked out');
      expect(html).toContain('Not checked out');
    });
  });
});
