import { describe, it, expect } from 'vitest';

describe('Overtime Alert Calculation', () => {
  it('should identify overtime when hours exceed 8', () => {
    const hoursWorked = 9.5;
    const isOvertime = hoursWorked > 8;
    const overtimeHours = isOvertime ? parseFloat((hoursWorked - 8).toFixed(2)) : 0;

    expect(isOvertime).toBe(true);
    expect(overtimeHours).toBe(1.5);
  });

  it('should not flag overtime when hours are exactly 8', () => {
    const hoursWorked = 8;
    const isOvertime = hoursWorked > 8;
    const overtimeHours = isOvertime ? parseFloat((hoursWorked - 8).toFixed(2)) : 0;

    expect(isOvertime).toBe(false);
    expect(overtimeHours).toBe(0);
  });

  it('should not flag overtime when hours are less than 8', () => {
    const hoursWorked = 7.5;
    const isOvertime = hoursWorked > 8;
    const overtimeHours = isOvertime ? parseFloat((hoursWorked - 8).toFixed(2)) : 0;

    expect(isOvertime).toBe(false);
    expect(overtimeHours).toBe(0);
  });

  it('should calculate overtime hours correctly for 10-hour workday', () => {
    const hoursWorked = 10;
    const isOvertime = hoursWorked > 8;
    const overtimeHours = isOvertime ? parseFloat((hoursWorked - 8).toFixed(2)) : 0;

    expect(isOvertime).toBe(true);
    expect(overtimeHours).toBe(2);
  });

  it('should calculate overtime hours correctly for 8.25-hour workday', () => {
    const hoursWorked = 8.25;
    const isOvertime = hoursWorked > 8;
    const overtimeHours = isOvertime ? parseFloat((hoursWorked - 8).toFixed(2)) : 0;

    expect(isOvertime).toBe(true);
    expect(overtimeHours).toBe(0.25);
  });

  it('should calculate overtime hours correctly for 12-hour workday', () => {
    const hoursWorked = 12;
    const isOvertime = hoursWorked > 8;
    const overtimeHours = isOvertime ? parseFloat((hoursWorked - 8).toFixed(2)) : 0;

    expect(isOvertime).toBe(true);
    expect(overtimeHours).toBe(4);
  });

  it('should handle edge case of 8.01 hours', () => {
    const hoursWorked = 8.01;
    const isOvertime = hoursWorked > 8;
    const overtimeHours = isOvertime ? parseFloat((hoursWorked - 8).toFixed(2)) : 0;

    expect(isOvertime).toBe(true);
    expect(overtimeHours).toBe(0.01);
  });

  it('should handle edge case of 7.99 hours', () => {
    const hoursWorked = 7.99;
    const isOvertime = hoursWorked > 8;
    const overtimeHours = isOvertime ? parseFloat((hoursWorked - 8).toFixed(2)) : 0;

    expect(isOvertime).toBe(false);
    expect(overtimeHours).toBe(0);
  });

  it('should calculate overtime for 24-hour shift', () => {
    const hoursWorked = 24;
    const isOvertime = hoursWorked > 8;
    const overtimeHours = isOvertime ? parseFloat((hoursWorked - 8).toFixed(2)) : 0;

    expect(isOvertime).toBe(true);
    expect(overtimeHours).toBe(16);
  });

  it('should format overtime hours to 2 decimal places', () => {
    const hoursWorked = 8.333333;
    const isOvertime = hoursWorked > 8;
    const overtimeHours = isOvertime ? parseFloat((hoursWorked - 8).toFixed(2)) : 0;

    expect(isOvertime).toBe(true);
    expect(overtimeHours).toBe(0.33);
    expect(String(overtimeHours).split('.')[1].length).toBeLessThanOrEqual(2);
  });

  it('should identify multiple staff with overtime', () => {
    const staffList = [
      { name: 'John', hoursWorked: 9 },
      { name: 'Jane', hoursWorked: 7.5 },
      { name: 'Bob', hoursWorked: 10.5 },
      { name: 'Alice', hoursWorked: 8 },
    ];

    const overtimeStaff = staffList.filter(s => s.hoursWorked > 8);
    const totalOvertimeHours = overtimeStaff.reduce((sum, s) => sum + (s.hoursWorked - 8), 0);

    expect(overtimeStaff.length).toBe(2);
    expect(totalOvertimeHours).toBeCloseTo(3.5, 1);
  });

  it('should calculate cumulative overtime for week', () => {
    const dailyHours = [9, 8.5, 10, 8, 9.5, 7, 0]; // 7 days
    const totalHours = dailyHours.reduce((sum, h) => sum + h, 0);
    const totalOvertimeHours = dailyHours.reduce((sum, h) => sum + (h > 8 ? h - 8 : 0), 0);

    expect(totalHours).toBe(52);
    expect(totalOvertimeHours).toBe(5); // 1 + 0.5 + 2 + 0 + 1.5 + 0 + 0 = 5
  });
});
