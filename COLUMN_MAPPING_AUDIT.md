# Timesheet Column Mapping Audit

## Attendance Table Schema (42 columns total)

### Core Identification (3 columns)
| Column | Type | Purpose | Validation |
|--------|------|---------|-----------|
| `id` | INT (PK) | Unique record identifier | Auto-increment |
| `userId` | INT (FK) | Link to users table | Must exist in users |
| `dailyStaffNumber` | VARCHAR(3) | Staff number for the day | 001-100 format |

### GPS Check-in Data (6 columns)
| Column | Type | Purpose | Validation |
|--------|------|---------|-----------|
| `checkInTime` | TIMESTAMP | When staff checked in | NOT NULL, before checkOutTime |
| `checkInLat` | DECIMAL(11,8) | Check-in latitude | -90 to 90, 8 decimals |
| `checkInLng` | DECIMAL(11,8) | Check-in longitude | -180 to 180, 8 decimals |
| `checkInAddress` | TEXT | Address from GPS | Can be NULL |
| `checkInAccuracy` | DECIMAL(6,2) | GPS accuracy in meters | 0-9999.99 |
| `checkInCoordinates` | Derived | Format: "lat,lng" | Computed from lat/lng |

### GPS Check-out Data (6 columns)
| Column | Type | Purpose | Validation |
|--------|------|---------|-----------|
| `checkOutTime` | TIMESTAMP | When staff checked out | Can be NULL, after checkInTime |
| `checkOutLat` | DECIMAL(11,8) | Check-out latitude | -90 to 90, 8 decimals |
| `checkOutLng` | DECIMAL(11,8) | Check-out longitude | -180 to 180, 8 decimals |
| `checkOutAddress` | TEXT | Address from GPS | Can be NULL |
| `checkOutAccuracy` | DECIMAL(6,2) | GPS accuracy in meters | 0-9999.99 |
| `checkOutCoordinates` | Derived | Format: "lat,lng" | Computed from lat/lng |

### Duration & Distance (3 columns)
| Column | Type | Purpose | Validation |
|--------|------|---------|-----------|
| `durationMinutes` | INT | Total work minutes | Calculated: (checkOutTime - checkInTime) / 60 |
| `overtimeMinutes` | INT | Overtime minutes | Calculated: MAX(0, durationMinutes - 480) |
| `distanceTraveled` | DECIMAL(10,3) | Distance in km | From waypoints cumulative distance |

### Timesheet Session Times (4 columns)
| Column | Type | Purpose | Validation |
|--------|------|---------|-----------|
| `amStartTime` | DATETIME | AM session start | Can be NULL |
| `amEndTime` | DATETIME | AM session end | Must be after amStartTime if both set |
| `pmStartTime` | DATETIME | PM session start | Can be NULL |
| `pmEndTime` | DATETIME | PM session end | Must be after pmStartTime if both set |

### Work Details (6 columns)
| Column | Type | Purpose | Validation |
|--------|------|---------|-----------|
| `workModality` | ENUM | Work location type | Values: nairobi_office, homa_bay_office, field, remote |
| `activityCategoryId` | INT (FK) | Activity type | Must exist in activityCategories |
| `sdgGoalId` | INT (FK) | SDG goal link | Must exist in sdgGoals (1-17) |
| `program` | VARCHAR(255) | Program/Department | Free text, max 255 chars |
| `kpiId` | INT (FK) | KPI link | Must exist in kpis |
| `taskDescription` | TEXT | Task details | Free text |

### Evidence & Remarks (2 columns)
| Column | Type | Purpose | Validation |
|--------|------|---------|-----------|
| `evidenceUploadKey` | TEXT | S3 file key for evidence | Can be NULL |
| `staffRemarks` | TEXT | Staff comments | Free text |

### Submission & Approval (6 columns)
| Column | Type | Purpose | Validation |
|--------|------|---------|-----------|
| `isSubmitted` | BOOLEAN | Submission status | Default: false |
| `submittedAt` | TIMESTAMP | Submission timestamp | Must be after createdAt |
| `isApproved` | BOOLEAN | Approval status | Default: false |
| `approvedBy` | INT (FK) | Approver user ID | Must exist in users if set |
| `approvedAt` | TIMESTAMP | Approval timestamp | Must be after submittedAt |
| `hasCheckedInToday` | BOOLEAN | Daily check-in flag | Default: false |
| `hasCheckedOutToday` | BOOLEAN | Daily check-out flag | Default: false |

### System Timestamps (2 columns)
| Column | Type | Purpose | Validation |
|--------|------|---------|-----------|
| `createdAt` | TIMESTAMP | Record creation time | Auto-set, NOT NULL |
| `updatedAt` | TIMESTAMP | Last update time | Auto-updated on changes |

---

## Data Type Compliance Checklist

- [ ] All DECIMAL coordinates use 8-decimal precision (±0.00000001 degrees ≈ 1.1mm)
- [ ] All distances use 3-decimal precision (±0.001 km = 1 meter)
- [ ] All timestamps are in UTC
- [ ] Foreign keys reference correct tables
- [ ] ENUM values match allowed options exactly
- [ ] VARCHAR fields don't exceed specified lengths
- [ ] Boolean fields default to false
- [ ] Nullable fields are properly marked

---

## Common Data Mapping Errors to Prevent

### ❌ ERROR: Storing coordinates as single field
```sql
-- WRONG: Storing as "lat,lng" string
INSERT INTO attendance (checkInCoordinates) VALUES ('-1.2921,36.8219');

-- CORRECT: Store as separate columns
INSERT INTO attendance (checkInLat, checkInLng) VALUES (-1.2921, 36.8219);
```

### ❌ ERROR: Using wrong data type for GPS
```sql
-- WRONG: Using FLOAT (7 decimal places)
ALTER TABLE attendance ADD COLUMN checkInLat FLOAT;

-- CORRECT: Using DECIMAL with 8 decimals
ALTER TABLE attendance ADD COLUMN checkInLat DECIMAL(11,8);
```

### ❌ ERROR: Storing duration as string
```sql
-- WRONG: Storing "9 hours 30 minutes"
INSERT INTO attendance (durationMinutes) VALUES ('9:30');

-- CORRECT: Store as integer minutes
INSERT INTO attendance (durationMinutes) VALUES (570);
```

### ❌ ERROR: Mixing timezones
```sql
-- WRONG: Storing local time without timezone
INSERT INTO attendance (checkInTime) VALUES ('2026-05-23 14:30:00');

-- CORRECT: Store UTC time
INSERT INTO attendance (checkInTime) VALUES ('2026-05-23 11:30:00+00:00');
```

### ❌ ERROR: Foreign key mismatch
```sql
-- WRONG: Using category name instead of ID
INSERT INTO attendance (activityCategoryId) VALUES ('Program Implementation');

-- CORRECT: Use actual ID from activityCategories table
INSERT INTO attendance (activityCategoryId) VALUES (5);
```

---

## Validation Rules by Column

### GPS Coordinates
- Latitude: -90 to 90 degrees
- Longitude: -180 to 180 degrees
- Precision: 8 decimals (±1.1mm accuracy)
- Both required for check-in, optional for check-out

### Time Fields
- checkInTime: Required, must be timestamp
- checkOutTime: Optional, must be >= checkInTime
- amStartTime/amEndTime: Optional, amEnd >= amStart
- pmStartTime/pmEndTime: Optional, pmEnd >= pmStart

### Duration Calculations
- durationMinutes = (checkOutTime - checkInTime) in minutes
- overtimeMinutes = MAX(0, durationMinutes - 480)
- 480 minutes = 8 hours standard work day

### Foreign Keys
- userId: Must exist in users table
- activityCategoryId: Must exist in activityCategories
- sdgGoalId: Must exist in sdgGoals
- kpiId: Must exist in kpis
- approvedBy: Must exist in users if not NULL

