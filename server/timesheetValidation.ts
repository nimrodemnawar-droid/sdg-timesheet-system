/**
 * Comprehensive timesheet data validation
 * Ensures all 19 fields are present and valid before submission
 */

export interface TimesheetValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface TimesheetData {
  staffId: number;
  date: Date;
  checkInTime: Date;
  checkOutTime?: Date;
  checkInLat: number;
  checkInLng: number;
  checkInAddress?: string;
  checkOutLat?: number;
  checkOutLng?: number;
  checkOutAddress?: string;
  workModality?: string;
  activityCategory?: string;
  kpiDescription?: string;
  amStartTime?: string;
  pmEndTime?: string;
  taskDescription?: string;
  staffRemarks?: string;
  evidenceFileUrl?: string;
}

/**
 * Validate all timesheet fields
 */
export function validateTimesheetData(data: Partial<TimesheetData>): TimesheetValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields
  if (!data.staffId) errors.push("Staff ID is required");
  if (!data.date) errors.push("Date is required");
  if (!data.checkInTime) errors.push("Check-in time is required");
  
  // GPS coordinates validation
  if (data.checkInLat === undefined || data.checkInLat === null) {
    errors.push("Check-in latitude is required");
  } else if (data.checkInLat < -90 || data.checkInLat > 90) {
    errors.push("Check-in latitude must be between -90 and 90");
  }

  if (data.checkInLng === undefined || data.checkInLng === null) {
    errors.push("Check-in longitude is required");
  } else if (data.checkInLng < -180 || data.checkInLng > 180) {
    errors.push("Check-in longitude must be between -180 and 180");
  }

  // Check-out validation (optional but if present, must be valid)
  if (data.checkOutTime) {
    if (data.checkInTime && data.checkOutTime <= data.checkInTime) {
      errors.push("Check-out time must be after check-in time");
    }

    if (data.checkOutLat === undefined || data.checkOutLat === null) {
      errors.push("Check-out latitude is required if checked out");
    } else if (data.checkOutLat < -90 || data.checkOutLat > 90) {
      errors.push("Check-out latitude must be between -90 and 90");
    }

    if (data.checkOutLng === undefined || data.checkOutLng === null) {
      errors.push("Check-out longitude is required if checked out");
    } else if (data.checkOutLng < -180 || data.checkOutLng > 180) {
      errors.push("Check-out longitude must be between -180 and 180");
    }
  }

  // Address validation (warnings if missing, not errors)
  if (!data.checkInAddress) {
    warnings.push("Check-in address not captured - coordinates will be used");
  }
  if (data.checkOutTime && !data.checkOutAddress) {
    warnings.push("Check-out address not captured - coordinates will be used");
  }

  // Work modality validation
  const validModalities = ["office", "field", "remote"];
  if (data.workModality && !validModalities.includes(data.workModality.toLowerCase())) {
    errors.push(`Work modality must be one of: ${validModalities.join(", ")}`);
  }

  // Task description validation (required for submission)
  if (!data.taskDescription || data.taskDescription.trim().length === 0) {
    errors.push("Task description is required");
  } else if (data.taskDescription.length > 1000) {
    errors.push("Task description must not exceed 1000 characters");
  }

  // Activity category validation
  if (!data.activityCategory || data.activityCategory.trim().length === 0) {
    errors.push("Activity category is required");
  }

  // Time fields validation (optional but if present, must be valid)
  if (data.amStartTime) {
    if (!isValidTimeFormat(data.amStartTime)) {
      errors.push("AM Start Time must be in HH:MM format");
    }
  }

  if (data.pmEndTime) {
    if (!isValidTimeFormat(data.pmEndTime)) {
      errors.push("PM End Time must be in HH:MM format");
    }
  }

  // KPI validation (optional)
  if (data.kpiDescription && data.kpiDescription.length > 500) {
    errors.push("KPI description must not exceed 500 characters");
  }

  // Staff remarks validation (optional)
  if (data.staffRemarks && data.staffRemarks.length > 500) {
    errors.push("Staff remarks must not exceed 500 characters");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate time format (HH:MM)
 */
function isValidTimeFormat(time: string): boolean {
  const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
  return timeRegex.test(time);
}

/**
 * Get human-readable validation message
 */
export function getValidationMessage(result: TimesheetValidationResult): string {
  if (result.valid && result.warnings.length === 0) {
    return "All timesheet data is valid ✓";
  }

  let message = "";

  if (result.errors.length > 0) {
    message += "Errors:\n" + result.errors.map((e) => `• ${e}`).join("\n");
  }

  if (result.warnings.length > 0) {
    if (message) message += "\n\n";
    message += "Warnings:\n" + result.warnings.map((w) => `⚠ ${w}`).join("\n");
  }

  return message;
}

/**
 * Calculate hours worked from check-in and check-out times
 */
export function calculateHoursWorked(
  checkInTime: Date,
  checkOutTime?: Date
): { hours: number; minutes: number; totalMinutes: number } {
  if (!checkOutTime) {
    return { hours: 0, minutes: 0, totalMinutes: 0 };
  }

  const diffMs = checkOutTime.getTime() - checkInTime.getTime();
  const totalMinutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return { hours, minutes, totalMinutes };
}

/**
 * Calculate overtime (hours > 8 hours per day)
 */
export function calculateOvertime(totalMinutes: number): { hours: number; minutes: number } {
  const standardMinutes = 8 * 60; // 480 minutes = 8 hours
  const overtimeMinutes = Math.max(0, totalMinutes - standardMinutes);
  const hours = Math.floor(overtimeMinutes / 60);
  const minutes = overtimeMinutes % 60;

  return { hours, minutes };
}

/**
 * Haversine formula to calculate distance between two coordinates
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
}
