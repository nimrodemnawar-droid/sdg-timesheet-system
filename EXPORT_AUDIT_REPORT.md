# 🚨 CRITICAL: Timesheet Export Data Accuracy Audit Report

**Date:** May 18, 2026  
**Status:** ⚠️ CRITICAL ISSUES FOUND - Data Loss in Export  
**Impact:** Payroll & Compliance Risk - Missing 15+ fields in exported data

---

## Executive Summary

The timesheet export system is **NOT exporting all saved data**. The export procedure retrieves comprehensive data from the database but only exports a **subset of 9 columns**, losing critical information needed for payroll, compliance, and reporting.

**Data Loss Rate:** ~63% of available fields are missing from exports (15 out of 24 fields)

---

## 🔴 CRITICAL ISSUES IDENTIFIED

### Issue #1: Export Procedure Ignores Input Parameters
**Location:** `server/routers.ts` line 614  
**Problem:** The export mutation accepts `staffId`, `startDate`, and `endDate` parameters but **NEVER USES THEM**

```typescript
// ❌ WRONG - Parameters are accepted but ignored
timesheets: adminProcedure
  .input(z.object({ 
    format: z.enum(['pdf', 'csv', 'excel']).optional(), 
    staffId: z.number().optional(),           // ← IGNORED
    startDate: z.string().optional(),         // ← IGNORED
    endDate: z.string().optional()            // ← IGNORED
  }))
  .mutation(async ({ input }) => {
    const data = await db.getCompleteTimesheetData();  // ← No filters passed!
    // ...
  })
```

**Impact:** Users cannot export data for specific staff members or date ranges. Always exports ALL data.

---

### Issue #2: Missing Fields in Export (15 fields lost)

**Database has 24 important fields:**
1. ✅ Staff Number
2. ✅ Date
3. ✅ Staff Name
4. ✅ Check-in Time
5. ✅ Check-out Time
6. ✅ Hours Worked
7. ✅ Overtime Hours
8. ✅ Location (Check-in Address)
9. ✅ Remarks

**Missing from export (15 fields):**
10. ❌ Staff Email
11. ❌ Check-in Coordinates (Latitude, Longitude)
12. ❌ Check-out Coordinates (Latitude, Longitude)
13. ❌ Check-out Address
14. ❌ Work Modality (nairobi_office, homa_bay_office, field, remote)
15. ❌ Activity Category
16. ❌ SDG Goal
17. ❌ KPI (Linked Output)
18. ❌ Task Description
19. ❌ Program/Department
20. ❌ Distance Traveled
21. ❌ AM Start Time
22. ❌ AM End Time
23. ❌ PM Start Time
24. ❌ PM End Time
25. ❌ Evidence Upload Key (S3 reference)
26. ❌ Submission Status
27. ❌ Submission Timestamp

---

### Issue #3: Hardcoded Export Data Transformation

**Location:** `server/routers.ts` lines 616-621  
**Problem:** Export data is artificially modified with hardcoded values instead of using actual data

```typescript
// ❌ WRONG - Hardcoding data instead of using actual values
const transformedData = data.map((item: any) => ({
  ...item,
  overtimeHours: 0,                    // ← Always 0, not calculated!
  location: item.checkInAddress || '', // ← Only check-in, no check-out
  remarks: '',                         // ← Always empty, not using staffRemarks!
}));
```

**Impact:** 
- Overtime hours are always 0 (even when staff worked >8 hours)
- Remarks are always empty (staff feedback is lost)
- Location data is incomplete

---

### Issue #4: Wrong Format Handler for PDF

**Location:** `server/routers.ts` lines 626-628  
**Problem:** PDF export is using CSV content generator instead of proper PDF formatter

```typescript
// ❌ WRONG - PDF format returns CSV content
} else if (format === 'pdf') {
  const content = generateCSVContent(transformedData);  // ← Should be PDF!
  return { success: true, content, filename: `timesheets_${new Date().toISOString()}.pdf` };
}
```

**Impact:** Users downloading "PDF" files actually get CSV-formatted text, not proper PDF documents.

---

## 📊 Data Mapping Comparison

### What's Being Exported (9 fields):
```
Staff # | Date | Staff Name | Check-in | Check-out | Hours Worked | Overtime | Location | Remarks
```

### What SHOULD Be Exported (24 fields):
```
Staff # | Staff Name | Staff Email | Date | 
Check-in Time | Check-in Coordinates | Check-in Address |
Check-out Time | Check-out Coordinates | Check-out Address |
Hours Worked | Overtime Hours | Distance Traveled |
Work Modality | Activity Category | SDG Goal | KPI | Task Description |
AM Start | AM End | PM Start | PM End |
Program | Evidence Upload Key | Submission Status | Submitted At
```

---

## 🔍 Database Query Analysis

### What `getCompleteTimesheetData()` Returns (24 fields):
✅ All necessary data is being queried from database:
- Staff information (name, email, number)
- Check-in/out times and coordinates
- Work modality, activity, SDG, KPI
- Task descriptions and remarks
- AM/PM session times
- Evidence uploads
- Submission metadata

### What Export Functions Use (9 fields):
❌ Only 9 fields are included in CSV/Excel headers:
```typescript
const headers = ["Staff #", "Date", "Staff Name", "Check-in", "Check-out", 
                 "Hours Worked", "Overtime", "Location", "Remarks"];
```

**Result:** 15 fields queried from database are **completely discarded** during export.

---

## 🛠️ Required Fixes

### Fix #1: Pass Filter Parameters to getCompleteTimesheetData()
```typescript
// ✅ CORRECT
const data = await db.getCompleteTimesheetData({
  staffId: input.staffId,
  startDate: input.startDate ? new Date(input.startDate) : undefined,
  endDate: input.endDate ? new Date(input.endDate) : undefined,
});
```

### Fix #2: Remove Hardcoded Data Transformation
```typescript
// ✅ CORRECT - Use actual data from database
const transformedData = data.map((item: any) => ({
  staffNumber: item.staffNumber,
  staffName: item.staffName,
  staffEmail: item.staffEmail,
  date: item.date,
  checkInTime: item.checkInTime,
  checkInCoordinates: item.checkInCoordinates,
  checkInAddress: item.checkInAddress,
  checkOutTime: item.checkOutTime,
  checkOutCoordinates: item.checkOutCoordinates,
  checkOutAddress: item.checkOutAddress,
  hoursWorked: item.hoursWorked,
  overtimeHours: item.overtimeHours,  // ← Use actual calculated value
  distanceTraveled: item.distanceTraveled,
  workModality: item.workModality,
  activityCategory: item.activityCategory,
  sdgGoal: item.sdgGoal,
  kpi: item.kpi,
  taskDescription: item.taskDescription,
  staffRemarks: item.staffRemarks,    // ← Use actual remarks
  amStartTime: item.amStartTime,
  amEndTime: item.amEndTime,
  pmStartTime: item.pmStartTime,
  pmEndTime: item.pmEndTime,
  program: item.program,
  evidenceUploadKey: item.evidenceUploadKey,
  isSubmitted: item.isSubmitted,
  submittedAt: item.submittedAt,
}));
```

### Fix #3: Expand Export Headers
```typescript
// ✅ CORRECT - Include all fields
const headers = [
  "Staff #", "Staff Name", "Staff Email", "Date",
  "Check-in Time", "Check-in Coordinates", "Check-in Address",
  "Check-out Time", "Check-out Coordinates", "Check-out Address",
  "Hours Worked", "Overtime Hours", "Distance Traveled",
  "Work Modality", "Activity Category", "SDG Goal", "KPI",
  "Task Description", "Staff Remarks",
  "AM Start", "AM End", "PM Start", "PM End",
  "Program", "Evidence Upload Key", "Submission Status", "Submitted At"
];
```

### Fix #4: Implement Proper PDF Export
Replace CSV-to-PDF hack with actual PDF generation using `generatePDFContent()` function.

---

## 📋 Verification Checklist

- [ ] Export parameters (staffId, startDate, endDate) are passed to database query
- [ ] All 24 fields are included in export headers
- [ ] Overtime hours are calculated from actual data, not hardcoded to 0
- [ ] Staff remarks are exported, not replaced with empty strings
- [ ] PDF format generates actual PDF documents, not CSV text
- [ ] Excel format includes all columns with proper formatting
- [ ] CSV format includes all fields with proper escaping
- [ ] Date filtering works correctly (respects startDate and endDate)
- [ ] Staff filtering works correctly (respects staffId parameter)
- [ ] Exported data matches database records exactly
- [ ] Test export with sample data and verify all fields are present

---

## 🎯 Impact Assessment

| Aspect | Current State | Impact | Severity |
|--------|---------------|--------|----------|
| **Payroll Accuracy** | Missing hours calculation | Cannot verify overtime pay | 🔴 CRITICAL |
| **Compliance** | Missing GPS coordinates | Cannot verify field work | 🔴 CRITICAL |
| **Reporting** | Missing KPIs and SDG data | Cannot track SDG progress | 🔴 CRITICAL |
| **Audit Trail** | Missing submission timestamps | Cannot verify data integrity | 🔴 CRITICAL |
| **Staff Feedback** | Missing remarks | Cannot capture notes | 🟠 HIGH |
| **Evidence** | Missing upload references | Cannot link supporting docs | 🟠 HIGH |

---

## Next Steps

1. **Immediate:** Fix export procedure to pass filter parameters
2. **High Priority:** Expand export headers to include all 24 fields
3. **High Priority:** Remove hardcoded data transformations
4. **High Priority:** Implement proper PDF generation
5. **Testing:** Create comprehensive export accuracy tests
6. **Verification:** Compare exported data against database records
7. **Deployment:** Update and test all export formats (CSV, Excel, PDF)

---

**Generated:** 2026-05-18  
**Audit Status:** INCOMPLETE - Fixes Required Before Production Use
