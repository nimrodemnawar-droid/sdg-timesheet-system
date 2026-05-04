import React, { useState, useRef } from "react";
import { generateAttendanceReportCSV, generateLeaveReportCSV, generateOvertimeReportCSV, generateGPSActivityReportCSV } from "@/lib/reportExport";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users,
  Clock,
  CheckCircle,
  AlertCircle,
  Download,
  MapPin,
  TrendingUp,
  Plus,
  Search,
  Edit2,
  Trash2,
  FileText,
  BarChart3,
  Activity,
  Shield,
  Filter,
  Calendar,
  User,
  CheckCheck,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { ExportDialog } from "@/components/ExportDialog";
import { NotificationCenter, type Notification } from "@/components/NotificationCenter";
import { NotificationPreferencesDialog } from "@/components/NotificationPreferencesDialog";
import { OvertimeApprovalManager } from "@/components/OvertimeApprovalManager";
import { TimesheetExportManager } from "@/components/TimesheetExportManager";
import { MapView } from "@/components/Map";
import { ReportSchedulingManager } from "@/components/ReportSchedulingManager";
import { AdminManagement } from "@/components/AdminManagement";

export default function AdminDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedRequest, setSelectedRequest] = useState<number | null>(null);
  const [approvalReason, setApprovalReason] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [showExport, setShowExport] = useState<"attendance" | "overtime" | "leave" | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [lastAttendanceState, setLastAttendanceState] = useState<Map<number, boolean>>(new Map());
  const [leaveFilterStatus, setLeaveFilterStatus] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [leaveSearchTerm, setLeaveSearchTerm] = useState("");
  const [showGpsMap, setShowGpsMap] = useState(false);
  const mapRef = useRef<google.maps.Map | null>(null);

  // Queries with real-time polling for live updates
  const { data: stats, refetch: refetchStats } = trpc.attendance.getTodayAllStaff.useQuery(undefined, {
    refetchInterval: 1000,
  }) as any;
  const { data: leaveRequests, refetch: refetchRequests } = trpc.leave.getPending.useQuery(undefined, {
    refetchInterval: 2000,
  }) as any;
  const { data: staffList, refetch: refetchStaffList } = trpc.users.getAll.useQuery(undefined, {
    refetchInterval: 2000,
  });
  const { data: attendanceRecords, refetch: refetchAttendance } = trpc.attendance.getToday.useQuery(undefined, {
    refetchInterval: 1000,
  });
  const { data: analyticsMetrics, refetch: refetchAnalytics } = trpc.analytics.metrics.useQuery({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    endDate: new Date(),
  }, {
    refetchInterval: 30000,
  }) as any;

  // Mutations
  const approveRequestMutation = trpc.leave.approve.useMutation() as any;
  const rejectRequestMutation = trpc.leave.reject.useMutation() as any;

  const handleApproveRequest = async (requestId: number) => {
    if (!approvalReason.trim()) {
      toast.error("Please enter an approval reason");
      return;
    }

    setIsProcessing(true);
    try {
      await approveRequestMutation.mutateAsync({
        leaveRequestId: requestId,
        reason: approvalReason,
      });
      toast.success("Leave request approved");
      setApprovalReason("");
      setSelectedRequest(null);
      await refetchRequests();
    } catch (error) {
      toast.error("Failed to approve request");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRejectRequest = async (requestId: number) => {
    if (!approvalReason.trim()) {
      toast.error("Please enter a rejection reason");
      return;
    }

    setIsProcessing(true);
    try {
      await rejectRequestMutation.mutateAsync({
        leaveRequestId: requestId,
        reason: approvalReason,
      });
      toast.success("Leave request rejected");
      setApprovalReason("");
      setSelectedRequest(null);
      await refetchRequests();
    } catch (error) {
      toast.error("Failed to reject request");
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredStaff = staffList?.filter((staff: any) =>
    staff.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    staff.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const pendingRequests = leaveRequests?.filter((req: any) => req.status === "pending") || [];

  // Track attendance changes and create notifications
  React.useEffect(() => {
    if (!Array.isArray(attendanceRecords)) return;

    const currentState = new Map<number, boolean>();
    const newNotifications: Notification[] = [];

    attendanceRecords.forEach((record: any) => {
      const isCheckedIn = record.checkInTime && !record.checkOutTime;
      const wasCheckedIn = lastAttendanceState.get(record.userId);
      const staff = staffList?.find((s: any) => s.id === record.userId);

      if (staff && isCheckedIn !== wasCheckedIn) {
        if (isCheckedIn && wasCheckedIn === false) {
          newNotifications.push({
            id: `checkin-${record.id}-${Date.now()}`,
            type: "check-in",
            staffName: staff.name || "Unknown",
            message: "Checked in",
            timestamp: new Date(record.checkInTime),
            read: false,
            details: {
              location: record.checkInLat && record.checkInLng ? `(${parseFloat(record.checkInLat).toFixed(4)}, ${parseFloat(record.checkInLng).toFixed(4)})` : null,
              accuracy: record.checkInAccuracy ? `${parseFloat(record.checkInAccuracy).toFixed(1)}m` : null,
            },
          });
        } else if (!isCheckedIn && wasCheckedIn === true) {
          const hoursWorked = record.durationMinutes ? (record.durationMinutes / 60).toFixed(2) : "0";
          newNotifications.push({
            id: `checkout-${record.id}-${Date.now()}`,
            type: "check-out",
            staffName: staff.name || "Unknown",
            message: "Checked out",
            timestamp: new Date(record.checkOutTime || new Date()),
            read: false,
            details: {
              location: record.checkOutLat && record.checkOutLng ? `(${parseFloat(record.checkOutLat).toFixed(4)}, ${parseFloat(record.checkOutLng).toFixed(4)})` : null,
              accuracy: record.checkOutAccuracy ? `${parseFloat(record.checkOutAccuracy).toFixed(1)}m` : null,
              hoursWorked: `${hoursWorked}h`,
              distance: record.distanceTraveled ? `${parseFloat(record.distanceTraveled).toFixed(2)}m` : null,
            },
          });
        }
      }

      currentState.set(record.userId, isCheckedIn);
    });

    if (newNotifications.length > 0) {
      setNotifications((prev) => [...newNotifications, ...prev].slice(0, 50));
    }

    setLastAttendanceState(currentState);
  }, [attendanceRecords, staffList]);

  const handleClearNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const handleClearAllNotifications = () => {
    setNotifications([]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-2 sm:p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="w-8 h-8 text-blue-400" />
              <h1 className="text-2xl md:text-4xl font-bold text-white">Admin Dashboard</h1>
            </div>
            <div className="flex items-center gap-2">
              <NotificationPreferencesDialog />
              <NotificationCenter
                notifications={notifications}
                onClear={handleClearNotification}
                onClearAll={handleClearAllNotifications}
              />
            </div>
          </div>
          <p className="text-slate-300">Complete timesheet management and system oversight</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-blue-500/30 hover:border-blue-400 transition-all duration-300 shadow-lg">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm mb-1 font-medium">Total Staff</p>
                  <p className="text-3xl font-bold text-white">{staffList?.length || 0}</p>
                  <p className="text-xs text-slate-500 mt-1">Active users</p>
                </div>
                <Users className="w-10 h-10 text-blue-400 opacity-80" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-green-500/30 hover:border-green-400 transition-all duration-300 shadow-lg">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm mb-1 font-medium">Checked In Today</p>
                  <p className="text-3xl font-bold text-white">{stats?.checkedInCount || 0}</p>
                  <p className="text-xs text-slate-500 mt-1">Present today</p>
                </div>
                <CheckCircle className="w-10 h-10 text-green-400 opacity-80" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-amber-500/30 hover:border-amber-400 transition-all duration-300 shadow-lg">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm mb-1 font-medium">Avg Hours/Day</p>
                  <p className="text-3xl font-bold text-white">{analyticsMetrics?.averageHoursPerDay || 0}h</p>
                  <p className="text-xs text-slate-500 mt-1">Last 30 days</p>
                </div>
                <Clock className="w-10 h-10 text-amber-400 opacity-80" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-red-500/30 hover:border-red-400 transition-all duration-300 shadow-lg">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm mb-1 font-medium">Pending Requests</p>
                  <p className="text-3xl font-bold text-white">{pendingRequests.length}</p>
                  <p className="text-xs text-slate-500 mt-1">Awaiting approval</p>
                </div>
                <AlertCircle className="w-10 h-10 text-red-400 opacity-80" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="bg-slate-800/50 border border-slate-700 backdrop-blur-sm flex flex-wrap gap-2 h-auto p-2">
            <TabsTrigger value="overview" className="data-[state=active]:bg-blue-600 text-slate-300 data-[state=active]:text-white">
              <Activity className="w-4 h-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="staff" className="data-[state=active]:bg-blue-600 text-slate-300 data-[state=active]:text-white">
              <Users className="w-4 h-4 mr-2" />
              Staff Management
            </TabsTrigger>
            <TabsTrigger value="leave" className="data-[state=active]:bg-blue-600 text-slate-300 data-[state=active]:text-white">
              <FileText className="w-4 h-4 mr-2" />
              Leave Requests
            </TabsTrigger>
            <TabsTrigger value="attendance" className="data-[state=active]:bg-blue-600 text-slate-300 data-[state=active]:text-white">
              <Clock className="w-4 h-4 mr-2" />
              Attendance
            </TabsTrigger>
            <TabsTrigger value="reports" className="data-[state=active]:bg-blue-600 text-slate-300 data-[state=active]:text-white">
              <BarChart3 className="w-4 h-4 mr-2" />
              Reports
            </TabsTrigger>
            <TabsTrigger value="overtime" className="data-[state=active]:bg-blue-600 text-slate-300 data-[state=active]:text-white">
              <AlertCircle className="w-4 h-4 mr-2" />
              Overtime
            </TabsTrigger>
            <TabsTrigger value="export" className="data-[state=active]:bg-blue-600 text-slate-300 data-[state=active]:text-white">
              <Download className="w-4 h-4 mr-2" />
              Export
            </TabsTrigger>
            <TabsTrigger value="gpsmap" className="data-[state=active]:bg-blue-600 text-slate-300 data-[state=active]:text-white">
              <MapPin className="w-4 h-4 mr-2" />
              GPS Map
            </TabsTrigger>
            <TabsTrigger value="scheduling" className="data-[state=active]:bg-blue-600 text-slate-300 data-[state=active]:text-white">
              <Calendar className="w-4 h-4 mr-2" />
              Report Scheduling
            </TabsTrigger>
            <TabsTrigger value="admin-management" className="data-[state=active]:bg-blue-600 text-slate-300 data-[state=active]:text-white">
              <Shield className="w-4 h-4 mr-2" />
              Admin Management
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Activity className="w-5 h-5 text-blue-400" />
                    Live Staff Status
                  </CardTitle>
                  <CardDescription className="text-slate-400">Real-time check-in/out (updates every 3s)</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {staffList?.slice(0, 5).map((staff: any) => {
                    const staffAttendance = Array.isArray(attendanceRecords) ? attendanceRecords.find((att: any) => att.userId === staff.id) : null;
                    const isCheckedIn = staffAttendance && !staffAttendance.checkOutTime;
                    return (
                      <div key={staff.id} className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg hover:bg-slate-700 transition border border-slate-600/50">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${isCheckedIn ? "bg-green-500 animate-pulse" : "bg-red-500"}`} />
                            <p className="text-white font-medium">{staff.name}</p>
                          </div>
                          <p className="text-xs text-slate-400">{staff.email}</p>
                        </div>
                        <div className="text-right">
                          <Badge className={isCheckedIn ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}>
                            {isCheckedIn ? "Checked In" : "Checked Out"}
                          </Badge>
                          <p className="text-xs text-slate-400 mt-1">{staffAttendance ? new Date(staffAttendance.checkInTime).toLocaleTimeString() : "N/A"}</p>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-green-400" />
                    Quick Actions
                  </CardTitle>
                  <CardDescription className="text-slate-400">Common administrative tasks</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button className="w-full bg-blue-600 hover:bg-blue-700 justify-start gap-2 text-white border-0">
                    <Plus className="w-4 h-4" />
                    Add New Staff
                  </Button>
                  <Button className="w-full bg-purple-600 hover:bg-purple-700 justify-start gap-2 text-white border-0">
                    <Download className="w-4 h-4" />
                    Export Attendance Report
                  </Button>
                  <Button 
                    onClick={() => setShowGpsMap(true)}
                    className="w-full bg-green-600 hover:bg-green-700 justify-start gap-2 text-white border-0"
                  >
                    <MapPin className="w-4 h-4" />
                    View Live GPS Map
                  </Button>
                  <Button className="w-full bg-amber-600 hover:bg-amber-700 justify-start gap-2 text-white border-0">
                    <BarChart3 className="w-4 h-4" />
                    View Analytics
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Staff Management Tab */}
          <TabsContent value="staff" className="space-y-4">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-400" />
                  Staff Directory
                </CardTitle>
                <CardDescription className="text-slate-400">Manage all staff members</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                    <Input
                      placeholder="Search staff..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                  <Button className="bg-blue-600 hover:bg-blue-700 gap-2 text-white border-0">
                    <Plus className="w-4 h-4" />
                    Add Staff
                  </Button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-slate-600">
                      <tr>
                        <th className="text-left py-3 px-4 text-slate-300 font-semibold">Name</th>
                        <th className="text-left py-3 px-4 text-slate-300 font-semibold">Email</th>
                        <th className="text-left py-3 px-4 text-slate-300 font-semibold">Role</th>
                        <th className="text-left py-3 px-4 text-slate-300 font-semibold">Status</th>
                        <th className="text-left py-3 px-4 text-slate-300 font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStaff?.map((staff: any) => (
                        <tr key={staff.id} className="border-b border-slate-700/50 hover:bg-slate-700/30 transition">
                          <td className="py-3 px-4 text-white">{staff.name}</td>
                          <td className="py-3 px-4 text-slate-400">{staff.email}</td>
                          <td className="py-3 px-4">
                            <Badge className={staff.role === "admin" ? "bg-red-600" : staff.role === "supervisor" ? "bg-purple-600" : "bg-blue-600"}>{staff.role}</Badge>
                          </td>
                          <td className="py-3 px-4">
                            <Badge className={staff.isActive ? "bg-green-600" : "bg-slate-600"}>{staff.isActive ? "Active" : "Inactive"}</Badge>
                          </td>
                          <td className="py-3 px-4 flex gap-2">
                            <Button size="sm" variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700">
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="outline" className="border-slate-600 text-red-400 hover:bg-red-900/20">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Leave Requests Tab */}
          <TabsContent value="leave" className="space-y-4">
            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="bg-gradient-to-br from-amber-900/30 to-amber-900/10 border-amber-500/30">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-amber-300 text-sm font-medium">Pending</p>
                      <p className="text-2xl font-bold text-white">{leaveRequests?.filter((r: any) => r.status === "pending").length || 0}</p>
                    </div>
                    <AlertCircle className="w-8 h-8 text-amber-400" />
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-green-900/30 to-green-900/10 border-green-500/30">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-green-300 text-sm font-medium">Approved</p>
                      <p className="text-2xl font-bold text-white">{leaveRequests?.filter((r: any) => r.status === "approved").length || 0}</p>
                    </div>
                    <CheckCheck className="w-8 h-8 text-green-400" />
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-red-900/30 to-red-900/10 border-red-500/30">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-red-300 text-sm font-medium">Rejected</p>
                      <p className="text-2xl font-bold text-white">{leaveRequests?.filter((r: any) => r.status === "rejected").length || 0}</p>
                    </div>
                    <X className="w-8 h-8 text-red-400" />
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-blue-900/30 to-blue-900/10 border-blue-500/30">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-300 text-sm font-medium">Total</p>
                      <p className="text-2xl font-bold text-white">{leaveRequests?.length || 0}</p>
                    </div>
                    <FileText className="w-8 h-8 text-blue-400" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Leave Requests Card */}
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-400" />
                  Leave Requests
                </CardTitle>
                <CardDescription className="text-slate-400">Review and approve/decline leave requests from staff</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Filters and Search */}
                <div className="flex flex-col gap-3 md:flex-row md:items-center">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                    <Input
                      placeholder="Search by staff name or email..."
                      value={leaveSearchTerm}
                      onChange={(e) => setLeaveSearchTerm(e.target.value)}
                      className="pl-10 bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => setLeaveFilterStatus("all")}
                      variant={leaveFilterStatus === "all" ? "default" : "outline"}
                      className={leaveFilterStatus === "all" ? "bg-blue-600 hover:bg-blue-700 text-white border-0" : "border-slate-600 text-slate-300 hover:bg-slate-700"}
                    >
                      All
                    </Button>
                    <Button
                      onClick={() => setLeaveFilterStatus("pending")}
                      variant={leaveFilterStatus === "pending" ? "default" : "outline"}
                      className={leaveFilterStatus === "pending" ? "bg-amber-600 hover:bg-amber-700 text-white border-0" : "border-slate-600 text-slate-300 hover:bg-slate-700"}
                    >
                      Pending
                    </Button>
                    <Button
                      onClick={() => setLeaveFilterStatus("approved")}
                      variant={leaveFilterStatus === "approved" ? "default" : "outline"}
                      className={leaveFilterStatus === "approved" ? "bg-green-600 hover:bg-green-700 text-white border-0" : "border-slate-600 text-slate-300 hover:bg-slate-700"}
                    >
                      Approved
                    </Button>
                    <Button
                      onClick={() => setLeaveFilterStatus("rejected")}
                      variant={leaveFilterStatus === "rejected" ? "default" : "outline"}
                      className={leaveFilterStatus === "rejected" ? "bg-red-600 hover:bg-red-700 text-white border-0" : "border-slate-600 text-slate-300 hover:bg-slate-700"}
                    >
                      Rejected
                    </Button>
                  </div>
                </div>

                {/* Leave Requests List */}
                {!leaveRequests || leaveRequests.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-400">No leave requests found</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {leaveRequests
                      .filter((request: any) => {
                        const matchesStatus = leaveFilterStatus === "all" || request.status === leaveFilterStatus;
                        const matchesSearch = !leaveSearchTerm || 
                          request.staffName?.toLowerCase().includes(leaveSearchTerm.toLowerCase()) ||
                          request.staffEmail?.toLowerCase().includes(leaveSearchTerm.toLowerCase());
                        return matchesStatus && matchesSearch;
                      })
                      .map((request: any) => (
                        <div key={request.id} className="p-4 bg-slate-700/50 rounded-lg border border-slate-600/50 hover:border-blue-500/50 transition">
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <User className="w-4 h-4 text-slate-400" />
                                <p className="text-white font-semibold">{request.staffName || "Staff Member"}</p>
                              </div>
                              <p className="text-xs text-slate-400 ml-6">{request.staffEmail || "No email"}</p>
                            </div>
                            <Badge className={request.status === "pending" ? "bg-amber-600" : request.status === "approved" ? "bg-green-600" : "bg-red-600"}>
                              {request.status?.charAt(0).toUpperCase() + request.status?.slice(1) || "Pending"}
                            </Badge>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3 text-sm">
                            <div className="bg-slate-600/30 p-2 rounded">
                              <p className="text-slate-400 text-xs">Leave Type</p>
                              <p className="text-white font-medium">{request.leaveType || "N/A"}</p>
                            </div>
                            <div className="bg-slate-600/30 p-2 rounded">
                              <p className="text-slate-400 text-xs">From Date</p>
                              <p className="text-white font-medium">{request.startDate ? new Date(request.startDate).toLocaleDateString() : "N/A"}</p>
                            </div>
                            <div className="bg-slate-600/30 p-2 rounded">
                              <p className="text-slate-400 text-xs">To Date</p>
                              <p className="text-white font-medium">{request.endDate ? new Date(request.endDate).toLocaleDateString() : "N/A"}</p>
                            </div>
                            <div className="bg-slate-600/30 p-2 rounded">
                              <p className="text-slate-400 text-xs">Days</p>
                              <p className="text-white font-medium">{request.numberOfDays || "N/A"}</p>
                            </div>
                          </div>

                          <div className="mb-3 p-3 bg-slate-600/20 rounded border border-slate-600/30">
                            <p className="text-xs text-slate-400 mb-1">Reason</p>
                            <p className="text-sm text-slate-300">{request.reason || "No reason provided"}</p>
                          </div>

                          {selectedRequest === request.id && (
                            <div className="space-y-3 mt-3 pt-3 border-t border-slate-600">
                              <Textarea
                                placeholder={request.status === "pending" ? "Enter approval/rejection reason..." : "Reason already provided"}
                                value={approvalReason}
                                onChange={(e) => setApprovalReason(e.target.value)}
                                disabled={request.status !== "pending"}
                                className="bg-slate-600/50 border-slate-600 text-white placeholder:text-slate-400 disabled:opacity-50"
                              />
                              {request.status === "pending" && (
                                <div className="flex gap-2">
                                  <Button
                                    onClick={() => handleApproveRequest(request.id)}
                                    disabled={isProcessing}
                                    className="flex-1 bg-green-600 hover:bg-green-700 text-white border-0 gap-2"
                                  >
                                    <CheckCheck className="w-4 h-4" />
                                    Approve & Notify Staff
                                  </Button>
                                  <Button
                                    onClick={() => handleRejectRequest(request.id)}
                                    disabled={isProcessing}
                                    className="flex-1 bg-red-600 hover:bg-red-700 text-white border-0 gap-2"
                                  >
                                    <X className="w-4 h-4" />
                                    Decline & Notify Staff
                                  </Button>
                                </div>
                              )}
                              {request.status !== "pending" && (
                                <div className="p-3 bg-slate-600/30 rounded text-sm text-slate-300">
                                  <p className="font-medium mb-1">Decision Reason:</p>
                                  <p>{request.adminReason || "No reason provided"}</p>
                                </div>
                              )}
                            </div>
                          )}
                          {selectedRequest !== request.id && (
                            <Button
                              onClick={() => setSelectedRequest(request.id)}
                              variant="outline"
                              className="w-full border-slate-600 text-slate-300 hover:bg-slate-700"
                              disabled={request.status !== "pending"}
                            >
                              {request.status === "pending" ? "Review & Decide" : "View Details"}
                            </Button>
                          )}
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Attendance Tab */}
          <TabsContent value="attendance" className="space-y-4">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-400" />
                  Attendance Report
                </CardTitle>
                <CardDescription className="text-slate-400">View and export attendance records with filters</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Filters */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-slate-700/30 rounded-lg">
                  <div>
                    <Label className="text-slate-300 text-sm mb-2 block">Start Date</Label>
                    <Input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="bg-slate-600/50 border-slate-600 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-300 text-sm mb-2 block">End Date</Label>
                    <Input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="bg-slate-600/50 border-slate-600 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-300 text-sm mb-2 block">Staff Member</Label>
                    <Select value={searchTerm} onValueChange={setSearchTerm}>
                      <SelectTrigger className="bg-slate-600/50 border-slate-600 text-white">
                        <SelectValue placeholder="All Staff" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-700 border-slate-600">
                        <SelectItem value="all">All Staff</SelectItem>
                        {staffList?.map((staff: any) => (
                          <SelectItem key={staff.id} value={staff.id.toString()}>
                            {staff.name || `Staff ${staff.id}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end">
                    <Button
                      onClick={() => {
                        if (attendanceRecords) {
                          const checkInDate = new Date(attendanceRecords.checkInTime);
                          const checkOutDate = attendanceRecords.checkOutTime ? new Date(attendanceRecords.checkOutTime) : null;
                          const hoursWorked = checkOutDate ? ((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60)).toFixed(2) : 0;
                          
                          const reportData = [
                            {
                              staffId: attendanceRecords.userId || 1,
                              name: `Staff ${attendanceRecords.userId}`,
                              date: checkInDate.toISOString().split('T')[0],
                              checkInTime: checkInDate.toLocaleTimeString(),
                              checkOutTime: checkOutDate ? checkOutDate.toLocaleTimeString() : 'Not checked out',
                              hoursWorked: hoursWorked,
                              status: checkOutDate ? 'Present' : 'Checked In',
                              workModality: attendanceRecords.workModality || 'On-site',
                              checkInLat: attendanceRecords.checkInLat || 'N/A',
                              checkInLng: attendanceRecords.checkInLng || 'N/A',
                              checkInAccuracy: attendanceRecords.checkInAccuracy || 'N/A',
                              checkOutLat: attendanceRecords.checkOutLat || 'N/A',
                              checkOutLng: attendanceRecords.checkOutLng || 'N/A',
                              checkOutAccuracy: attendanceRecords.checkOutAccuracy || 'N/A',
                              distance: attendanceRecords.distanceTraveled ? parseFloat(attendanceRecords.distanceTraveled as any) / 1000 : 0,
                            }
                          ];
                          generateAttendanceReportCSV(reportData);
                        }
                      }}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white border-0"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Export Report
                    </Button>
                  </div>
                </div>

                {/* Attendance Table */}
                <div className="overflow-x-auto -mx-4 md:mx-0">
                  <table className="w-full text-xs md:text-sm">
                    <thead className="border-b border-slate-600 bg-slate-700/50">
                      <tr>
                        <th className="text-left py-3 px-4 text-slate-300 font-semibold">Staff ID</th>
                        <th className="text-left py-3 px-4 text-slate-300 font-semibold">Name</th>
                        <th className="text-left py-3 px-4 text-slate-300 font-semibold">Date</th>
                        <th className="text-left py-3 px-4 text-slate-300 font-semibold">Check In</th>
                        <th className="text-left py-3 px-4 text-slate-300 font-semibold">Check Out</th>
                        <th className="text-left py-3 px-4 text-slate-300 font-semibold">Hours Worked</th>
                        <th className="text-left py-3 px-4 text-slate-300 font-semibold">Distance (km)</th>
                        <th className="text-left py-3 px-4 text-slate-300 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attendanceRecords && (
                        <tr className="border-b border-slate-700/50 hover:bg-slate-700/30 transition">
                          <td className="py-3 px-4 text-white">{attendanceRecords.userId}</td>
                          <td className="py-3 px-4 text-white">Staff Member</td>
                          <td className="py-3 px-4 text-slate-400">{new Date(attendanceRecords.checkInTime).toISOString().split('T')[0]}</td>
                          <td className="py-3 px-4 text-slate-400">{new Date(attendanceRecords.checkInTime).toLocaleTimeString()}</td>
                          <td className="py-3 px-4 text-slate-400">{attendanceRecords.checkOutTime ? new Date(attendanceRecords.checkOutTime).toLocaleTimeString() : 'Not checked out'}</td>
                          <td className="py-3 px-4 text-slate-400">
                            {attendanceRecords.checkOutTime
                              ? ((new Date(attendanceRecords.checkOutTime).getTime() - new Date(attendanceRecords.checkInTime).getTime()) / (1000 * 60 * 60)).toFixed(2)
                              : '-'} h
                          </td>
                          <td className="py-3 px-4 text-slate-400">{attendanceRecords.distanceTraveled ? (parseFloat(attendanceRecords.distanceTraveled) / 1000).toFixed(2) : '0'}</td>
                          <td className="py-3 px-4">
                            <Badge className={attendanceRecords.checkOutTime ? "bg-green-600" : "bg-blue-600"}>
                              {attendanceRecords.checkOutTime ? 'Present' : 'Checked In'}
                            </Badge>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports" className="space-y-4">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-blue-400" />
                  System Reports
                </CardTitle>
                <CardDescription className="text-slate-400">Generate and export reports</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button onClick={() => {
                    if (attendanceRecords) {
                      const reportData = [
                        {
                          staffId: attendanceRecords.userId || 1,
                          name: `Staff ${attendanceRecords.userId}`,
                          date: new Date(attendanceRecords.checkInTime).toISOString().split('T')[0],
                          checkInTime: new Date(attendanceRecords.checkInTime).toLocaleTimeString(),
                          checkOutTime: attendanceRecords.checkOutTime ? new Date(attendanceRecords.checkOutTime).toLocaleTimeString() : 'Not checked out',
                          status: attendanceRecords.checkOutTime ? 'Present' : 'Checked In',
                          distance: attendanceRecords.distanceTraveled ? parseFloat(attendanceRecords.distanceTraveled as any) / 1000 : 0,
                        }
                      ];
                      generateAttendanceReportCSV(reportData);
                    } else {
                      toast.error('No attendance data available to export');
                    }
                  }} className="bg-blue-600 hover:bg-blue-700 h-20 text-white border-0 flex flex-col items-center justify-center gap-2">
                    <Download className="w-5 h-5" />
                    <span>Attendance Report</span>
                  </Button>
                  <Button onClick={() => {
                    if (attendanceRecords?.checkOutTime) {
                      const checkInTime = new Date(attendanceRecords.checkInTime);
                      const checkOutTime = new Date(attendanceRecords.checkOutTime);
                      const hoursWorked = (checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);
                      const overtimeHours = hoursWorked > 8 ? hoursWorked - 8 : 0;
                      
                      if (overtimeHours > 0) {
                        const reportData = [
                          {
                            staffId: attendanceRecords.userId || 1,
                            name: `Staff ${attendanceRecords.userId}`,
                            date: new Date(attendanceRecords.checkInTime).toISOString().split('T')[0],
                            overtimeHours: parseFloat(overtimeHours.toFixed(2)),
                            reason: 'Work extension',
                          }
                        ];
                        generateOvertimeReportCSV(reportData);
                      } else {
                        toast.info('No overtime recorded for this period');
                      }
                    } else {
                      toast.error('Staff must check out first to generate overtime report');
                    }
                  }} className="bg-purple-600 hover:bg-purple-700 h-20 text-white border-0 flex flex-col items-center justify-center gap-2">
                    <Download className="w-5 h-5" />
                    <span>Overtime Report</span>
                  </Button>
                  <Button onClick={() => {
                    if (leaveRequests && leaveRequests.length > 0) {
                      const reportData = leaveRequests.map((req: any) => ({
                        staffId: req.userId || 1,
                        name: `Staff ${req.userId}`,
                        leaveType: req.leaveType || 'N/A',
                        startDate: new Date(req.startDate).toISOString().split('T')[0],
                        endDate: new Date(req.endDate).toISOString().split('T')[0],
                        days: req.numberOfDays || 1,
                        status: req.status || 'Pending',
                      }));
                      generateLeaveReportCSV(reportData);
                    } else {
                      toast.error('No leave request data available to export');
                    }
                  }} className="bg-green-600 hover:bg-green-700 h-20 text-white border-0 flex flex-col items-center justify-center gap-2">
                    <Download className="w-5 h-5" />
                    <span>Leave Report</span>
                  </Button>
                  <Button onClick={() => {
                    if (attendanceRecords) {
                      const reportData = [
                        {
                          staffId: attendanceRecords.userId || 1,
                          name: `Staff ${attendanceRecords.userId}`,
                          date: new Date(attendanceRecords.checkInTime).toISOString().split('T')[0],
                          checkInLocation: attendanceRecords.workModality || 'Office',
                          checkOutLocation: attendanceRecords.workModality || 'Office',
                          totalDistance: attendanceRecords.distanceTraveled ? parseFloat(attendanceRecords.distanceTraveled as any) / 1000 : 0,
                          waypointCount: 0,
                        }
                      ];
                      generateGPSActivityReportCSV(reportData);
                    } else {
                      toast.error('No GPS activity data available to export');
                    }
                  }} className="bg-amber-600 hover:bg-amber-700 h-20 text-white border-0 flex flex-col items-center justify-center gap-2">
                    <Download className="w-5 h-5" />
                    <span>GPS Activity Report</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Overtime Tab */}
          <TabsContent value="overtime" className="space-y-4">
            <OvertimeApprovalManager />
          </TabsContent>

          {/* Export Tab */}
          <TabsContent value="export" className="space-y-4">
            <TimesheetExportManager staffList={staffList?.map((s: any) => ({ id: s.id, name: s.name || "Unknown" })) || []} />
          </TabsContent>

          {/* GPS Map Tab */}
          <TabsContent value="gpsmap" className="space-y-4">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-green-400" />
                  Real-Time Staff GPS Locations
                </CardTitle>
                <CardDescription className="text-slate-400">Live map showing all staff currently checked in</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-slate-700 rounded-lg overflow-hidden" style={{ height: '600px' }}>
                  <MapView
                    initialCenter={{ lat: -1.2921, lng: 36.8219 }}
                    initialZoom={10}
                    onMapReady={(map) => {
                      mapRef.current = map;
                      if (attendanceRecords && window.google?.maps?.marker?.AdvancedMarkerElement) {
                        if (attendanceRecords.checkInLat && attendanceRecords.checkInLng) {
                          const marker = new window.google.maps.marker.AdvancedMarkerElement({
                            map,
                            position: { lat: parseFloat(attendanceRecords.checkInLat), lng: parseFloat(attendanceRecords.checkInLng) },
                            title: 'Staff Member',
                          });
                          const infoWindow = new window.google.maps.InfoWindow({
                            content: `<div class="text-black p-2"><strong>Staff ID: ${attendanceRecords.userId}</strong><br/>Checked in at ${new Date(attendanceRecords.checkInTime).toLocaleTimeString()}</div>`,
                          });
                          marker.addListener('click', () => {
                            infoWindow.open(map, marker);
                          });
                        }
                      }
                    }}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                  <Card className="bg-slate-700 border-slate-600">
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <p className="text-slate-400 text-sm">Staff Checked In</p>
                        <p className="text-2xl font-bold text-green-400">1</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-slate-700 border-slate-600">
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <p className="text-slate-400 text-sm">Last Update</p>
                        <p className="text-sm font-mono text-blue-400">{attendanceRecords?.checkInTime ? new Date(attendanceRecords.checkInTime).toLocaleTimeString() : 'N/A'}</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-slate-700 border-slate-600">
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <p className="text-slate-400 text-sm">Accuracy</p>
                        <p className="text-sm font-mono text-yellow-400">{attendanceRecords?.checkInAccuracy ? parseFloat(attendanceRecords.checkInAccuracy).toFixed(1) : 'N/A'}m</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                <Card className="bg-slate-700 border-slate-600">
                  <CardHeader>
                    <CardTitle className="text-white text-sm">Staff Location Details</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Latitude:</span>
                        <span className="text-white font-mono">{attendanceRecords?.checkInLat ? parseFloat(attendanceRecords.checkInLat).toFixed(6) : 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Longitude:</span>
                        <span className="text-white font-mono">{attendanceRecords?.checkInLng ? parseFloat(attendanceRecords.checkInLng).toFixed(6) : 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Check-in Time:</span>
                        <span className="text-white font-mono">{attendanceRecords?.checkInTime ? new Date(attendanceRecords.checkInTime).toLocaleString() : 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Work Modality:</span>
                        <span className="text-white font-mono capitalize">{attendanceRecords?.workModality || 'N/A'}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Report Scheduling Tab */}
          <TabsContent value="scheduling" className="space-y-4">
            <ReportSchedulingManager />
          </TabsContent>

          {/* Admin Management Tab */}
          <TabsContent value="admin-management" className="space-y-4">
            <AdminManagement />
          </TabsContent>
        </Tabs>

        {/* GPS Map Modal */}
        {showGpsMap && attendanceRecords && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-4xl bg-slate-800 border-slate-700">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <CardTitle className="text-white">Live Staff GPS Map</CardTitle>
                <button
                  onClick={() => setShowGpsMap(false)}
                  className="text-slate-400 hover:text-white"
                >
                  X
                </button>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-slate-700 rounded-lg overflow-hidden" style={{ height: '500px' }}>
                  <MapView
                    initialCenter={{ lat: -1.2921, lng: 36.8219 }}
                    initialZoom={10}
                    onMapReady={(map) => {
                      mapRef.current = map;
                      if (attendanceRecords && window.google?.maps?.marker?.AdvancedMarkerElement) {
                        if (attendanceRecords.checkInLat && attendanceRecords.checkInLng) {
                          new window.google.maps.marker.AdvancedMarkerElement({
                            map,
                            position: { lat: parseFloat(attendanceRecords.checkInLat), lng: parseFloat(attendanceRecords.checkInLng) },
                            title: 'Staff Location',
                          });
                        }
                      }
                    }}
                  />
                </div>
                <div className="text-sm text-slate-400">
                  <p>Showing today's staff check-in locations</p>
                </div>
                <Button
                  onClick={() => setShowGpsMap(false)}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Close
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
