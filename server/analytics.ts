import { eq, gte, lte, sql } from "drizzle-orm";
import { getDb } from "./db";
import { attendance, users } from "../drizzle/schema";

export interface AttendanceMetrics {
  totalStaff: number;
  checkedInToday: number;
  averageHoursPerDay: number;
  overtimeHours: number;
  attendanceRate: number;
}

export interface OvertimeLeaderboard {
  userId: number;
  userName: string;
  totalOvertimeHours: number;
  overtimeDays: number;
}

export interface AttendanceTrend {
  date: string;
  checkedIn: number;
  checkedOut: number;
  averageHours: number;
}

export interface DepartmentMetrics {
  department: string;
  staffCount: number;
  averageAttendance: number;
  averageOvertimeHours: number;
}

export async function getAttendanceMetrics(
  startDate: Date,
  endDate: Date
): Promise<AttendanceMetrics> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const totalStaffResult = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(users);
  const totalStaff = totalStaffResult[0]?.count || 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrowStart = new Date(today);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);

  const checkedInTodayResult = await db
    .select({ count: sql<number>`COUNT(DISTINCT userId)` })
    .from(attendance)
    .where(
      sql`DATE(checkInTime) = DATE(NOW())`
    );
  const checkedInToday = checkedInTodayResult[0]?.count || 0;

  const hoursResult = await db
    .select({
      avgHours: sql<number>`AVG(CAST(${attendance.durationMinutes} AS DECIMAL(10,2)) / 60)`,
      totalOvertime: sql<number>`SUM(CASE WHEN CAST(${attendance.overtimeMinutes} AS DECIMAL(10,2)) > 0 THEN CAST(${attendance.overtimeMinutes} AS DECIMAL(10,2)) / 60 ELSE 0 END)`,
    })
    .from(attendance)
    .where(
      sql`checkInTime >= ${startDate} AND checkInTime <= ${endDate}`
    );

  const avgHours = hoursResult[0]?.avgHours || 0;
  const overtimeHours = hoursResult[0]?.totalOvertime || 0;

  const attendanceCountResult = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(attendance)
    .where(
      sql`checkInTime >= ${startDate} AND checkInTime <= ${endDate}`
    );
  const totalRecords = attendanceCountResult[0]?.count || 0;
  const attendanceRate = totalStaff > 0 ? (checkedInToday / totalStaff) * 100 : 0;

  return {
    totalStaff,
    checkedInToday,
    averageHoursPerDay: Math.round(avgHours * 100) / 100,
    overtimeHours: Math.round(overtimeHours * 100) / 100,
    attendanceRate: Math.round(attendanceRate * 100) / 100,
  };
}

export async function getOvertimeLeaderboard(
  startDate: Date,
  endDate: Date,
  limit: number = 10
): Promise<OvertimeLeaderboard[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select({
      userId: attendance.userId,
      userName: users.name,
      totalOvertimeHours: sql<number>`SUM(CASE WHEN ${attendance.overtimeMinutes} > 0 THEN CAST(${attendance.overtimeMinutes} AS DECIMAL(10,2)) / 60 ELSE 0 END)`.as('totalOvertimeHours'),
      overtimeDays: sql<number>`COUNT(CASE WHEN ${attendance.overtimeMinutes} > 0 THEN 1 END)`.as('overtimeDays'),
    })
    .from(attendance)
    .innerJoin(users, eq(attendance.userId, users.id))
    .where(
      sql`${attendance.checkInTime} >= ${startDate} AND ${attendance.checkInTime} <= ${endDate}`
    )
    .groupBy(attendance.userId, users.id, users.name)
    .orderBy(sql`totalOvertimeHours DESC`)
    .limit(limit);

  return result.map((r) => ({
    userId: r.userId,
    userName: r.userName || "Unknown",
    totalOvertimeHours: Math.round((r.totalOvertimeHours || 0) * 100) / 100,
    overtimeDays: r.overtimeDays || 0,
  }));
}

export async function getAttendanceTrend(
  startDate: Date,
  endDate: Date
): Promise<AttendanceTrend[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Use raw SQL for complex DATE grouping to avoid Drizzle ORM issues
  const result = await db.execute(
    sql`
      SELECT 
        DATE(checkInTime) as date,
        COUNT(DISTINCT CASE WHEN checkInTime IS NOT NULL THEN userId END) as checkedIn,
        COUNT(DISTINCT CASE WHEN checkOutTime IS NOT NULL THEN userId END) as checkedOut,
        AVG(CAST(durationMinutes AS DECIMAL(10,2)) / 60) as avgHours
      FROM attendance
      WHERE checkInTime >= ${startDate} AND checkInTime <= ${endDate}
      GROUP BY DATE(checkInTime)
      ORDER BY DATE(checkInTime)
    `
  );

  return (result as any[]).map((r: any) => ({
    date: r.date || new Date().toISOString().split("T")[0],
    checkedIn: r.checkedIn || 0,
    checkedOut: r.checkedOut || 0,
    averageHours: Math.round((r.avgHours || 0) * 100) / 100,
  }));
}

export async function getDepartmentMetrics(
  startDate: Date,
  endDate: Date
): Promise<DepartmentMetrics[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select({
      department: users.department,
      staffCount: sql<number>`COUNT(DISTINCT ${users.id})`.as('staffCount'),
      avgAttendance: sql<number>`COUNT(DISTINCT ${attendance.userId}) * 100.0 / COUNT(DISTINCT ${users.id})`.as('avgAttendance'),
      avgOvertimeHours: sql<number>`SUM(CASE WHEN ${attendance.overtimeMinutes} > 0 THEN CAST(${attendance.overtimeMinutes} AS DECIMAL(10,2)) / 60 ELSE 0 END) / COUNT(DISTINCT ${users.id})`.as('avgOvertimeHours'),
    })
    .from(users)
    .leftJoin(
      attendance,
      sql`${attendance.userId} = ${users.id} AND ${attendance.checkInTime} >= ${startDate} AND ${attendance.checkInTime} <= ${endDate}`
    )
    .groupBy(users.department);

  return result.map((r) => ({
    department: r.department || "Unassigned",
    staffCount: r.staffCount || 0,
    averageAttendance: Math.round((r.avgAttendance || 0) * 100) / 100,
    averageOvertimeHours: Math.round((r.avgOvertimeHours || 0) * 100) / 100,
  }));
}
