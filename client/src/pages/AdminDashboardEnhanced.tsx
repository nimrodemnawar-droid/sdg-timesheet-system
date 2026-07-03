import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users,
  Clock,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Activity,
  Shield,
  BarChart3,
  Zap,
  Target,
  Award,
} from "lucide-react";

export default function AdminDashboardEnhanced() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  // Queries
  const { data: stats } = trpc.attendance.getTodayAllStaff.useQuery(undefined, {
    refetchInterval: 1000,
  }) as any;
  const { data: staffList } = trpc.users.getAll.useQuery(undefined, {
    refetchInterval: 2000,
  });
  const { data: analyticsMetrics } = trpc.analytics.metrics.useQuery({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    endDate: new Date(),
  }, {
    refetchInterval: 30000,
  }) as any;
  const { data: attendanceRecords } = trpc.attendance.getTodayAllStaff.useQuery(undefined, {
    refetchInterval: 1000,
  });

  const pendingRequests = [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Premium Header */}
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg shadow-lg">
              <Shield className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-400 via-emerald-400 to-blue-400 bg-clip-text text-transparent">
                Admin Dashboard
              </h1>
              <p className="text-slate-400 mt-1">Welcome back, {user?.name}</p>
            </div>
          </div>
        </div>

        {/* Enhanced KPI Cards with 3D Effects */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total Staff Card */}
          <div
            className="group relative"
            onMouseEnter={() => setHoveredCard("staff")}
            onMouseLeave={() => setHoveredCard(null)}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-blue-800 rounded-xl blur-lg opacity-0 group-hover:opacity-75 transition duration-500" />
            <Card className="relative bg-gradient-to-br from-blue-900/50 to-blue-950/50 border-blue-500/30 backdrop-blur-xl hover:border-blue-400/60 transition-all duration-300 transform group-hover:scale-105 group-hover:-translate-y-1 shadow-2xl">
              <CardContent className="pt-8 pb-6">
                <div className="flex items-start justify-between mb-6">
                  <div className="p-3 bg-blue-500/20 rounded-lg group-hover:bg-blue-500/40 transition">
                    <Users className="w-6 h-6 text-blue-300" />
                  </div>
                  <TrendingUp className="w-5 h-5 text-blue-400/50 group-hover:text-blue-300 transition" />
                </div>
                <p className="text-blue-300 text-sm font-medium mb-2">Total Staff</p>
                <p className="text-5xl font-bold text-blue-100 mb-1">{staffList?.length || 0}</p>
                <p className="text-xs text-blue-400/70">Active members</p>
              </CardContent>
            </Card>
          </div>

          {/* Present Today Card */}
          <div
            className="group relative"
            onMouseEnter={() => setHoveredCard("present")}
            onMouseLeave={() => setHoveredCard(null)}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-emerald-800 rounded-xl blur-lg opacity-0 group-hover:opacity-75 transition duration-500" />
            <Card className="relative bg-gradient-to-br from-emerald-900/50 to-emerald-950/50 border-emerald-500/30 backdrop-blur-xl hover:border-emerald-400/60 transition-all duration-300 transform group-hover:scale-105 group-hover:-translate-y-1 shadow-2xl">
              <CardContent className="pt-8 pb-6">
                <div className="flex items-start justify-between mb-6">
                  <div className="p-3 bg-emerald-500/20 rounded-lg group-hover:bg-emerald-500/40 transition">
                    <CheckCircle className="w-6 h-6 text-emerald-300" />
                  </div>
                  <Zap className="w-5 h-5 text-emerald-400/50 group-hover:text-emerald-300 transition" />
                </div>
                <p className="text-emerald-300 text-sm font-medium mb-2">Present Today</p>
                <p className="text-5xl font-bold text-emerald-100 mb-1">{stats?.checkedInCount || 0}</p>
                <p className="text-xs text-emerald-400/70">Checked in</p>
              </CardContent>
            </Card>
          </div>

          {/* Avg Hours Card */}
          <div
            className="group relative"
            onMouseEnter={() => setHoveredCard("hours")}
            onMouseLeave={() => setHoveredCard(null)}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-amber-600 to-amber-800 rounded-xl blur-lg opacity-0 group-hover:opacity-75 transition duration-500" />
            <Card className="relative bg-gradient-to-br from-amber-900/50 to-amber-950/50 border-amber-500/30 backdrop-blur-xl hover:border-amber-400/60 transition-all duration-300 transform group-hover:scale-105 group-hover:-translate-y-1 shadow-2xl">
              <CardContent className="pt-8 pb-6">
                <div className="flex items-start justify-between mb-6">
                  <div className="p-3 bg-amber-500/20 rounded-lg group-hover:bg-amber-500/40 transition">
                    <Clock className="w-6 h-6 text-amber-300" />
                  </div>
                  <Target className="w-5 h-5 text-amber-400/50 group-hover:text-amber-300 transition" />
                </div>
                <p className="text-amber-300 text-sm font-medium mb-2">Avg Hrs/Day</p>
                <p className="text-5xl font-bold text-amber-100 mb-1">{analyticsMetrics?.averageHoursPerDay || 0}h</p>
                <p className="text-xs text-amber-400/70">Last 30 days</p>
              </CardContent>
            </Card>
          </div>

          {/* Pending Requests Card */}
          <div
            className="group relative"
            onMouseEnter={() => setHoveredCard("pending")}
            onMouseLeave={() => setHoveredCard(null)}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-rose-600 to-rose-800 rounded-xl blur-lg opacity-0 group-hover:opacity-75 transition duration-500" />
            <Card className="relative bg-gradient-to-br from-rose-900/50 to-rose-950/50 border-rose-500/30 backdrop-blur-xl hover:border-rose-400/60 transition-all duration-300 transform group-hover:scale-105 group-hover:-translate-y-1 shadow-2xl">
              <CardContent className="pt-8 pb-6">
                <div className="flex items-start justify-between mb-6">
                  <div className="p-3 bg-rose-500/20 rounded-lg group-hover:bg-rose-500/40 transition">
                    <AlertCircle className="w-6 h-6 text-rose-300" />
                  </div>
                  <Award className="w-5 h-5 text-rose-400/50 group-hover:text-rose-300 transition" />
                </div>
                <p className="text-rose-300 text-sm font-medium mb-2">Pending</p>
                <p className="text-5xl font-bold text-rose-100 mb-1">{pendingRequests.length}</p>
                <p className="text-xs text-rose-400/70">Awaiting approval</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Premium Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-gradient-to-r from-slate-800/50 to-slate-900/50 border border-slate-700/50 backdrop-blur-xl flex flex-wrap gap-2 h-auto p-4 rounded-xl shadow-xl">
            <TabsTrigger value="overview" className="px-5 py-2.5 rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-blue-700 data-[state=active]:shadow-lg data-[state=active]:text-white text-slate-400 hover:text-slate-200 transition-all duration-300 flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="analytics" className="px-5 py-2.5 rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-600 data-[state=active]:to-emerald-700 data-[state=active]:shadow-lg data-[state=active]:text-white text-slate-400 hover:text-slate-200 transition-all duration-300 flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="staff" className="px-5 py-2.5 rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-600 data-[state=active]:to-amber-700 data-[state=active]:shadow-lg data-[state=active]:text-white text-slate-400 hover:text-slate-200 transition-all duration-300 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Staff
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Live Activity */}
              <div className="lg:col-span-2">
                <Card className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-700/50 backdrop-blur-xl shadow-xl">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-white">
                      <Activity className="w-5 h-5 text-blue-400" />
                      Live Staff Activity
                    </CardTitle>
                    <CardDescription className="text-slate-400">Real-time check-in/out status</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {staffList?.slice(0, 6).map((staff: any) => {
                      const staffAttendance = Array.isArray(attendanceRecords) ? attendanceRecords.find((att: any) => att.userId === staff.id) : null;
                      const isCheckedIn = staffAttendance && !staffAttendance.checkOutTime;
                      return (
                        <div key={staff.id} className="group p-4 rounded-lg bg-slate-700/30 hover:bg-slate-700/60 border border-slate-600/30 hover:border-slate-500/50 transition-all duration-300 transform hover:translate-x-1">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 flex-1">
                              <div className={`w-3 h-3 rounded-full ${isCheckedIn ? "bg-green-500 animate-pulse" : "bg-red-500"}`} />
                              <div>
                                <p className="text-white font-medium">{staff.name}</p>
                                <p className="text-xs text-slate-400">{staff.email}</p>
                              </div>
                            </div>
                            <Badge className={isCheckedIn ? "bg-green-600/80 hover:bg-green-700" : "bg-slate-600/80 hover:bg-slate-700"}>
                              {isCheckedIn ? "Active" : "Offline"}
                            </Badge>
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              </div>

              {/* Quick Stats */}
              <div className="space-y-4">
                <Card className="bg-gradient-to-br from-blue-900/30 to-blue-950/30 border-blue-500/30 backdrop-blur-xl shadow-xl">
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-blue-300 text-sm mb-2">Attendance Rate</p>
                      <p className="text-4xl font-bold text-blue-100">{analyticsMetrics?.attendanceRate || 0}%</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-emerald-900/30 to-emerald-950/30 border-emerald-500/30 backdrop-blur-xl shadow-xl">
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-emerald-300 text-sm mb-2">Total Records</p>
                      <p className="text-4xl font-bold text-emerald-100">{attendanceRecords?.length || 0}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <Card className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-700/50 backdrop-blur-xl shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <BarChart3 className="w-5 h-5 text-emerald-400" />
                  Performance Metrics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 rounded-lg bg-slate-700/30 border border-slate-600/30">
                    <p className="text-slate-400 text-sm mb-2">Avg Hours</p>
                    <p className="text-3xl font-bold text-white">{analyticsMetrics?.averageHoursPerDay || 0}h</p>
                  </div>
                  <div className="p-4 rounded-lg bg-slate-700/30 border border-slate-600/30">
                    <p className="text-slate-400 text-sm mb-2">Overtime</p>
                    <p className="text-3xl font-bold text-amber-300">{analyticsMetrics?.overtimeHours || 0}h</p>
                  </div>
                  <div className="p-4 rounded-lg bg-slate-700/30 border border-slate-600/30">
                    <p className="text-slate-400 text-sm mb-2">Attendance</p>
                    <p className="text-3xl font-bold text-emerald-300">{analyticsMetrics?.attendanceRate || 0}%</p>
                  </div>
                  <div className="p-4 rounded-lg bg-slate-700/30 border border-slate-600/30">
                    <p className="text-slate-400 text-sm mb-2">Staff</p>
                    <p className="text-3xl font-bold text-blue-300">{staffList?.length || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Staff Tab */}
          <TabsContent value="staff" className="space-y-6">
            <Card className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-700/50 backdrop-blur-xl shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Users className="w-5 h-5 text-amber-400" />
                  Staff Directory
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {staffList?.map((staff: any) => (
                    <div key={staff.id} className="p-4 rounded-lg bg-slate-700/30 border border-slate-600/30 hover:border-slate-500/50 transition-all duration-300">
                      <p className="text-white font-medium">{staff.name}</p>
                      <p className="text-xs text-slate-400 mt-1">{staff.email}</p>
                      <Badge className="mt-3 bg-blue-600/80">{staff.role || "Staff"}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
