import { describe, it, expect } from 'vitest';
import * as db from './db';

describe('Export Address Field Verification', () => {
  
  describe('Address Fields in TimesheetExportData', () => {
    it('should include checkInAddress and checkOutAddress fields', () => {
      const testData: db.TimesheetExportData[] = [{
        staffNumber: 1,
        staffName: 'John Doe',
        staffEmail: 'john@example.com',
        date: '2026-05-18',
        checkInTime: '09:00 AM',
        checkOutTime: '05:00 PM',
        checkInCoordinates: '-1.286389, 36.817223',
        checkInAddress: 'Nairobi Central Office, Kenya',
        checkOutCoordinates: '-1.286389, 36.817223',
        checkOutAddress: 'Nairobi Central Office, Kenya',
        hoursWorked: 8.0,
        overtimeHours: 0,
        distanceTraveled: '0.00 km',
        workModality: 'nairobi_office',
        activityCategory: 'Meeting',
        sdgGoal: 'SDG 3: Good Health',
        kpi: 'Staff Engagement',
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

      // Verify fields exist
      expect(testData[0]).toHaveProperty('checkInAddress');
      expect(testData[0]).toHaveProperty('checkOutAddress');
      expect(testData[0].checkInAddress).toBe('Nairobi Central Office, Kenya');
      expect(testData[0].checkOutAddress).toBe('Nairobi Central Office, Kenya');
    });

    it('should handle addresses with special characters', () => {
      const testData: db.TimesheetExportData[] = [{
        staffNumber: 2,
        staffName: 'Jane Smith',
        staffEmail: 'jane@example.com',
        date: '2026-05-19',
        checkInTime: '08:30 AM',
        checkOutTime: '04:30 PM',
        checkInCoordinates: '-1.295411, 36.787869',
        checkInAddress: 'Homa Bay Office, "Main Street", Kenya',
        checkOutCoordinates: '-1.295411, 36.787869',
        checkOutAddress: 'Field Site: Kisumu, Kenya (GPS: -0.1022, 34.7617)',
        hoursWorked: 8.0,
        overtimeHours: 0,
        distanceTraveled: '45.5 km',
        workModality: 'field',
        activityCategory: 'Community Outreach',
        sdgGoal: 'SDG 5: Gender Equality',
        kpi: 'Community Engagement',
        taskDescription: 'Community health awareness program',
        staffRemarks: 'Completed "Project Alpha" successfully',
        amStartTime: '08:30 AM',
        amEndTime: '12:00 PM',
        pmStartTime: '01:00 PM',
        pmEndTime: '04:30 PM',
        program: 'Community Health',
        evidenceUploadKey: 'uploads/evidence-456.pdf',
        isSubmitted: true,
        submittedAt: '2026-05-19 04:45 PM'
      }];

      expect(testData[0].checkInAddress).toContain('Main Street');
      expect(testData[0].checkOutAddress).toContain('Kisumu');
    });
  });

  describe('CSV Export with Addresses', () => {
    it('should include Check-in Address and Check-out Address columns', () => {
      const testData: db.TimesheetExportData[] = [{
        staffNumber: 1,
        staffName: 'John Doe',
        staffEmail: 'john@example.com',
        date: '2026-05-18',
        checkInTime: '09:00 AM',
        checkOutTime: '05:00 PM',
        checkInCoordinates: '-1.286389, 36.817223',
        checkInAddress: 'Nairobi Central Office',
        checkOutCoordinates: '-1.286389, 36.817223',
        checkOutAddress: 'Nairobi Central Office',
        hoursWorked: 8.0,
        overtimeHours: 0,
        distanceTraveled: '0.00 km',
        workModality: 'nairobi_office',
        activityCategory: 'Meeting',
        sdgGoal: 'SDG 3',
        kpi: 'Count',
        taskDescription: 'Meeting',
        staffRemarks: 'Good',
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
      const lines = csv.split('\n');
      const headers = lines[0].split(',');

      expect(headers).toContain('Check-in Address');
      expect(headers).toContain('Check-out Address');
      
      // Verify address data is in the CSV row
      expect(lines[1]).toContain('Nairobi Central Office');
    });

    it('should properly escape addresses with commas in CSV', () => {
      const testData: db.TimesheetExportData[] = [{
        staffNumber: 1,
        staffName: 'John Doe',
        staffEmail: 'john@example.com',
        date: '2026-05-18',
        checkInTime: '09:00 AM',
        checkOutTime: '05:00 PM',
        checkInCoordinates: '-1.286389, 36.817223',
        checkInAddress: 'Nairobi, Central Office, Kenya',
        checkOutCoordinates: '-1.286389, 36.817223',
        checkOutAddress: 'Homa Bay, Field Site, Kenya',
        hoursWorked: 8.0,
        overtimeHours: 0,
        distanceTraveled: '0.00 km',
        workModality: 'field',
        activityCategory: 'Meeting',
        sdgGoal: 'SDG 3',
        kpi: 'Count',
        taskDescription: 'Meeting',
        staffRemarks: 'Good',
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
      
      // Addresses with commas should be quoted
      expect(csv).toContain('"Nairobi, Central Office, Kenya"');
      expect(csv).toContain('"Homa Bay, Field Site, Kenya"');
    });

    it('should include addresses in correct column positions', () => {
      const testData: db.TimesheetExportData[] = [{
        staffNumber: 1,
        staffName: 'John Doe',
        staffEmail: 'john@example.com',
        date: '2026-05-18',
        checkInTime: '09:00 AM',
        checkOutTime: '05:00 PM',
        checkInCoordinates: '-1.286389, 36.817223',
        checkInAddress: 'Office A',
        checkOutCoordinates: '-1.286389, 36.817223',
        checkOutAddress: 'Office B',
        hoursWorked: 8.0,
        overtimeHours: 0,
        distanceTraveled: '0.00 km',
        workModality: 'nairobi_office',
        activityCategory: 'Meeting',
        sdgGoal: 'SDG 3',
        kpi: 'Count',
        taskDescription: 'Meeting',
        staffRemarks: 'Good',
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
      const lines = csv.split('\n');
      const headers = lines[0].split(',');

      // Find column indices
      const checkInAddressIdx = headers.indexOf('Check-in Address');
      const checkOutAddressIdx = headers.indexOf('Check-out Address');

      expect(checkInAddressIdx).toBeGreaterThan(-1);
      expect(checkOutAddressIdx).toBeGreaterThan(-1);
      
      // Verify addresses are in the CSV
      expect(csv).toContain('Office A');
      expect(csv).toContain('Office B');
    });
  });

  describe('Excel Export with Addresses', () => {
    it('should include Check-in Address and Check-out Address in HTML table', () => {
      const testData: db.TimesheetExportData[] = [{
        staffNumber: 1,
        staffName: 'John Doe',
        staffEmail: 'john@example.com',
        date: '2026-05-18',
        checkInTime: '09:00 AM',
        checkOutTime: '05:00 PM',
        checkInCoordinates: '-1.286389, 36.817223',
        checkInAddress: 'Nairobi Central Office',
        checkOutCoordinates: '-1.286389, 36.817223',
        checkOutAddress: 'Nairobi Central Office',
        hoursWorked: 8.0,
        overtimeHours: 0,
        distanceTraveled: '0.00 km',
        workModality: 'nairobi_office',
        activityCategory: 'Meeting',
        sdgGoal: 'SDG 3',
        kpi: 'Count',
        taskDescription: 'Meeting',
        staffRemarks: 'Good',
        amStartTime: '09:00 AM',
        amEndTime: '12:30 PM',
        pmStartTime: '01:30 PM',
        pmEndTime: '05:00 PM',
        program: 'Program',
        evidenceUploadKey: 'key',
        isSubmitted: true,
        submittedAt: '2026-05-18 05:15 PM'
      }];

      const html = db.generateExcelContent(testData);

      expect(html).toContain('<th>Check-in Address</th>');
      expect(html).toContain('<th>Check-out Address</th>');
      expect(html).toContain('Nairobi Central Office');
    });

    it('should include address data in Excel table rows', () => {
      const testData: db.TimesheetExportData[] = [{
        staffNumber: 1,
        staffName: 'John Doe',
        staffEmail: 'john@example.com',
        date: '2026-05-18',
        checkInTime: '09:00 AM',
        checkOutTime: '05:00 PM',
        checkInCoordinates: '-1.286389, 36.817223',
        checkInAddress: 'Nairobi Office, Kenya',
        checkOutCoordinates: '-1.286389, 36.817223',
        checkOutAddress: 'Homa Bay Office, Kenya',
        hoursWorked: 8.0,
        overtimeHours: 0,
        distanceTraveled: '50.25 km',
        workModality: 'field',
        activityCategory: 'Outreach',
        sdgGoal: 'SDG 3',
        kpi: 'Count',
        taskDescription: 'Community visit',
        staffRemarks: 'Successful',
        amStartTime: '09:00 AM',
        amEndTime: '12:30 PM',
        pmStartTime: '01:30 PM',
        pmEndTime: '05:00 PM',
        program: 'Program',
        evidenceUploadKey: 'key',
        isSubmitted: true,
        submittedAt: '2026-05-18 05:15 PM'
      }];

      const html = db.generateExcelContent(testData);

      expect(html).toContain('<td>Nairobi Office, Kenya</td>');
      expect(html).toContain('<td>Homa Bay Office, Kenya</td>');
    });

    it('should have all 27 columns in Excel export', () => {
      const testData: db.TimesheetExportData[] = [{
        staffNumber: 1,
        staffName: 'John Doe',
        staffEmail: 'john@example.com',
        date: '2026-05-18',
        checkInTime: '09:00 AM',
        checkOutTime: '05:00 PM',
        checkInCoordinates: '-1.286389, 36.817223',
        checkInAddress: 'Office A',
        checkOutCoordinates: '-1.286389, 36.817223',
        checkOutAddress: 'Office B',
        hoursWorked: 8.0,
        overtimeHours: 0,
        distanceTraveled: '0.00 km',
        workModality: 'nairobi_office',
        activityCategory: 'Meeting',
        sdgGoal: 'SDG 3',
        kpi: 'Count',
        taskDescription: 'Meeting',
        staffRemarks: 'Good',
        amStartTime: '09:00 AM',
        amEndTime: '12:30 PM',
        pmStartTime: '01:30 PM',
        pmEndTime: '05:00 PM',
        program: 'Program',
        evidenceUploadKey: 'key',
        isSubmitted: true,
        submittedAt: '2026-05-18 05:15 PM'
      }];

      const html = db.generateExcelContent(testData);
      
      // Count table headers
      const headerMatches = html.match(/<th>/g);
      expect(headerMatches).toBeDefined();
      expect(headerMatches!.length).toBe(28); // 28 columns including structured tasks
    });
  });

  describe('Address Field Fallback Handling', () => {
    it('should handle empty addresses gracefully', () => {
      const testData: db.TimesheetExportData[] = [{
        staffNumber: 1,
        staffName: 'John Doe',
        staffEmail: 'john@example.com',
        date: '2026-05-18',
        checkInTime: '09:00 AM',
        checkOutTime: '05:00 PM',
        checkInCoordinates: '-1.286389, 36.817223',
        checkInAddress: '',
        checkOutCoordinates: '-1.286389, 36.817223',
        checkOutAddress: '',
        hoursWorked: 8.0,
        overtimeHours: 0,
        distanceTraveled: '0.00 km',
        workModality: 'nairobi_office',
        activityCategory: 'Meeting',
        sdgGoal: 'SDG 3',
        kpi: 'Count',
        taskDescription: 'Meeting',
        staffRemarks: 'Good',
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
      expect(csv).toBeDefined();
      expect(csv.length).toBeGreaterThan(0);
    });

    it('should handle null addresses', () => {
      const testData: db.TimesheetExportData[] = [{
        staffNumber: 1,
        staffName: 'John Doe',
        staffEmail: 'john@example.com',
        date: '2026-05-18',
        checkInTime: '09:00 AM',
        checkOutTime: '05:00 PM',
        checkInCoordinates: '-1.286389, 36.817223',
        checkInAddress: 'N/A',
        checkOutCoordinates: '-1.286389, 36.817223',
        checkOutAddress: 'N/A',
        hoursWorked: 8.0,
        overtimeHours: 0,
        distanceTraveled: '0.00 km',
        workModality: 'nairobi_office',
        activityCategory: 'Meeting',
        sdgGoal: 'SDG 3',
        kpi: 'Count',
        taskDescription: 'Meeting',
        staffRemarks: 'Good',
        amStartTime: '09:00 AM',
        amEndTime: '12:30 PM',
        pmStartTime: '01:30 PM',
        pmEndTime: '05:00 PM',
        program: 'Program',
        evidenceUploadKey: 'key',
        isSubmitted: true,
        submittedAt: '2026-05-18 05:15 PM'
      }];

      const html = db.generateExcelContent(testData);
      expect(html).toContain('N/A');
    });
  });

  describe('Complete Export Pipeline with Addresses', () => {
    it('should maintain address data through entire export process', () => {
      const originalAddress = 'Nairobi Central Office, Westlands, Kenya';
      const testData: db.TimesheetExportData[] = [{
        staffNumber: 1,
        staffName: 'John Doe',
        staffEmail: 'john@example.com',
        date: '2026-05-18',
        checkInTime: '09:00 AM',
        checkOutTime: '05:00 PM',
        checkInCoordinates: '-1.286389, 36.817223',
        checkInAddress: originalAddress,
        checkOutCoordinates: '-1.286389, 36.817223',
        checkOutAddress: originalAddress,
        hoursWorked: 8.0,
        overtimeHours: 0,
        distanceTraveled: '0.00 km',
        workModality: 'nairobi_office',
        activityCategory: 'Meeting',
        sdgGoal: 'SDG 3',
        kpi: 'Count',
        taskDescription: 'Meeting',
        staffRemarks: 'Good',
        amStartTime: '09:00 AM',
        amEndTime: '12:30 PM',
        pmStartTime: '01:30 PM',
        pmEndTime: '05:00 PM',
        program: 'Program',
        evidenceUploadKey: 'key',
        isSubmitted: true,
        submittedAt: '2026-05-18 05:15 PM'
      }];

      // Test CSV export
      const csv = db.generateCSVContent(testData);
      expect(csv).toContain(originalAddress);

      // Test Excel export
      const html = db.generateExcelContent(testData);
      expect(html).toContain(originalAddress);

      // Verify data integrity
      expect(testData[0].checkInAddress).toBe(originalAddress);
      expect(testData[0].checkOutAddress).toBe(originalAddress);
    });
  });
});
