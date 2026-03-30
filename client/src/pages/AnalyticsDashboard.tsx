import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Calendar, TrendingUp, Users, Clock, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function AnalyticsDashboard() {
  const [startDate, setStartDate] = useState<string>(
    new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split("T")[0]
  );
  const [endDate, setEndDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );

  const startDateObj = new Date(startDate);
  const endDateObj = new Date(endDate);

  // Fetch analytics data
  const { data: metrics } = trpc.analytics.metrics.useQuery({
    startDate: startDateObj,
    endDate: endDateObj,
  });

  const { data: overtimeLeaderboard } = trpc.analytics.overtimeLeaderboard.useQuery({
    startDate: startDateObj,
    endDate: endDateObj,
    limit: 10,
  });

  const { data: attendanceTrend } = trpc.analytics.attendanceTrend.useQuery({
    startDate: startDateObj,
    endDate: endDateObj,
  });

  const { data: departmentMetrics } = trpc.analytics.departmentMetrics.useQuery({
    startDate: startDateObj,
    endDate: endDateObj,
  });

  const exportAttendanceMutation = trpc.analytics.exportAttendance.useMutation({
    onSuccess: () => {
      toast.success("Attendance report exported successfully");
    },
    onError: () => {
      toast.error("Failed to export attendance report");
    },
  });

  const handleExport = async (format: "csv" | "pdf") => {
    await exportAttendanceMutation.mutateAsync({
      startDate: startDateObj,
      endDate: endDateObj,
      format,
    });
  };

  const COLORS = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899"];

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
        <p className="text-muted-foreground mt-2">Attendance trends, overtime analysis, and performance metrics</p>
      </div>

      {/* Date Range Filter */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Date Range & Export
          </CardTitle>
        </CardHeader>
        <CardContent className="flex gap-4 flex-wrap items-end">
          <div className="flex-1">
            <Label htmlFor="startDate">Start Date</Label>
            <Input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="flex-1">
            <Label htmlFor="endDate">End Date</Label>
            <Input
              id="endDate"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => handleExport("csv")}
              disabled={exportAttendanceMutation.isPending}
              className="gap-2"
            >
              {exportAttendanceMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              CSV
            </Button>
            <Button
              size="sm"
              onClick={() => handleExport("pdf")}
              disabled={exportAttendanceMutation.isPending}
              className="gap-2"
            >
              {exportAttendanceMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              PDF
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Staff</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.totalStaff || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Active employees</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Checked In Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.checkedInToday || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {metrics?.attendanceRate.toFixed(1)}% attendance rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Hours/Day</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.averageHoursPerDay.toFixed(1)}h</div>
            <p className="text-xs text-muted-foreground mt-1">Average daily hours</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Overtime</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{metrics?.overtimeHours.toFixed(1)}h</div>
            <p className="text-xs text-muted-foreground mt-1">Period total</p>
          </CardContent>
        </Card>
      </div>

      {/* Attendance Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Attendance Trend
          </CardTitle>
          <CardDescription>Daily check-ins and average hours over time</CardDescription>
        </CardHeader>
        <CardContent>
          {attendanceTrend && attendanceTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={attendanceTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="checkedIn"
                  stroke="#3b82f6"
                  name="Check-ins"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="averageHours"
                  stroke="#10b981"
                  name="Avg Hours"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-300 flex items-center justify-center text-muted-foreground">
              No data available
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Overtime Leaderboard */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Overtime Leaderboard
            </CardTitle>
            <CardDescription>Top 10 staff by overtime hours</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {overtimeLeaderboard && overtimeLeaderboard.length > 0 ? (
                overtimeLeaderboard.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{item.userName}</p>
                        <p className="text-xs text-muted-foreground">{item.overtimeDays} days</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-orange-600">{item.totalOvertimeHours.toFixed(1)}h</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-sm">No overtime data</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Department Metrics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Department Metrics
            </CardTitle>
            <CardDescription>Performance by department</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {departmentMetrics && departmentMetrics.length > 0 ? (
                departmentMetrics.map((dept, index) => (
                  <div key={index} className="p-3 border rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-medium">{dept.department}</p>
                        <p className="text-xs text-muted-foreground">{dept.staffCount} staff</p>
                      </div>
                      <span className="text-sm font-semibold text-primary">
                        {dept.averageAttendance.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full"
                        style={{ width: `${Math.min(dept.averageAttendance, 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Avg Overtime: {dept.averageOvertimeHours.toFixed(1)}h
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-sm">No department data</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
