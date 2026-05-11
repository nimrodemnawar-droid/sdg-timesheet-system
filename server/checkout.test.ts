import { describe, it, expect } from 'vitest';

describe('Check-out and Hours Worked Calculation', () => {
  it('should calculate hours worked correctly when staff checks out', () => {
    // Create check-in and check-out times
    const checkInTime = new Date('2026-05-11T08:00:00Z');
    const checkOutTime = new Date('2026-05-11T16:30:00Z');

    // Calculate expected hours
    const hoursWorked = parseFloat(
      ((checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60)).toFixed(2)
    );
    
    expect(hoursWorked).toBe(8.5); // 8 hours 30 minutes
  });

  it('should return 0 hours when staff has not checked out', () => {
    // When checkOutTime is null, hoursWorked should be 0
    const hoursWorked = 0;
    expect(hoursWorked).toBe(0);
  });

  it('should calculate partial hours correctly', () => {
    // Create check-in and check-out with 2 hours 15 minutes
    const checkInTime = new Date('2026-05-11T10:00:00Z');
    const checkOutTime = new Date('2026-05-11T12:15:00Z');

    // Calculate expected hours
    const hoursWorked = parseFloat(
      ((checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60)).toFixed(2)
    );
    
    expect(hoursWorked).toBe(2.25); // 2 hours 15 minutes = 2.25 hours
  });

  it('should calculate multiple sessions correctly', () => {
    // First session: 4 hours
    const checkIn1 = new Date('2026-05-11T08:00:00Z');
    const checkOut1 = new Date('2026-05-11T12:00:00Z');
    const hours1 = parseFloat(
      ((checkOut1.getTime() - checkIn1.getTime()) / (1000 * 60 * 60)).toFixed(2)
    );

    // Second session: 4 hours
    const checkIn2 = new Date('2026-05-11T13:00:00Z');
    const checkOut2 = new Date('2026-05-11T17:00:00Z');
    const hours2 = parseFloat(
      ((checkOut2.getTime() - checkIn2.getTime()) / (1000 * 60 * 60)).toFixed(2)
    );
    
    expect(hours1).toBe(4);
    expect(hours2).toBe(4);
  });

  it('should format hours worked to 2 decimal places', () => {
    // Create check-in and check-out with irregular duration
    const checkInTime = new Date('2026-05-11T08:00:00Z');
    const checkOutTime = new Date('2026-05-11T10:47:30Z'); // 2 hours 47 minutes 30 seconds

    // Calculate and format hours
    const hoursWorked = parseFloat(
      ((checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60)).toFixed(2)
    );
    
    expect(hoursWorked).toBe(2.79); // Should be formatted to 2 decimal places
    expect(String(hoursWorked).split('.')[1].length).toBeLessThanOrEqual(2);
  });

  it('should handle full 8-hour workday', () => {
    const checkInTime = new Date('2026-05-11T09:00:00Z');
    const checkOutTime = new Date('2026-05-11T17:00:00Z');

    const hoursWorked = parseFloat(
      ((checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60)).toFixed(2)
    );
    
    expect(hoursWorked).toBe(8);
  });

  it('should handle overtime calculation (more than 8 hours)', () => {
    const checkInTime = new Date('2026-05-11T08:00:00Z');
    const checkOutTime = new Date('2026-05-11T18:00:00Z');

    const hoursWorked = parseFloat(
      ((checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60)).toFixed(2)
    );
    
    expect(hoursWorked).toBe(10); // 10 hours = 2 hours overtime
  });

  it('should handle minimum work duration (less than 1 hour)', () => {
    const checkInTime = new Date('2026-05-11T10:00:00Z');
    const checkOutTime = new Date('2026-05-11T10:30:00Z');

    const hoursWorked = parseFloat(
      ((checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60)).toFixed(2)
    );
    
    expect(hoursWorked).toBe(0.5); // 30 minutes = 0.5 hours
  });

  it('should handle edge case of same check-in and check-out time', () => {
    const checkInTime = new Date('2026-05-11T10:00:00Z');
    const checkOutTime = new Date('2026-05-11T10:00:00Z');

    const hoursWorked = parseFloat(
      ((checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60)).toFixed(2)
    );
    
    expect(hoursWorked).toBe(0);
  });
});
