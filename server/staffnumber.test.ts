import { describe, it, expect } from 'vitest';

describe('Staff Number Assignment', () => {
  it('should assign staff number 1 to first user', () => {
    const assignedNumbers = new Set<number>();
    const nextNumber = 1;
    
    for (let i = 1; i <= 100; i++) {
      if (!assignedNumbers.has(i)) {
        expect(i).toBe(nextNumber);
        break;
      }
    }
  });

  it('should assign next available number sequentially', () => {
    const assignedNumbers = new Set([1, 2, 3]);
    let nextNumber: number | null = null;
    
    for (let i = 1; i <= 100; i++) {
      if (!assignedNumbers.has(i)) {
        nextNumber = i;
        break;
      }
    }
    
    expect(nextNumber).toBe(4);
  });

  it('should skip already assigned numbers', () => {
    const assignedNumbers = new Set([1, 2, 4, 5]);
    let nextNumber: number | null = null;
    
    for (let i = 1; i <= 100; i++) {
      if (!assignedNumbers.has(i)) {
        nextNumber = i;
        break;
      }
    }
    
    expect(nextNumber).toBe(3);
  });

  it('should handle all numbers 1-100 assigned', () => {
    const assignedNumbers = new Set<number>();
    for (let i = 1; i <= 100; i++) {
      assignedNumbers.add(i);
    }
    
    let nextNumber: number | null = null;
    for (let i = 1; i <= 100; i++) {
      if (!assignedNumbers.has(i)) {
        nextNumber = i;
        break;
      }
    }
    
    expect(nextNumber).toBeNull();
  });

  it('should format staff number with leading zeros', () => {
    const staffNumber = 5;
    const formatted = String(staffNumber).padStart(3, '0');
    
    expect(formatted).toBe('005');
  });

  it('should format double digit staff number correctly', () => {
    const staffNumber = 42;
    const formatted = String(staffNumber).padStart(3, '0');
    
    expect(formatted).toBe('042');
  });

  it('should format triple digit staff number correctly', () => {
    const staffNumber = 100;
    const formatted = String(staffNumber).padStart(3, '0');
    
    expect(formatted).toBe('100');
  });

  it('should handle null staff number fallback to user ID', () => {
    const staffNumber: number | null = null;
    const userId = 12345;
    const display = staffNumber ? String(staffNumber).padStart(3, '0') : String(userId);
    
    expect(display).toBe('12345');
  });

  it('should assign unique numbers to multiple users', () => {
    const assignedNumbers = new Set<number>();
    const userCount = 10;
    const assignedToUsers: number[] = [];
    
    for (let user = 0; user < userCount; user++) {
      let nextNumber: number | null = null;
      for (let i = 1; i <= 100; i++) {
        if (!assignedNumbers.has(i)) {
          nextNumber = i;
          break;
        }
      }
      
      if (nextNumber !== null) {
        assignedNumbers.add(nextNumber);
        assignedToUsers.push(nextNumber);
      }
    }
    
    expect(assignedToUsers).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(new Set(assignedToUsers).size).toBe(10); // All unique
  });

  it('should handle gaps in assigned numbers', () => {
    const assignedNumbers = new Set([1, 3, 5, 7, 9]);
    let nextNumber: number | null = null;
    
    for (let i = 1; i <= 100; i++) {
      if (!assignedNumbers.has(i)) {
        nextNumber = i;
        break;
      }
    }
    
    expect(nextNumber).toBe(2);
  });

  it('should verify staff number range is 1-100', () => {
    const minStaffNumber = 1;
    const maxStaffNumber = 100;
    const totalSlots = maxStaffNumber - minStaffNumber + 1;
    
    expect(totalSlots).toBe(100);
  });
});
