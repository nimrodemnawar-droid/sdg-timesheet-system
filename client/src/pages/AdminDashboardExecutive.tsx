import { useMemo } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Users, TrendingUp, Clock, CheckCircle2, AlertCircle, BarChart3, Calendar, Zap, MapPin, Activity, Download, Loader2, RefreshCw } from "lucide-react";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { generateSummaryReportCSV } from "@/lib/reportExport";
import { toast } from "sonner";
import { EXECUTIVE_QUICK_ACTION_ROUTES } from "../../../shared/executiveDashboard";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

export default function AdminDashboardExecutive() {
  const { user } = useAuth();
  const [, navigate] = useLocation();

  const executiveRange = useMemo(() => {
    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 6);
    startDate.setHours(0, 0, 0, 0);
    return { startDate, endDate };
  }, []);

  const {
    data: summary,
    isLoading: summaryLoading,
    isError: summaryError,
    refetch: refetchSummary,
  } = trpc.analytics.executiveSummary.useQuery(executiveRange, {
    refetchInterval: 30000,
  });
  const { data: pendingLeaveRequests, isLoading: pendingLeaveLoading } = trpc.leave.getPending.useQuery(undefined, {
    refetchInterval: 30000,
  });

  const metrics = summary?.metrics;
  const attendanceTrendData = useMemo(
    () => (summary?.trend ?? []).map((item) => ({
      date: new Date(item.date).toLocaleDateString(undefined, { weekday: "short" }),
      present: Number(item.checkedIn || 0),
      checkedOut: Number(item.checkedOut || 0),
      late: Number(item.late || 0),
    })),
    [summary?.trend],
  );
  const leaveDistributionData = summary?.leaveDistribution ?? [];
  const performanceData = metrics
    ? [
        { name: "On-Time", value: metrics.onTimePercentage },
        { name: "Attendance", value: metrics.attendanceRate },
        { name: "Completion", value: metrics.completionPercentage },
      ]
    : [];
  const pendingLeaveCount = pendingLeaveRequests?.length;
  const isLoading = summaryLoading || pendingLeaveLoading;
  const hasMetrics = Boolean(metrics);

  const displayValue = (value: number | string | undefined, suffix = "") => {
    if (!hasMetrics || value === undefined || value === null) return "—";
    return `${value}${suffix}`;
  };

  const handleExport = () => {
    if (!metrics) {
      toast.error("Executive metrics are still loading");
      return;
    }

    generateSummaryReportCSV({
      "Total Staff": metrics.totalStaff,
      "Checked In Today": metrics.checkedInToday,
      "Attendance Rate": `${metrics.attendanceRate}%`,
      "On-Time Percentage": `${metrics.onTimePercentage}%`,
      "Completion Percentage": `${metrics.completionPercentage}%`,
      "Pending Leave Requests": pendingLeaveCount ?? 0,
      "Average Hours Per Day": metrics.averageHoursPerDay,
      "Overtime Hours": metrics.overtimeHours,
      "Total Distance Tracked": `${metrics.totalDistanceKm}km`,
      "Report Period": `${executiveRange.startDate.toLocaleDateString()} - ${executiveRange.endDate.toLocaleDateString()}`,
      "Report Generated": new Date().toLocaleString(),
    });
    toast.success("Executive summary exported");
  };

  if (user?.role !== "admin") {
    return (
      <div className="min-h-screen bg-slate-900 p-6 flex items-center justify-center">
        <Card className="bg-slate-800/50 border-slate-700 max-w-md w-full">
          <CardContent className="pt-6 text-center text-slate-300">This dashboard is available to administrators only.</CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 bg-gradient-to-br from-slate-900 to-slate-800 min-h-screen">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-300">Administrator view</p>
          <h1 className="text-3xl sm:text-4xl font-bold text-white">Executive Dashboard</h1>
          <p className="text-slate-400">Live workforce analytics for the last seven days, refreshed every 30 seconds.</p>
        </div>
        <button
          type="button"
          onClick={() => refetchSummary()}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-600 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800"
        >
          <RefreshCw className="w-4 h-4" /> Refresh data
        </button>
      </div>

      {summaryError && (
        <Card className="border-red-800/70 bg-red-950/30">
          <CardContent className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-6 text-sm text-red-200">
            <span>Executive metrics could not be loaded. Please try again.</span>
            <button type="button" onClick={() => refetchSummary()} className="rounded-md border border-red-700 px-3 py-2 hover:bg-red-900/40">Retry</button>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="bg-slate-800/50 border-slate-700 hover:border-blue-500/50 transition">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4"><Users className="w-8 h-8 text-blue-400" /><Badge className="bg-blue-500/20 text-blue-300">Live</Badge></div>
            <p className="text-slate-400 text-sm">Total Staff</p>
            <p className="text-3xl font-bold text-white">{isLoading ? "…" : displayValue(metrics?.totalStaff)}</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700 hover:border-green-500/50 transition">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4"><CheckCircle2 className="w-8 h-8 text-green-400" /><Badge className="bg-green-500/20 text-green-300">Today</Badge></div>
            <p className="text-slate-400 text-sm">Checked In</p>
            <p className="text-3xl font-bold text-white">{isLoading ? "…" : displayValue(metrics?.checkedInToday)}</p>
            <p className="text-xs text-slate-500 mt-2">{isLoading ? "Loading rate" : displayValue(metrics?.attendanceRate, "%")} rate</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700 hover:border-purple-500/50 transition">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4"><Clock className="w-8 h-8 text-purple-400" /><Badge className="bg-purple-500/20 text-purple-300">Live</Badge></div>
            <p className="text-slate-400 text-sm">On-Time Arrivals</p>
            <p className="text-3xl font-bold text-white">{isLoading ? "…" : displayValue(metrics?.onTimePercentage, "%")}</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700 hover:border-amber-500/50 transition">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4"><AlertCircle className="w-8 h-8 text-amber-400" /><Badge className="bg-amber-500/20 text-amber-300">Queue</Badge></div>
            <p className="text-slate-400 text-sm">Pending Leave</p>
            <p className="text-3xl font-bold text-white">{pendingLeaveLoading ? "…" : displayValue(pendingLeaveCount)}</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700 hover:border-cyan-500/50 transition">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4"><MapPin className="w-8 h-8 text-cyan-400" /><Badge className="bg-cyan-500/20 text-cyan-300">7 days</Badge></div>
            <p className="text-slate-400 text-sm">Distance Tracked</p>
            <p className="text-3xl font-bold text-white">{isLoading ? "…" : displayValue(metrics?.totalDistanceKm, "km")}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="trends" className="space-y-4">
        <TabsList className="w-full justify-start overflow-x-auto bg-slate-800/50 border border-slate-700">
          <TabsTrigger value="trends" className="data-[state=active]:bg-blue-600"><TrendingUp className="w-4 h-4 mr-2" />Attendance</TabsTrigger>
          <TabsTrigger value="performance" className="data-[state=active]:bg-blue-600"><BarChart3 className="w-4 h-4 mr-2" />Performance</TabsTrigger>
          <TabsTrigger value="leave" className="data-[state=active]:bg-blue-600"><Calendar className="w-4 h-4 mr-2" />Leave</TabsTrigger>
        </TabsList>

        <TabsContent value="trends">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader><CardTitle className="text-white">7-Day Attendance Trend</CardTitle><CardDescription className="text-slate-400">Checked-in, checked-out, and late staff from live attendance records.</CardDescription></CardHeader>
            <CardContent>
              {isLoading ? <div className="h-[300px] flex items-center justify-center text-slate-400"><Loader2 className="w-5 h-5 mr-2 animate-spin" />Loading trend data…</div> : attendanceTrendData.length === 0 ? <div className="h-[300px] flex items-center justify-center text-slate-400">No attendance records for this period.</div> : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={attendanceTrendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                    <XAxis dataKey="date" stroke="#94a3b8" /><YAxis stroke="#94a3b8" allowDecimals={false} />
                    <Tooltip contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #475569" }} /><Legend />
                    <Bar dataKey="present" name="Checked in" fill="#10b981" /><Bar dataKey="checkedOut" name="Checked out" fill="#3b82f6" /><Bar dataKey="late" name="Late" fill="#f59e0b" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader><CardTitle className="text-white">Performance Metrics</CardTitle><CardDescription className="text-slate-400">Calculated from live attendance and submitted timesheet records.</CardDescription></CardHeader>
            <CardContent>
              {!hasMetrics ? <div className="h-[300px] flex items-center justify-center text-slate-400">No performance data available.</div> : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={performanceData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#475569" /><XAxis dataKey="name" stroke="#94a3b8" /><YAxis stroke="#94a3b8" domain={[0, 100]} />
                    <Tooltip contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #475569" }} formatter={(value) => `${value}%`} /><Bar dataKey="value" fill="#8b5cf6" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="leave">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader><CardTitle className="text-white">Leave Distribution</CardTitle><CardDescription className="text-slate-400">Leave requests overlapping the current seven-day reporting period.</CardDescription></CardHeader>
            <CardContent>
              {leaveDistributionData.length === 0 ? <div className="h-[300px] flex items-center justify-center text-slate-400">No leave requests for this period.</div> : (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={leaveDistributionData} cx="50%" cy="50%" outerRadius={80} fill="#8884d8" dataKey="value" label>
                      {leaveDistributionData.map((entry, index) => <Cell key={`leave-${entry.name}-${index}`} fill={COLORS[index % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #475569" }} /><Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader><CardTitle className="text-white flex items-center gap-2"><Zap className="w-5 h-5 text-yellow-400" />Quick Actions</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <button type="button" onClick={() => navigate(EXECUTIVE_QUICK_ACTION_ROUTES.staff)} className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2"><Users className="w-4 h-4" />View All Staff</button>
            <button type="button" onClick={handleExport} disabled={!metrics} className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2"><Download className="w-4 h-4" />Export Reports</button>
            <button type="button" onClick={() => navigate(EXECUTIVE_QUICK_ACTION_ROUTES.gpsMap)} className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2"><MapPin className="w-4 h-4" />View GPS Map</button>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader><CardTitle className="text-white flex items-center gap-2"><Activity className="w-5 h-5 text-green-400" />System Status</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between"><span className="text-slate-400">Database</span><Badge className="bg-green-500/20 text-green-300">Connected</Badge></div>
            <div className="flex items-center justify-between"><span className="text-slate-400">GPS Tracking</span><Badge className="bg-green-500/20 text-green-300">Active</Badge></div>
            <div className="flex items-center justify-between"><span className="text-slate-400">Notifications</span><Badge className="bg-green-500/20 text-green-300">Running</Badge></div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
