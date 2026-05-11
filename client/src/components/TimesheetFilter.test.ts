import { describe, it, expect } from 'vitest';

describe('Timesheet Filter Logic', () => {
  describe('Date Range Filtering', () => {
    it('should filter records by start date', () => {
      const records = [
        { checkInTime: '2026-05-01T08:00:00', hoursWorked: 8 },
        { checkInTime: '2026-05-05T08:00:00', hoursWorked: 8 },
        { checkInTime: '2026-05-10T08:00:00', hoursWorked: 8 },
      ];

      const startDate = new Date('2026-05-05');
      const filtered = records.filter((record) => {
        const recordDate = new Date(record.checkInTime);
        return recordDate >= startDate;
      });

      expect(filtered.length).toBe(2);
      expect(filtered[0].checkInTime).toContain('2026-05-05');
    });

    it('should filter records by end date', () => {
      const records = [
        { checkInTime: '2026-05-01T08:00:00', hoursWorked: 8 },
        { checkInTime: '2026-05-05T08:00:00', hoursWorked: 8 },
        { checkInTime: '2026-05-10T08:00:00', hoursWorked: 8 },
      ];

      const endDate = new Date('2026-05-05');
      endDate.setHours(23, 59, 59, 999);
      const filtered = records.filter((record) => {
        const recordDate = new Date(record.checkInTime);
        return recordDate <= endDate;
      });

      expect(filtered.length).toBe(2);
    });

    it('should filter records by date range', () => {
      const records = [
        { checkInTime: '2026-05-01T08:00:00', hoursWorked: 8 },
        { checkInTime: '2026-05-05T08:00:00', hoursWorked: 8 },
        { checkInTime: '2026-05-10T08:00:00', hoursWorked: 8 },
        { checkInTime: '2026-05-15T08:00:00', hoursWorked: 8 },
      ];

      const startDate = new Date('2026-05-05');
      const endDate = new Date('2026-05-10');
      endDate.setHours(23, 59, 59, 999);

      let filtered = records.filter((record) => {
        const recordDate = new Date(record.checkInTime);
        return recordDate >= startDate && recordDate <= endDate;
      });

      expect(filtered.length).toBe(2);
    });
  });

  describe('Overtime Status Filtering', () => {
    it('should filter records with overtime (>8 hours)', () => {
      const records = [
        { hoursWorked: 6 },
        { hoursWorked: 8 },
        { hoursWorked: 8.5 },
        { hoursWorked: 9 },
        { hoursWorked: 10 },
      ];

      const overtime = records.filter((record) => record.hoursWorked > 8);

      expect(overtime.length).toBe(3);
      expect(overtime.every((r) => r.hoursWorked > 8)).toBe(true);
    });

    it('should filter records without overtime (<=8 hours)', () => {
      const records = [
        { hoursWorked: 6 },
        { hoursWorked: 8 },
        { hoursWorked: 8.5 },
        { hoursWorked: 9 },
        { hoursWorked: 10 },
      ];

      const noOvertime = records.filter((record) => record.hoursWorked <= 8);

      expect(noOvertime.length).toBe(2);
      expect(noOvertime.every((r) => r.hoursWorked <= 8)).toBe(true);
    });
  });

  describe('Staff Name Filtering', () => {
    it('should filter records by staff name', () => {
      const records = [
        { userName: 'Alice Johnson', userId: 1 },
        { userName: 'Bob Smith', userId: 2 },
        { userName: 'Charlie Brown', userId: 3 },
        { userName: 'Alice Williams', userId: 4 },
      ];

      const searchTerm = 'alice';
      const filtered = records.filter((record) => {
        const name = (record.userName || `Staff ${record.userId}`).toLowerCase();
        return name.includes(searchTerm);
      });

      expect(filtered.length).toBe(2);
      expect(filtered.every((r) => r.userName.toLowerCase().includes('alice'))).toBe(true);
    });

    it('should handle partial name matching', () => {
      const records = [
        { userName: 'Alice Johnson', userId: 1 },
        { userName: 'Bob Smith', userId: 2 },
        { userName: 'Charlie Brown', userId: 3 },
      ];

      const searchTerm = 'john';
      const filtered = records.filter((record) => {
        const name = (record.userName || `Staff ${record.userId}`).toLowerCase();
        return name.includes(searchTerm);
      });

      expect(filtered.length).toBe(1);
      expect(filtered[0].userName).toBe('Alice Johnson');
    });
  });

  describe('Sorting', () => {
    it('should sort by date ascending', () => {
      const records = [
        { checkInTime: '2026-05-10T08:00:00' },
        { checkInTime: '2026-05-05T08:00:00' },
        { checkInTime: '2026-05-15T08:00:00' },
      ];

      const sorted = [...records].sort((a, b) => {
        return new Date(a.checkInTime).getTime() - new Date(b.checkInTime).getTime();
      });

      expect(sorted[0].checkInTime).toContain('2026-05-05');
      expect(sorted[1].checkInTime).toContain('2026-05-10');
      expect(sorted[2].checkInTime).toContain('2026-05-15');
    });

    it('should sort by date descending', () => {
      const records = [
        { checkInTime: '2026-05-10T08:00:00' },
        { checkInTime: '2026-05-05T08:00:00' },
        { checkInTime: '2026-05-15T08:00:00' },
      ];

      const sorted = [...records].sort((a, b) => {
        return new Date(b.checkInTime).getTime() - new Date(a.checkInTime).getTime();
      });

      expect(sorted[0].checkInTime).toContain('2026-05-15');
      expect(sorted[1].checkInTime).toContain('2026-05-10');
      expect(sorted[2].checkInTime).toContain('2026-05-05');
    });

    it('should sort by hours ascending', () => {
      const records = [
        { hoursWorked: 8.5 },
        { hoursWorked: 6 },
        { hoursWorked: 9 },
      ];

      const sorted = [...records].sort((a, b) => a.hoursWorked - b.hoursWorked);

      expect(sorted[0].hoursWorked).toBe(6);
      expect(sorted[1].hoursWorked).toBe(8.5);
      expect(sorted[2].hoursWorked).toBe(9);
    });

    it('should sort by hours descending', () => {
      const records = [
        { hoursWorked: 8.5 },
        { hoursWorked: 6 },
        { hoursWorked: 9 },
      ];

      const sorted = [...records].sort((a, b) => b.hoursWorked - a.hoursWorked);

      expect(sorted[0].hoursWorked).toBe(9);
      expect(sorted[1].hoursWorked).toBe(8.5);
      expect(sorted[2].hoursWorked).toBe(6);
    });
  });

  describe('Combined Filtering', () => {
    it('should apply multiple filters together', () => {
      const records = [
        { checkInTime: '2026-05-01T08:00:00', hoursWorked: 8, userName: 'Alice' },
        { checkInTime: '2026-05-05T08:00:00', hoursWorked: 9, userName: 'Bob' },
        { checkInTime: '2026-05-10T08:00:00', hoursWorked: 8.5, userName: 'Alice' },
        { checkInTime: '2026-05-15T08:00:00', hoursWorked: 7, userName: 'Charlie' },
      ];

      const startDate = new Date('2026-05-05');
      const endDate = new Date('2026-05-10');
      endDate.setHours(23, 59, 59, 999);

      let filtered = records.filter((record) => {
        const recordDate = new Date(record.checkInTime);
        return recordDate >= startDate && recordDate <= endDate;
      });

      filtered = filtered.filter((record) => record.hoursWorked > 8);
      filtered = filtered.filter((record) => record.userName.toLowerCase().includes('alice'));

      expect(filtered.length).toBe(1);
      expect(filtered[0].userName).toBe('Alice');
      expect(filtered[0].hoursWorked).toBe(8.5);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty records array', () => {
      const records: any[] = [];
      const filtered = records.filter((r) => r.hoursWorked > 8);
      expect(filtered.length).toBe(0);
    });

    it('should handle null/undefined values', () => {
      const records = [
        { hoursWorked: 8, userName: 'Alice' },
        { hoursWorked: null, userName: 'Bob' },
        { hoursWorked: 9, userName: undefined },
      ];

      const filtered = records.filter((record) => {
        const hours = record.hoursWorked || 0;
        return hours > 8;
      });

      expect(filtered.length).toBe(1);
    });

    it('should handle case-insensitive name search', () => {
      const records = [
        { userName: 'ALICE JOHNSON' },
        { userName: 'alice johnson' },
        { userName: 'Alice Johnson' },
      ];

      const searchTerm = 'alice';
      const filtered = records.filter((record) => {
        const name = (record.userName || '').toLowerCase();
        return name.includes(searchTerm);
      });

      expect(filtered.length).toBe(3);
    });
  });
});
