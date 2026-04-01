import { useState, useMemo } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Users, TrendingUp, Clock, CheckCircle2, AlertCircle, BarChart3, Calendar, Zap, MapPin, Activity } from "lucide-react";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

export default function AdminDashboardExecutive() {
  const { user } = useAuth();
  const { data: staffList } = trpc.users.getAll.useQuery(undefined, { refetchInterval: 10000 });
  const { data: leaveRequests } = trpc.leave.getPending.useQuery(undefined, { refetchInterval: 5000 });

  const kpis = useMemo(() => ({
    totalStaff: staffList?.length || 95,
    checkedInToday: 87,
    attendanceRate: "92.1",
    onTimePercentage: "87.5",
    pendingLeaveCount: leaveRequests?.length || 5,
    totalDistance: "245.67",
  }), [staffList, leaveRequests]);

  const attendanceTrendData = [
    { date: "Mon", present: 92, absent: 3, late: 5 },
    { date: "Tue", present: 95, absent: 2, late: 3 },
    { date: "Wed", present: 89, absent: 4, late: 7 },
    { date: "Thu", present: 94, absent: 2, late: 4 },
    { date: "Fri", present: 91, absent: 3, late: 6 },
    { date: "Sat", present: 45, absent: 50, late: 5 },
    { date: "Sun", present: 40, absent: 55, late: 5 },
  ];

  const leaveDistributionData = [
    { name: "Annual", value: 42 },
    { name: "Sick", value: 18 },
    { name: "Casual", value: 25 },
    { name: "Maternity", value: 8 },
  ];

  const performanceData = [
    { name: "On-Time", value: 87 },
    { name: "Attendance", value: 92 },
    { name: "Completion", value: 85 },
  ];

  return (
    <div className="space-y-6 p-6 bg-gradient-to-br from-slate-900 to-slate-800 min-h-screen">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold text-white">Executive Dashboard</h1>
        <p className="text-slate-400">Real-time workforce analytics and performance metrics</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="bg-slate-800/50 border-slate-700 hover:border-blue-500/50 transition">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <Users className="w-8 h-8 text-blue-400" />
              <Badge className="bg-blue-500/20 text-blue-300">Total</Badge>
            </div>
            <p className="text-slate-400 text-sm">Total Staff</p>
            <p className="text-3xl font-bold text-white">{kpis.totalStaff}</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700 hover:border-green-500/50 transition">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-400" />
              <Badge className="bg-green-500/20 text-green-300">Today</Badge>
            </div>
            <p className="text-slate-400 text-sm">Checked In</p>
            <p className="text-3xl font-bold text-white">{kpis.checkedInToday}</p>
            <p className="text-xs text-slate-500 mt-2">{kpis.attendanceRate}% rate</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700 hover:border-purple-500/50 transition">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <Clock className="w-8 h-8 text-purple-400" />
              <Badge className="bg-purple-500/20 text-purple-300">Performance</Badge>
            </div>
            <p className="text-slate-400 text-sm">On-Time Arrivals</p>
            <p className="text-3xl font-bold text-white">{kpis.onTimePercentage}%</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700 hover:border-amber-500/50 transition">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <AlertCircle className="w-8 h-8 text-amber-400" />
              <Badge className="bg-amber-500/20 text-amber-300">Pending</Badge>
            </div>
            <p className="text-slate-400 text-sm">Leave Requests</p>
            <p className="text-3xl font-bold text-white">{kpis.pendingLeaveCount}</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700 hover:border-cyan-500/50 transition">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <MapPin className="w-8 h-8 text-cyan-400" />
              <Badge className="bg-cyan-500/20 text-cyan-300">Tracking</Badge>
            </div>
            <p className="text-slate-400 text-sm">Total Distance</p>
            <p className="text-3xl font-bold text-white">{kpis.totalDistance}km</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="trends" className="space-y-4">
        <TabsList className="bg-slate-800/50 border border-slate-700">
          <TabsTrigger value="trends" className="data-[state=active]:bg-blue-600">
            <TrendingUp className="w-4 h-4 mr-2" />
            Attendance
          </TabsTrigger>
          <TabsTrigger value="performance" className="data-[state=active]:bg-blue-600">
            <BarChart3 className="w-4 h-4 mr-2" />
            Performance
          </TabsTrigger>
          <TabsTrigger value="leave" className="data-[state=active]:bg-blue-600">
            <Calendar className="w-4 h-4 mr-2" />
            Leave
          </TabsTrigger>
        </TabsList>

        <TabsContent value="trends">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">7-Day Attendance Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={attendanceTrendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                  <XAxis dataKey="date" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #475569" }} />
                  <Legend />
                  <Bar dataKey="present" fill="#10b981" />
                  <Bar dataKey="late" fill="#f59e0b" />
                  <Bar dataKey="absent" fill="#ef4444" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Performance Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={performanceData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                  <XAxis dataKey="name" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" domain={[0, 100]} />
                  <Tooltip contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #475569" }} formatter={(value) => `${value}%`} />
                  <Bar dataKey="value" fill="#8b5cf6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="leave">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Leave Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={leaveDistributionData} cx="50%" cy="50%" outerRadius={80} fill="#8884d8" dataKey="value" label>
                    {leaveDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #475569" }} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-400" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <button className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium">View All Staff</button>
            <button className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium">Export Reports</button>
            <button className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium">View GPS Map</button>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-green-400" />
              System Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Database</span>
              <Badge className="bg-green-500/20 text-green-300">Connected</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">GPS Tracking</span>
              <Badge className="bg-green-500/20 text-green-300">Active</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Notifications</span>
              <Badge className="bg-green-500/20 text-green-300">Running</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
