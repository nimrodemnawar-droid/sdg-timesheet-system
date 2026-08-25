import React, { useMemo, useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
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
import { Checkbox } from "@/components/ui/checkbox";
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
  Zap,
  Database,
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
import { TimesheetViewTab } from "@/components/TimesheetViewTab";
import { TimesheetDetailedView } from "@/components/TimesheetDetailedView";
import { OvertimeAlert, OvertimeStatistics } from "@/components/OvertimeAlert";
import { TimesheetFilter, type TimesheetFilterOptions } from "@/components/TimesheetFilter";
import { WaypointDisplay } from "@/components/WaypointDisplay";
import { WaypointFilter, type WaypointFilterOptions } from "@/components/WaypointFilter";
import MonthlyReports from "@/pages/MonthlyReports";
import { DataManagementTab } from "@/components/DataManagementTab";
import { filterWaypointRecords, WAYPOINT_REFRESH_INTERVAL_MS } from "../../../shared/waypointUtils";
import { ADMIN_TAB_VALUES, resolveAdminDashboardTab } from "../../../shared/adminDashboardTabs";
import { toLeaveReportRows } from "../../../shared/leaveReport";
import { formatAttendanceLocationSummary } from "../../../shared/location";

const EMPTY_WAYPOINT_RECORDS: any[] = [];

export default function AdminDashboard() {
  const { user } = useAuth();
  const [location] = useLocation();
  const requestedTab = useMemo(() => {
    const query = typeof window !== "undefined" ? window.location.search : location.split("?")[1] ?? "";
    const tab = new URLSearchParams(query).get("tab");
    return resolveAdminDashboardTab(tab);
  }, [location]);
  const [activeTab, setActiveTab] = useState(requestedTab);
  const [selectedRequest, setSelectedRequest] = useState<number | null>(null);
  const [selectedLeaveRequestIds, setSelectedLeaveRequestIds] = useState<number[]>([]);
  const [approvalReason, setApprovalReason] = useState("");
  const [bulkApprovalReason, setBulkApprovalReason] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [attendanceStartDate, setAttendanceStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30); // Default to last 30 days
    return date.toISOString().split("T")[0];
  });
  const [attendanceEndDate, setAttendanceEndDate] = useState(new Date().toISOString().split("T")[0]);
  const [attendanceStaffFilter, setAttendanceStaffFilter] = useState("all");
  const [showExport, setShowExport] = useState<"attendance" | "overtime" | "leave" | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [lastAttendanceState, setLastAttendanceState] = useState<Map<number, boolean>>(new Map());
  const [leaveFilterStatus, setLeaveFilterStatus] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [leaveSearchTerm, setLeaveSearchTerm] = useState("");
  const [leaveSortBy, setLeaveSortBy] = useState<"date-desc" | "date-asc" | "staff-name" | "leave-type">("date-desc");
  const [balanceUserId, setBalanceUserId] = useState("");
  const [balanceLeaveType, setBalanceLeaveType] = useState<"annual" | "sick" | "unpaid" | "maternity" | "other">("annual");
  const [balanceAllocatedDays, setBalanceAllocatedDays] = useState("21");
  const [leaveTypeDrafts, setLeaveTypeDrafts] = useState<Record<string, { label: string; description: string; isActive: boolean }>>({});
  const [showGpsMap, setShowGpsMap] = useState(false);
  const mapRef = useRef<google.maps.Map | null>(null);
  const [timesheetFilters, setTimesheetFilters] = useState<TimesheetFilterOptions>({
    startDate: null,
    endDate: null,
    overtimeStatus: 'all',
    staffName: '',
    sortBy: 'date-desc',
  });
  const [filteredAttendanceRecords, setFilteredAttendanceRecords] = useState<any[]>([]);
  const [waypointFilters, setWaypointFilters] = useState<WaypointFilterOptions>({
    date: '',
    staffName: '',
  });
  const [filteredWaypointRecords, setFilteredWaypointRecords] = useState<any[]>([]);

  useEffect(() => {
    setActiveTab(requestedTab);
  }, [requestedTab]);

  const waypointQueryInput = useMemo(() => ({}), []);

  // Queries with real-time polling for live updates
  const { data: stats, refetch: refetchStats } = trpc.attendance.getTodayAllStaff.useQuery(undefined, {
    refetchInterval: 1000,
  }) as any;
  const { data: leaveRequests, refetch: refetchRequests } = trpc.leave.getAll.useQuery(undefined, {
    refetchInterval: 2000,
  }) as any;
  const { data: leaveAnalytics, refetch: refetchLeaveAnalytics } = trpc.leave.analytics.useQuery(undefined, {
    refetchInterval: 5000,
  });
  const { data: leaveBalances, refetch: refetchLeaveBalances } = trpc.leave.getAllBalances.useQuery(undefined, {
    refetchInterval: 10000,
  });
  const { data: allLeaveTypes, isLoading: isLoadingLeaveTypes, isError: isLeaveTypesError, refetch: refetchLeaveTypes } = trpc.leave.getAllTypes.useQuery();
  const utils = trpc.useUtils();
  const updateLeaveBalanceMutation = trpc.leave.updateBalance.useMutation();
  const updateLeaveTypeMutation = trpc.leave.updateType.useMutation();

  useEffect(() => {
    if (allLeaveTypes) {
      setLeaveTypeDrafts(Object.fromEntries(allLeaveTypes.map((setting: any) => [setting.leaveType, {
        label: setting.label,
        description: setting.description || "",
        isActive: Boolean(setting.isActive),
      }])));
    }
  }, [allLeaveTypes]);

  const handleUpdateLeaveType = async (leaveType: string) => {
    const draft = leaveTypeDrafts[leaveType];
    if (!draft) return;
    try {
      await updateLeaveTypeMutation.mutateAsync({
        leaveType: leaveType as "annual" | "sick" | "unpaid" | "maternity" | "other",
        label: draft.label,
        description: draft.description || null,
        isActive: leaveType === "annual" ? true : draft.isActive,
      });
      await refetchLeaveTypes();
      utils.leave.getTypes.invalidate();
      toast.success(`${draft.label} settings saved`);
    } catch (error: any) {
      toast.error(error?.message || "Could not update leave type");
    }
  };
  const selectedLeaveBalanceRecord = useMemo(() => {
    const staffBalance = (leaveBalances || []).find((balance: any) => String(balance.userId) === balanceUserId);
    return (staffBalance as any)?.[balanceLeaveType] || null;
  }, [leaveBalances, balanceUserId, balanceLeaveType]);

  useEffect(() => {
    if (selectedLeaveBalanceRecord?.allocatedDays != null) {
      setBalanceAllocatedDays(String(selectedLeaveBalanceRecord.allocatedDays));
    } else if (balanceLeaveType === "annual") {
      setBalanceAllocatedDays("21");
    }
  }, [selectedLeaveBalanceRecord?.id, selectedLeaveBalanceRecord?.allocatedDays, balanceLeaveType]);

  const handleUpdateLeaveBalance = async () => {
    const userId = Number(balanceUserId);
    const allocatedDays = Number(balanceAllocatedDays);
    if (!Number.isInteger(userId) || userId <= 0) {
      toast.error("Select a staff member first");
      return;
    }
    if (!Number.isFinite(allocatedDays) || allocatedDays < 0 || allocatedDays > 365) {
      toast.error("Enter an allocation between 0 and 365 days");
      return;
    }
    if (balanceLeaveType === "annual" && allocatedDays !== 21) {
      toast.error("Annual leave is fixed at 21 working days");
      return;
    }
    try {
      await updateLeaveBalanceMutation.mutateAsync({
        userId,
        leaveType: balanceLeaveType,
        allocatedDays,
      });
      await Promise.all([refetchLeaveBalances(), refetchLeaveAnalytics()]);
      toast.success("Leave balance updated");
    } catch (error: any) {
      toast.error(error?.message || "Could not update leave balance");
    }
  };

  // Sort leave requests based on selected sort option
  const sortedLeaveRequests = leaveRequests ? [...leaveRequests].sort((a: any, b: any) => {
    switch (leaveSortBy) {
      case 'date-asc':
        return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
      case 'date-desc':
        return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
      case 'staff-name':
        return (a.staffName || '').localeCompare(b.staffName || '');
      case 'leave-type':
        return (a.leaveType || '').localeCompare(b.leaveType || '');
      default:
        return 0;
    }
  }) : [];

  const { data: staffList, refetch: refetchStaffList } = trpc.users.getAll.useQuery(undefined, {
    refetchInterval: 2000,
  });
  // Fetch attendance records based on date range
  const { data: attendanceRecords, refetch: refetchAttendance } = trpc.attendance.getAdminReports.useQuery(
    {
      startDate: attendanceStartDate,
      endDate: attendanceEndDate,
    },
    {
      refetchInterval: 5000, // Refetch every 5 seconds
    }
  );
  const { data: waypointRecordsData, isLoading: waypointsLoading } = trpc.waypoints.getHistory.useQuery(waypointQueryInput, {
    refetchInterval: WAYPOINT_REFRESH_INTERVAL_MS,
  });
  const waypointRecords = waypointRecordsData ?? EMPTY_WAYPOINT_RECORDS;
  const { data: analyticsMetrics, refetch: refetchAnalytics } = trpc.analytics.metrics.useQuery({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    endDate: new Date(),
  }, {
    refetchInterval: 30000,
  }) as any;

  // Mutations
  const approveRequestMutation = trpc.leave.approve.useMutation();
  const rejectRequestMutation = trpc.leave.reject.useMutation();
  const approveManyRequestMutation = trpc.leave.approveMany.useMutation();

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

  const handleBulkApprove = async () => {
    if (selectedLeaveRequestIds.length === 0) {
      toast.error("Select at least one pending leave request");
      return;
    }
    if (!bulkApprovalReason.trim()) {
      toast.error("Enter a reason for the bulk approval");
      return;
    }

    setIsProcessing(true);
    try {
      const result = await approveManyRequestMutation.mutateAsync({
        leaveRequestIds: selectedLeaveRequestIds,
        reason: bulkApprovalReason,
      });
      toast.success(`${result.approvedCount} leave request${result.approvedCount === 1 ? "" : "s"} approved and staff notified`);
      setSelectedLeaveRequestIds([]);
      setBulkApprovalReason("");
      await Promise.all([refetchRequests(), refetchLeaveAnalytics()]);
    } catch (error) {
      toast.error("Failed to approve selected leave requests");
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
  useEffect(() => {
    if (!Array.isArray(attendanceRecords)) return;

    const currentState = new Map<number, boolean>();
    const newNotifications: Notification[] = [];

    attendanceRecords.forEach((record: any) => {
      const isCheckedIn = record.checkInTime && !record.checkOutTime;
      const wasCheckedIn = lastAttendanceState.get(record.userId);
      const staff = staffList?.find((s: any) => s.id === record.userId);

      if (staff && isCheckedIn !== wasCheckedIn) {
        if (isCheckedIn && wasCheckedIn === false) {
          const checkInTime = new Date(record.checkInTime).getTime();
          newNotifications.push({
            id: `checkin-${record.userId}-${checkInTime}`,
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
          const checkOutTime = record.checkOutTime ? new Date(record.checkOutTime).getTime() : Date.now();
          newNotifications.push({
            id: `checkout-${record.userId}-${checkOutTime}`,
            type: "check-out",
            staffName: staff.name || "Unknown",
            message: "Checked out",
              timestamp: new Date(record.checkOutTime || Date.now()),
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
      setNotifications((prev) => {
        // Deduplicate notifications by ID
        const allNotifications = [...newNotifications, ...prev];
        const seen = new Set<string>();
        const unique = allNotifications.filter((n) => {
          if (seen.has(n.id)) return false;
          seen.add(n.id);
          return true;
        });
        return unique.slice(0, 50);
      });
    }

    setLastAttendanceState(currentState);
  }, [attendanceRecords, staffList]);

  // Apply filters and sorting to attendance records
  useEffect(() => {
    if (!Array.isArray(attendanceRecords)) {
      setFilteredAttendanceRecords([]);
      return;
    }

    let filtered = [...attendanceRecords];

    // Filter by date range
    if (timesheetFilters.startDate) {
      const startDate = new Date(timesheetFilters.startDate);
      filtered = filtered.filter((record: any) => {
        const recordDate = new Date(record.checkInTime);
        return recordDate >= startDate;
      });
    }

    if (timesheetFilters.endDate) {
      const endDate = new Date(timesheetFilters.endDate);
      endDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter((record: any) => {
        const recordDate = new Date(record.checkInTime);
        return recordDate <= endDate;
      });
    }

    // Filter by staff name
    if (timesheetFilters.staffName) {
      const searchLower = timesheetFilters.staffName.toLowerCase();
      filtered = filtered.filter((record: any) => {
        const name = (record.userName || `Staff ${record.userId}`).toLowerCase();
        return name.includes(searchLower);
      });
    }

    // Filter by overtime status
    if (timesheetFilters.overtimeStatus !== 'all') {
      filtered = filtered.filter((record: any) => {
        const hoursWorked = record.hoursWorked || 0;
        if (timesheetFilters.overtimeStatus === 'overtime') {
          return hoursWorked > 8;
        } else if (timesheetFilters.overtimeStatus === 'no-overtime') {
          return hoursWorked <= 8;
        }
        return true;
      });
    }

    // Apply sorting
    filtered.sort((a: any, b: any) => {
      switch (timesheetFilters.sortBy) {
        case 'date-asc':
          return new Date(a.checkInTime).getTime() - new Date(b.checkInTime).getTime();
        case 'date-desc':
          return new Date(b.checkInTime).getTime() - new Date(a.checkInTime).getTime();
        case 'hours-asc':
          return (a.hoursWorked || 0) - (b.hoursWorked || 0);
        case 'hours-desc':
          return (b.hoursWorked || 0) - (a.hoursWorked || 0);
        default:
          return 0;
      }
    });

    setFilteredAttendanceRecords(filtered);
  }, [attendanceRecords, timesheetFilters]);

  // Apply filters to actual waypoint records
  useEffect(() => {
    setFilteredWaypointRecords(filterWaypointRecords(Array.isArray(waypointRecords) ? waypointRecords : [], waypointFilters));
  }, [waypointRecords, waypointFilters]);

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
          <Card className="bg-gradient-to-br from-blue-700/60 via-blue-600/40 to-blue-800/50 border border-blue-500/50 hover:border-blue-400 transition-all duration-300 shadow-lg hover:shadow-blue-500/30 hover:scale-105">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-300 text-sm mb-1 font-medium">Total Staff</p>
                  <p className="text-4xl font-bold text-blue-50">{staffList?.length || 0}</p>
                  <p className="text-xs text-blue-400/80 mt-1">Active users</p>
                </div>
                <Users className="w-12 h-12 text-blue-400 opacity-90" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-emerald-700/60 via-emerald-600/40 to-slate-800/50 border border-emerald-500/50 hover:border-emerald-400 transition-all duration-300 shadow-lg hover:shadow-emerald-500/30 hover:scale-105">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-emerald-300 text-sm mb-1 font-medium">Present Today</p>
                  <p className="text-4xl font-bold text-emerald-50">{stats?.checkedInCount || 0}</p>
                  <p className="text-xs text-emerald-400/80 mt-1">Checked in</p>
                </div>
                <CheckCircle className="w-12 h-12 text-emerald-400 opacity-90" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-700/60 via-orange-600/40 to-orange-800/50 border border-orange-500/50 hover:border-orange-400 transition-all duration-300 shadow-lg hover:shadow-orange-500/30 hover:scale-105">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-300 text-sm mb-1 font-medium">Avg Hrs/Day</p>
                  <p className="text-4xl font-bold text-orange-50">{analyticsMetrics?.averageHoursPerDay || 0}h</p>
                  <p className="text-xs text-orange-400/80 mt-1">Last 30 days</p>
                </div>
                <Clock className="w-12 h-12 text-orange-400 opacity-90" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-rose-700/60 via-rose-600/40 to-rose-800/50 border border-rose-500/50 hover:border-rose-400 transition-all duration-300 shadow-lg hover:shadow-rose-500/30 hover:scale-105">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-rose-300 text-sm mb-1 font-medium">Pending</p>
                  <p className="text-4xl font-bold text-rose-50">{pendingRequests.length}</p>
                  <p className="text-xs text-rose-400/80 mt-1">Awaiting approval</p>
                </div>
                <AlertCircle className="w-12 h-12 text-rose-400 opacity-90" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="bg-gradient-to-r from-slate-800/80 via-slate-700/60 to-slate-800/80 border border-slate-600/50 backdrop-blur-sm flex w-full max-w-full flex-nowrap justify-start gap-2 overflow-x-auto h-auto p-3 rounded-lg shadow-xl hover:shadow-2xl transition-all duration-300">
            <TabsTrigger value="staff" className="shrink-0 px-4 py-2.5 rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-600 data-[state=active]:to-emerald-700 data-[state=active]:shadow-lg data-[state=active]:shadow-emerald-500/50 text-slate-300 data-[state=active]:text-white hover:text-white hover:bg-slate-700/50 transition-all duration-300 font-medium">
              <Users className="w-4 h-4 mr-2" />
              Staff
            </TabsTrigger>
            <TabsTrigger value="leave" className="shrink-0 px-4 py-2.5 rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-600 data-[state=active]:to-amber-700 data-[state=active]:shadow-lg data-[state=active]:shadow-amber-500/50 text-slate-300 data-[state=active]:text-white hover:text-white hover:bg-slate-700/50 transition-all duration-300 font-medium">
              <FileText className="w-4 h-4 mr-2" />
              Leave
            </TabsTrigger>
            <TabsTrigger value="attendance" className="shrink-0 px-4 py-2.5 rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-600 data-[state=active]:to-cyan-700 data-[state=active]:shadow-lg data-[state=active]:shadow-cyan-500/50 text-slate-300 data-[state=active]:text-white hover:text-white hover:bg-slate-700/50 transition-all duration-300 font-medium">
              <Clock className="w-4 h-4 mr-2" />
              Attendance
            </TabsTrigger>
            <TabsTrigger value="reports" className="shrink-0 px-4 py-2.5 rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-purple-700 data-[state=active]:shadow-lg data-[state=active]:shadow-purple-500/50 text-slate-300 data-[state=active]:text-white hover:text-white hover:bg-slate-700/50 transition-all duration-300 font-medium">
              <BarChart3 className="w-4 h-4 mr-2" />
              Reports
            </TabsTrigger>
            <TabsTrigger value="export" className="shrink-0 px-4 py-2.5 rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-600 data-[state=active]:to-indigo-700 data-[state=active]:shadow-lg data-[state=active]:shadow-indigo-500/50 text-slate-300 data-[state=active]:text-white hover:text-white hover:bg-slate-700/50 transition-all duration-300 font-medium">
              <Download className="w-4 h-4 mr-2" />
              Export
            </TabsTrigger>
            <TabsTrigger value="gpsmap" className="shrink-0 px-4 py-2.5 rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-rose-600 data-[state=active]:to-rose-700 data-[state=active]:shadow-lg data-[state=active]:shadow-rose-500/50 text-slate-300 data-[state=active]:text-white hover:text-white hover:bg-slate-700/50 transition-all duration-300 font-medium">
              <MapPin className="w-4 h-4 mr-2" />
              GPS Map
            </TabsTrigger>
            <TabsTrigger value="timesheet" className="shrink-0 px-4 py-2.5 rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-600 data-[state=active]:to-orange-700 data-[state=active]:shadow-lg data-[state=active]:shadow-orange-500/50 text-slate-300 data-[state=active]:text-white hover:text-white hover:bg-slate-700/50 transition-all duration-300 font-medium">
              <FileText className="w-4 h-4 mr-2" />
              Timesheet
            </TabsTrigger>
            <TabsTrigger value="admin-management" className="shrink-0 px-4 py-2.5 rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-pink-600 data-[state=active]:to-pink-700 data-[state=active]:shadow-lg data-[state=active]:shadow-pink-500/50 text-slate-300 data-[state=active]:text-white hover:text-white hover:bg-slate-700/50 transition-all duration-300 font-medium">
              <Shield className="w-4 h-4 mr-2" />
              Admin
            </TabsTrigger>
            <TabsTrigger value="monthly-reports" className="shrink-0 px-4 py-2.5 rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-violet-600 data-[state=active]:to-violet-700 data-[state=active]:shadow-lg data-[state=active]:shadow-violet-500/50 text-slate-300 data-[state=active]:text-white hover:text-white hover:bg-slate-700/50 transition-all duration-300 font-medium">
              <FileText className="w-4 h-4 mr-2" />
              Monthly Reports
            </TabsTrigger>
            <TabsTrigger value="data-management" className="shrink-0 px-4 py-2.5 rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-600 data-[state=active]:to-emerald-700 data-[state=active]:shadow-lg data-[state=active]:shadow-emerald-500/50 text-slate-300 data-[state=active]:text-white hover:text-white hover:bg-slate-700/50 transition-all duration-300 font-medium">
              <Database className="w-4 h-4 mr-2" />
              Data Management
            </TabsTrigger>
          </TabsList>

          {/* Monthly Reports Tab */}
          <TabsContent value="monthly-reports" className="space-y-6">
            <MonthlyReports mode="admin" />
          </TabsContent>

          {/* Data Management Tab */}
          <TabsContent value="data-management" className="space-y-6">
            <DataManagementTab />
          </TabsContent>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Live Staff Status */}
            <div>
              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5 text-blue-400" />
                Recent Check-ins
              </h3>
              <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
                <CardContent className="pt-6 space-y-3">
                  {staffList?.slice(0, 5).map((staff: any) => {
                    const staffAttendance = Array.isArray(attendanceRecords) ? attendanceRecords.find((att: any) => att.userId === staff.id) : null;
                    const isCheckedIn = staffAttendance && !staffAttendance.checkOutTime;
                    return (
                      <div key={staff.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-700/30 hover:bg-slate-700/50 border border-slate-600/30 hover:border-slate-500/50 transition-all duration-300">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${isCheckedIn ? "bg-green-500 animate-pulse" : "bg-red-500"}`} />
                            <p className="text-white font-medium">{staff.name}</p>
                            <p className="text-xs text-slate-400">ID: {staffAttendance?.staffNumber || staff.id}</p>
                          </div>
                          <p className="text-xs text-slate-400 mt-1">{staffAttendance ? new Date(staffAttendance.checkInTime).toLocaleString() : "N/A"}</p>
                        </div>
                        <Badge className={isCheckedIn ? "bg-green-600 hover:bg-green-700" : "bg-slate-600 hover:bg-slate-700"}>
                          {isCheckedIn ? "Checked In" : "Checked Out"}
                        </Badge>
                      </div>
                    );
                  })}
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
                      <p className="text-2xl font-bold text-white">{leaveAnalytics?.pendingRequests ?? leaveRequests?.filter((r: any) => r.status === "pending").length ?? 0}</p>
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
                      <p className="text-2xl font-bold text-white">{leaveAnalytics?.approvedRequests ?? leaveRequests?.filter((r: any) => r.status === "approved").length ?? 0}</p>
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
                      <p className="text-2xl font-bold text-white">{leaveAnalytics?.rejectedRequests ?? leaveRequests?.filter((r: any) => r.status === "rejected").length ?? 0}</p>
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
                      <p className="text-2xl font-bold text-white">{leaveAnalytics?.totalRequests ?? leaveRequests?.length ?? 0}</p>
                    </div>
                    <FileText className="w-8 h-8 text-blue-400" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Leave Analytics */}
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-white flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-cyan-400" />
                  Leave Analytics
                </CardTitle>
                <CardDescription className="text-slate-400">Live totals across all submitted leave requests</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="rounded-lg bg-slate-700/40 p-3">
                    <p className="text-xs text-slate-400">Requested days</p>
                    <p className="text-xl font-semibold text-white">{Number(leaveAnalytics?.totalRequestedDays ?? 0).toFixed(1)}</p>
                  </div>
                  <div className="rounded-lg bg-slate-700/40 p-3">
                    <p className="text-xs text-slate-400">Approved days</p>
                    <p className="text-xl font-semibold text-green-300">{Number(leaveAnalytics?.approvedDays ?? 0).toFixed(1)}</p>
                  </div>
                  <div className="rounded-lg bg-slate-700/40 p-3">
                    <p className="text-xs text-slate-400">Approval rate</p>
                    <p className="text-xl font-semibold text-blue-300">{leaveAnalytics?.approvalRate ?? 0}%</p>
                  </div>
                  <div className="rounded-lg bg-slate-700/40 p-3">
                    <p className="text-xs text-slate-400">Leave types</p>
                    <p className="text-xl font-semibold text-cyan-300">{leaveAnalytics?.byLeaveType?.length ?? 0}</p>
                  </div>
                </div>
                {leaveAnalytics?.byLeaveType?.length ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                    {leaveAnalytics.byLeaveType.map((item: any) => (
                      <div key={item.leaveType} className="rounded-lg border border-slate-700 bg-slate-900/30 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="capitalize text-sm font-medium text-white">{item.leaveType}</p>
                          <Badge className="bg-slate-700 text-slate-200">{item.totalRequests} requests</Badge>
                        </div>
                        <p className="mt-2 text-xs text-slate-400">
                          {Number(item.requestedDays).toFixed(1)} days requested · {Number(item.approvedDays).toFixed(1)} approved
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {item.pendingRequests} pending · {item.rejectedRequests} rejected
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">Analytics will appear after staff submit leave requests.</p>
                )}
              </CardContent>
            </Card>

            {/* Leave Balance Editor */}
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-white flex items-center gap-2">
                  <Edit2 className="w-5 h-5 text-purple-400" />
                  Leave Balance Editor
                </CardTitle>
                <CardDescription className="text-slate-400">Adjust an allocation without changing the staff member's used leave history.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label className="text-slate-300">Staff member</Label>
                    <Select value={balanceUserId || "not-selected"} onValueChange={(value) => setBalanceUserId(value === "not-selected" ? "" : value)}>
                      <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white"><SelectValue placeholder="Select staff" /></SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        <SelectItem value="not-selected" className="text-slate-400">Select staff</SelectItem>
                        {(staffList || []).map((staff: any) => <SelectItem key={staff.id} value={String(staff.id)} className="text-white">{staff.name || staff.email || `User ${staff.id}`}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-300">Leave type</Label>
                    <Select value={balanceLeaveType} onValueChange={(value) => { const nextType = value as typeof balanceLeaveType; setBalanceLeaveType(nextType); if (nextType === "annual") setBalanceAllocatedDays("21"); }}>
                      <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        {(["annual", "sick", "unpaid", "maternity", "other"] as const).map((type) => <SelectItem key={type} value={type} className="text-white capitalize">{type}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-300">Allocated days</Label>
                    <Input type="number" min="0" max="365" step="0.5" value={balanceAllocatedDays} disabled={balanceLeaveType === "annual"} onChange={(event) => setBalanceAllocatedDays(event.target.value)} className="bg-slate-700/50 border-slate-600 text-white disabled:opacity-70" />
                  </div>
                </div>
                <div className="flex flex-col gap-3 rounded-lg border border-purple-500/20 bg-purple-950/20 p-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-slate-400">Annual leave is fixed at 21 working days. Remaining days are recalculated from the existing used total, and historical requests are not deleted.</p>
                  <Button type="button" onClick={handleUpdateLeaveBalance} disabled={updateLeaveBalanceMutation.isPending} className="bg-purple-600 hover:bg-purple-700 text-white border-0 whitespace-nowrap">
                    {updateLeaveBalanceMutation.isPending ? "Saving..." : "Save balance"}
                  </Button>
                </div>
                {balanceUserId && (
                  <div className="rounded-lg border border-slate-700 bg-slate-900/30 p-3">
                    <p className="text-sm font-medium text-white">Current balance for {(leaveBalances || []).find((balance: any) => String(balance.userId) === balanceUserId)?.userName || `User ${balanceUserId}`}</p>
                    <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                      <div><p className="text-xs text-slate-400">Allocated</p><p className="text-lg font-semibold text-white">{Number(selectedLeaveBalanceRecord?.allocatedDays ?? 0).toFixed(1)} days</p></div>
                      <div><p className="text-xs text-slate-400">Used</p><p className="text-lg font-semibold text-amber-300">{Number(selectedLeaveBalanceRecord?.usedDays ?? 0).toFixed(1)} days</p></div>
                      <div><p className="text-xs text-slate-400">Remaining</p><p className="text-lg font-semibold text-green-300">{Number(selectedLeaveBalanceRecord?.remainingDays ?? 0).toFixed(1)} days</p></div>
                    </div>
                  </div>
                )}
                {leaveBalances && leaveBalances.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs text-slate-400">Select a staff member to review all current leave-type balances.</p>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
                      {leaveBalances.map((balance: any) => (
                        <button type="button" key={balance.userId} onClick={() => setBalanceUserId(String(balance.userId))} className={`rounded-lg border p-3 text-left hover:border-purple-400/60 ${String(balance.userId) === balanceUserId ? "border-purple-400 bg-purple-950/30" : "border-slate-700 bg-slate-900/30"}`}>
                          <p className="truncate text-sm font-medium text-white">{balance.userName || `User ${balance.userId}`}</p>
                          <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-slate-400">
                            {(["annual", "sick", "unpaid", "maternity"] as const).map((type) => <span key={type} className="capitalize">{type}: <strong className="text-slate-200">{Number(balance[type]?.remainingDays ?? 0).toFixed(1)}</strong></span>)}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Leave Type Management */}
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-white flex items-center gap-2">
                  <Filter className="w-5 h-5 text-cyan-400" />
                  Leave Type Management
                </CardTitle>
                <CardDescription className="text-slate-400">Control the labels and availability shown on new staff leave requests. Existing history is preserved.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {isLoadingLeaveTypes ? (
                  <p className="text-sm text-slate-400">Loading leave types...</p>
                ) : isLeaveTypesError ? (
                  <p className="rounded-lg border border-red-500/30 bg-red-950/20 p-3 text-sm text-red-200">Leave types could not be loaded. Refresh and try again.</p>
                ) : allLeaveTypes && allLeaveTypes.length > 0 ? (
                  allLeaveTypes.map((setting: any) => {
                  const draft = leaveTypeDrafts[setting.leaveType] || { label: setting.label, description: setting.description || "", isActive: Boolean(setting.isActive) };
                  return (
                    <div key={setting.leaveType} className="grid grid-cols-1 gap-3 rounded-lg border border-slate-700 bg-slate-900/30 p-3 lg:grid-cols-[1fr_1.5fr_auto_auto] lg:items-end">
                      <div className="space-y-1">
                        <Label className="text-xs capitalize text-slate-400">{setting.leaveType}</Label>
                        <Input value={draft.label} onChange={(event) => setLeaveTypeDrafts((current) => ({ ...current, [setting.leaveType]: { ...draft, label: event.target.value } }))} className="bg-slate-700/50 border-slate-600 text-white" aria-label={`${setting.leaveType} label`} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-slate-400">Description</Label>
                        <Input value={draft.description} onChange={(event) => setLeaveTypeDrafts((current) => ({ ...current, [setting.leaveType]: { ...draft, description: event.target.value } }))} className="bg-slate-700/50 border-slate-600 text-white" aria-label={`${setting.leaveType} description`} />
                      </div>
                      <label className="flex items-center gap-2 pb-2 text-sm text-slate-300">
                        <Checkbox checked={setting.leaveType === "annual" ? true : draft.isActive} disabled={setting.leaveType === "annual"} onCheckedChange={(checked) => setLeaveTypeDrafts((current) => ({ ...current, [setting.leaveType]: { ...draft, isActive: checked === true } }))} />
                        Active
                      </label>
                      <Button type="button" size="sm" onClick={() => handleUpdateLeaveType(setting.leaveType)} disabled={updateLeaveTypeMutation.isPending} className="bg-cyan-600 hover:bg-cyan-700 text-white border-0">Save</Button>
                    </div>
                  );
                  })
                ) : (
                  <p className="text-sm text-slate-400">No leave types are configured yet.</p>
                )}
              </CardContent>
            </Card>

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
                  <div className="flex gap-2 mt-3 flex-wrap">
                    <span className="text-sm text-slate-400 self-center">Sort by:</span>
                    <Button
                      onClick={() => setLeaveSortBy("date-desc")}
                      variant={leaveSortBy === "date-desc" ? "default" : "outline"}
                      className={leaveSortBy === "date-desc" ? "bg-blue-600 hover:bg-blue-700 text-white border-0 text-xs" : "border-slate-600 text-slate-300 hover:bg-slate-700 text-xs"}
                    >
                      Latest Date
                    </Button>
                    <Button
                      onClick={() => setLeaveSortBy("date-asc")}
                      variant={leaveSortBy === "date-asc" ? "default" : "outline"}
                      className={leaveSortBy === "date-asc" ? "bg-blue-600 hover:bg-blue-700 text-white border-0 text-xs" : "border-slate-600 text-slate-300 hover:bg-slate-700 text-xs"}
                    >
                      Earliest Date
                    </Button>
                    <Button
                      onClick={() => setLeaveSortBy("staff-name")}
                      variant={leaveSortBy === "staff-name" ? "default" : "outline"}
                      className={leaveSortBy === "staff-name" ? "bg-blue-600 hover:bg-blue-700 text-white border-0 text-xs" : "border-slate-600 text-slate-300 hover:bg-slate-700 text-xs"}
                    >
                      Staff Name
                    </Button>
                    <Button
                      onClick={() => setLeaveSortBy("leave-type")}
                      variant={leaveSortBy === "leave-type" ? "default" : "outline"}
                      className={leaveSortBy === "leave-type" ? "bg-blue-600 hover:bg-blue-700 text-white border-0 text-xs" : "border-slate-600 text-slate-300 hover:bg-slate-700 text-xs"}
                    >
                      Leave Type
                    </Button>
                  </div>
                </div>

                {pendingRequests.length > 0 && (
                  <div className="rounded-lg border border-amber-500/20 bg-amber-900/10 p-3 space-y-3">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <p className="text-sm font-medium text-amber-200">Bulk approval</p>
                        <p className="text-xs text-slate-400">Select pending requests to approve and notify together.</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedLeaveRequestIds(pendingRequests.map((request: any) => request.id))}
                          className="border-slate-600 text-slate-300 hover:bg-slate-700"
                        >
                          Select all pending
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedLeaveRequestIds([])}
                          className="border-slate-600 text-slate-300 hover:bg-slate-700"
                        >
                          Clear selection
                        </Button>
                      </div>
                    </div>
                    {selectedLeaveRequestIds.length > 0 && (
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <Input
                          value={bulkApprovalReason}
                          onChange={(event) => setBulkApprovalReason(event.target.value)}
                          placeholder="Reason for approving selected requests"
                          className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400"
                        />
                        <Button
                          type="button"
                          onClick={handleBulkApprove}
                          disabled={isProcessing}
                          className="bg-green-600 hover:bg-green-700 text-white border-0 whitespace-nowrap"
                        >
                          Approve {selectedLeaveRequestIds.length} selected
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {/* Leave Requests List */}
                {!leaveRequests || leaveRequests.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-400">No leave requests found</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {(sortedLeaveRequests || leaveRequests)
                      .filter((request: any) => {
                        const matchesStatus = leaveFilterStatus === "all" || request.status === leaveFilterStatus;
                        const matchesSearch = !leaveSearchTerm || 
                          request.staffName?.toLowerCase().includes(leaveSearchTerm.toLowerCase()) ||
                          request.staffEmail?.toLowerCase().includes(leaveSearchTerm.toLowerCase());
                        return matchesStatus && matchesSearch;
                      })
                      .map((request: any) => (
                        <div key={request.id} className="p-4 bg-slate-700/50 rounded-lg border border-slate-600/50 hover:border-blue-500/50 transition">
                          <div className="flex justify-between items-start mb-3 gap-3">
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                              {request.status === "pending" && (
                                <Checkbox
                                  checked={selectedLeaveRequestIds.includes(request.id)}
                                  onCheckedChange={(checked) => {
                                    setSelectedLeaveRequestIds((current) =>
                                      checked
                                        ? Array.from(new Set([...current, request.id]))
                                        : current.filter((id) => id !== request.id)
                                    );
                                  }}
                                  aria-label={`Select leave request from ${request.staffName || request.staffEmail || "staff member"}`}
                                  className="mt-1 border-slate-400 data-[state=checked]:bg-blue-600"
                                />
                              )}
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <User className="w-4 h-4 text-slate-400" />
                                <p className="text-white font-semibold">{request.staffName || "Staff Member"}</p>
                              </div>
                              <p className="text-xs text-slate-400 ml-6">{request.staffEmail || "No email"}</p>
                            </div>
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
                              <p className="text-white font-medium">{request.daysRequested ?? "N/A"}</p>
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
            {/* Today's Check-ins Summary */}
            <Card className="bg-gradient-to-br from-emerald-900/30 to-emerald-900/10 border-emerald-500/30">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                  Today's Check-ins
                </CardTitle>
                <CardDescription className="text-emerald-400/80">Staff who have checked in today</CardDescription>
              </CardHeader>
              <CardContent>
                {stats?.checkedInToday && stats.checkedInToday.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {stats.checkedInToday.map((staff: any, idx: number) => (
                      <div key={`today-checkin-${staff.userId}-${idx}`} className="bg-slate-700/50 p-3 rounded-lg border border-emerald-500/30">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-white font-semibold">{staff.userName || `Staff ${staff.userId}`}</p>
                            <p className="text-emerald-400 text-sm">ID: {staff.staffNumber || staff.userId}</p>
                            <p className="text-slate-400 text-xs mt-1">Check-in: {new Date(staff.checkInTime).toLocaleTimeString('en-US', { timeZone: 'Africa/Nairobi' })}</p>
                          </div>
                          <CheckCircle className="w-6 h-6 text-emerald-400" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-400 text-center py-4">No staff have checked in today</p>
                )}
              </CardContent>
            </Card>

            {/* Today's Check-outs Summary */}
            <Card className="bg-gradient-to-br from-blue-900/30 to-blue-900/10 border-blue-500/30">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <CheckCheck className="w-5 h-5 text-blue-400" />
                  Today's Check-outs
                </CardTitle>
                <CardDescription className="text-blue-400/80">Staff who have checked out today</CardDescription>
              </CardHeader>
              <CardContent>
                {stats?.checkedInToday && stats.checkedInToday.filter((s: any) => s.checkOutTime).length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {stats.checkedInToday.filter((staff: any) => staff.checkOutTime).map((staff: any, idx: number) => {
                      const checkInTime = new Date(staff.checkInTime);
                      const checkOutTime = new Date(staff.checkOutTime);
                      const hoursWorked = ((checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60)).toFixed(2);
                      return (
                        <div key={`today-checkout-${staff.userId}-${idx}`} className="bg-slate-700/50 p-3 rounded-lg border border-blue-500/30">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-white font-semibold">{staff.userName || `Staff ${staff.userId}`}</p>
                              <p className="text-blue-400 text-sm">ID: {staff.staffNumber || staff.userId}</p>
                              <p className="text-slate-400 text-xs mt-1">Check-out: {checkOutTime.toLocaleTimeString('en-US', { timeZone: 'Africa/Nairobi' })}</p>
                              <p className="text-yellow-400 text-xs mt-1">Hours: {hoursWorked}h</p>
                            </div>
                            <CheckCheck className="w-6 h-6 text-blue-400" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-slate-400 text-center py-4">No staff have checked out today</p>
                )}
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-400" />
                  Attendance Report
                </CardTitle>
                <CardDescription className="text-slate-400">View and export attendance records with filters</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Timesheet Filter Component */}
                <TimesheetFilter
                  onFilterChange={setTimesheetFilters}
                  totalRecords={Array.isArray(attendanceRecords) ? attendanceRecords.length : 0}
                  filteredRecords={filteredAttendanceRecords.length}
                />

                {/* Attendance Filters */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-slate-700/30 rounded-lg">
                  <div>
                    <Label className="text-slate-300 text-sm mb-2 block">Start Date</Label>
                    <Input
                      type="date"
                      value={attendanceStartDate}
                      onChange={(e) => {
                        setAttendanceStartDate(e.target.value);
                        // Filter records when date changes
                        const filtered = Array.isArray(attendanceRecords) ? attendanceRecords.filter((record: any) => {
                          const recordDate = new Date(record.checkInTime).toISOString().split('T')[0];
                          const startOk = !e.target.value || recordDate >= e.target.value;
                          const endOk = !attendanceEndDate || recordDate <= attendanceEndDate;
                          const staffOk = attendanceStaffFilter === 'all' || record.userId.toString() === attendanceStaffFilter;
                          return startOk && endOk && staffOk;
                        }) : [];
                        setFilteredAttendanceRecords(filtered);
                      }}
                      className="bg-slate-600/50 border-slate-600 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-300 text-sm mb-2 block">End Date</Label>
                    <Input
                      type="date"
                      value={attendanceEndDate}
                      onChange={(e) => {
                        setAttendanceEndDate(e.target.value);
                        // Filter records when date changes
                        const filtered = Array.isArray(attendanceRecords) ? attendanceRecords.filter((record: any) => {
                          const recordDate = new Date(record.checkInTime).toISOString().split('T')[0];
                          const startOk = !attendanceStartDate || recordDate >= attendanceStartDate;
                          const endOk = !e.target.value || recordDate <= e.target.value;
                          const staffOk = attendanceStaffFilter === 'all' || record.userId.toString() === attendanceStaffFilter;
                          return startOk && endOk && staffOk;
                        }) : [];
                        setFilteredAttendanceRecords(filtered);
                      }}
                      className="bg-slate-600/50 border-slate-600 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-300 text-sm mb-2 block">Staff Member</Label>
                    <Select value={attendanceStaffFilter} onValueChange={(value) => {
                      setAttendanceStaffFilter(value);
                      // Filter records when staff changes
                      const filtered = Array.isArray(attendanceRecords) ? attendanceRecords.filter((record: any) => {
                        const recordDate = new Date(record.checkInTime).toISOString().split('T')[0];
                        const startOk = !attendanceStartDate || recordDate >= attendanceStartDate;
                        const endOk = !attendanceEndDate || recordDate <= attendanceEndDate;
                        const staffOk = value === 'all' || record.userId.toString() === value;
                        return startOk && endOk && staffOk;
                      }) : [];
                      setFilteredAttendanceRecords(filtered);
                    }}>
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
                        if (filteredAttendanceRecords.length > 0) {
                          const reportData = filteredAttendanceRecords.map((record: any) => {
                            const checkInDate = new Date(record.checkInTime);
                            const checkOutDate = record.checkOutTime ? new Date(record.checkOutTime) : null;
                            const hoursWorked = checkOutDate ? ((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60)).toFixed(2) : 0;
                            return {
                              staffId: record.staffNumber || record.userId || 1,
                              name: record.userName || `Staff ${record.userId}`,
                              date: checkInDate.toISOString().split('T')[0],
                              checkInTime: checkInDate.toLocaleTimeString(),
                              checkOutTime: checkOutDate ? checkOutDate.toLocaleTimeString() : 'Not checked out',
                              hoursWorked: hoursWorked,
                              status: checkOutDate ? 'Present' : 'Checked In',
                              workModality: record.workModality || 'field',
                              checkInLat: record.checkInLat || 'N/A',
                              checkInLng: record.checkInLng || 'N/A',
                              checkInAccuracy: record.checkInAccuracy || 'N/A',
                              distance: record.distanceTraveled ? parseFloat(record.distanceTraveled as any) / 1000 : 0,
                            };
                          });
                          generateAttendanceReportCSV(reportData);
                          toast.success(`Exported ${reportData.length} records`);
                        } else {
                          toast.error('No attendance data available for selected filters');
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
                        <th className="text-left py-3 px-4 text-slate-300 font-semibold">Check-in Location</th>
                        <th className="text-left py-3 px-4 text-slate-300 font-semibold">Check-out Location</th>
                        <th className="text-left py-3 px-4 text-slate-300 font-semibold">Hours Worked</th>
                        <th className="text-left py-3 px-4 text-slate-300 font-semibold">Overtime (h)</th>
                        <th className="text-left py-3 px-4 text-slate-300 font-semibold">Distance (km)</th>
                        <th className="text-left py-3 px-4 text-slate-300 font-semibold">Waypoints</th>
                        <th className="text-left py-3 px-4 text-slate-300 font-semibold">Linked Output / KPI</th>
                        <th className="text-left py-3 px-4 text-slate-300 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAttendanceRecords.length > 0 ? (
                        filteredAttendanceRecords.map((record: any, index: number) => {
                          // Create unique key using userId + checkInTime to avoid duplicates
                          const uniqueKey = `${record.userId}-${new Date(record.checkInTime).getTime()}-${index}`;
                          return (
                          <tr key={uniqueKey} className="border-b border-slate-700/50 hover:bg-slate-700/30 transition">
                            <td className="py-3 px-4 text-white">{record.staffNumber || record.userId}</td>
                            <td className="py-3 px-4 text-white">{record.userName || `Staff ${record.userId}`}</td>
                            <td className="py-3 px-4 text-slate-400">{new Date(record.checkInTime).toISOString().split('T')[0]}</td>
                            <td className="py-3 px-4 text-slate-400">{new Date(record.checkInTime).toLocaleTimeString()}</td>
                            <td className="py-3 px-4">
                              {record.checkOutTime ? (
                                <span className="text-green-400 font-medium">{new Date(record.checkOutTime).toLocaleTimeString()}</span>
                              ) : (
                                <span className="text-slate-400">Not checked out</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-slate-400 min-w-48">
                              {(() => {
                                const locationSummary = formatAttendanceLocationSummary(record.checkInAddress, record.checkInLat, record.checkInLng);
                                return <><div>{locationSummary.address}</div><div className="font-mono text-[10px] text-slate-500">{locationSummary.coordinates}</div></>;
                              })()}
                            </td>
                            <td className="py-3 px-4 text-slate-400 min-w-48">
                              {(() => {
                                const locationSummary = formatAttendanceLocationSummary(record.checkOutAddress, record.checkOutLat, record.checkOutLng);
                                return <><div>{locationSummary.address}</div><div className="font-mono text-[10px] text-slate-500">{locationSummary.coordinates}</div></>;
                              })()}
                            </td>
                            <td className="py-3 px-4">
                              {record.hoursWorked > 0 ? (
                                <span className="text-yellow-300 font-semibold">{record.hoursWorked} h</span>
                              ) : (
                                <span className="text-slate-400">-</span>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              {record.overtimeHours && record.overtimeHours > 0 ? (
                                <span className="text-red-400 font-semibold">{record.overtimeHours} h</span>
                              ) : (
                                <span className="text-slate-400">0</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-slate-400">{record.distanceTraveled ? (parseFloat(record.distanceTraveled) / 1000).toFixed(2) : '0'}</td>
                            <td className="py-3 px-4 text-center">
                              {record.waypointCount && record.waypointCount > 0 ? (
                                <span className="bg-blue-600/30 text-blue-300 px-2 py-1 rounded text-xs font-semibold">{record.waypointCount}</span>
                              ) : (
                                <span className="text-slate-500">-</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-slate-400">
                              {record.kpiName ? record.kpiName : '-'}
                            </td>
                            <td className="py-3 px-4">
                              <Badge className={record.checkOutTime ? "bg-green-600" : "bg-blue-600"}>
                                {record.checkOutTime ? 'Present' : 'Checked In'}
                              </Badge>
                            </td>
                          </tr>
                        );
                        })
                      ) : (
                        <tr>
                          <td colSpan={13} className="py-4 px-4 text-center text-slate-400">
                            No staff checked in today
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Waypoints Display Section */}
                <div className="mt-6 pt-6 border-t border-slate-600">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                    <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
                      <MapPin className="w-5 h-5 text-blue-400" />
                      Location Waypoints
                    </h3>
                    <span className="text-xs text-slate-400">Live updates every 5 seconds</span>
                  </div>
                  <WaypointFilter
                    onFilterChange={setWaypointFilters}
                    totalRecords={waypointRecords?.length || 0}
                    filteredRecords={filteredWaypointRecords?.length || 0}
                  />
                  {waypointsLoading ? (
                    <p className="py-8 text-center text-slate-400">Loading waypoint history...</p>
                  ) : filteredWaypointRecords.length === 0 ? (
                    <div className="mt-4 rounded-lg border border-dashed border-slate-700 p-8 text-center">
                      <MapPin className="mx-auto mb-2 h-8 w-8 text-slate-600" />
                      <p className="text-slate-300 font-medium">
                        {waypointRecords.length === 0 ? 'No waypoint history has been recorded.' : 'No waypoints match the selected filters.'}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">Waypoint records appear here as staff move during field work.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
                      {filteredWaypointRecords.map((record: any) => (
                        <WaypointDisplay
                          key={record.id}
                          waypoint={{
                            id: record.id,
                            timestamp: new Date(record.timestamp),
                            latitude: Number(record.latitude),
                            longitude: Number(record.longitude),
                            accuracy: record.accuracy === null || record.accuracy === undefined ? null : Number(record.accuracy),
                            cumulativeDistance: record.cumulativeDistance === null || record.cumulativeDistance === undefined ? null : Number(record.cumulativeDistance),
                            altitude: record.altitude === null || record.altitude === undefined ? null : Number(record.altitude),
                          }}
                          staffName={record.staffName || `Staff ${record.staffId}`}
                          staffNumber={record.staffNumber || record.staffId}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports" className="space-y-4">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <FileText className="w-5 h-5 text-green-400" />
                  Leave Reporting
                </CardTitle>
                <CardDescription className="text-slate-400">Review live leave totals and export every request by status.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <div className="rounded-lg bg-amber-900/20 border border-amber-500/20 p-3">
                    <p className="text-xs text-amber-300">Pending</p>
                    <p className="text-xl font-semibold text-white">{leaveAnalytics?.pendingRequests ?? 0}</p>
                  </div>
                  <div className="rounded-lg bg-green-900/20 border border-green-500/20 p-3">
                    <p className="text-xs text-green-300">Approved</p>
                    <p className="text-xl font-semibold text-white">{leaveAnalytics?.approvedRequests ?? 0}</p>
                  </div>
                  <div className="rounded-lg bg-red-900/20 border border-red-500/20 p-3">
                    <p className="text-xs text-red-300">Rejected</p>
                    <p className="text-xl font-semibold text-white">{leaveAnalytics?.rejectedRequests ?? 0}</p>
                  </div>
                  <div className="rounded-lg bg-blue-900/20 border border-blue-500/20 p-3">
                    <p className="text-xs text-blue-300">Requested days</p>
                    <p className="text-xl font-semibold text-white">{Number(leaveAnalytics?.totalRequestedDays ?? 0).toFixed(1)}</p>
                  </div>
                  <div className="rounded-lg bg-cyan-900/20 border border-cyan-500/20 p-3">
                    <p className="text-xs text-cyan-300">Approval rate</p>
                    <p className="text-xl font-semibold text-white">{leaveAnalytics?.approvalRate ?? 0}%</p>
                  </div>
                </div>
                <Button
                  onClick={() => {
                    if (leaveRequests?.length) {
                      generateLeaveReportCSV(toLeaveReportRows(leaveRequests));
                      toast.success(`Exported ${leaveRequests.length} leave requests`);
                    } else {
                      toast.error("No leave request data available to export");
                    }
                  }}
                  className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white border-0 gap-2"
                >
                  <Download className="w-4 h-4" />
                  Export Leave Report CSV
                </Button>
              </CardContent>
            </Card>

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
                    if (Array.isArray(attendanceRecords) && attendanceRecords.length > 0) {
                      const reportData = attendanceRecords.map((record: any) => ({
                        staffId: record.userId || 1,
                        name: record.userName || `Staff ${record.userId}`,
                        date: new Date(record.checkInTime).toISOString().split('T')[0],
                        checkInTime: new Date(record.checkInTime).toLocaleTimeString(),
                        checkOutTime: record.checkOutTime ? new Date(record.checkOutTime).toLocaleTimeString() : 'Not checked out',
                        status: record.checkOutTime ? 'Present' : 'Checked In',
                        distance: record.distanceTraveled ? parseFloat(record.distanceTraveled as any) / 1000 : 0,
                      }));
                      generateAttendanceReportCSV(reportData);
                    } else {
                      toast.error('No attendance data available to export');
                    }
                  }} className="bg-blue-600 hover:bg-blue-700 h-20 text-white border-0 flex flex-col items-center justify-center gap-2">
                    <Download className="w-5 h-5" />
                    <span>Attendance Report</span>
                  </Button>
                  <Button onClick={() => {
                    if (Array.isArray(attendanceRecords) && attendanceRecords.length > 0) {
                      const reportData = attendanceRecords
                        .filter((record: any) => record.checkOutTime)
                        .map((record: any) => {
                          const checkInTime = new Date(record.checkInTime);
                          const checkOutTime = new Date(record.checkOutTime);
                          const hoursWorked = (checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);
                          const overtimeHours = hoursWorked > 8 ? hoursWorked - 8 : 0;
                          return {
                            staffId: record.userId || 1,
                            name: record.userName || `Staff ${record.userId}`,
                            date: new Date(record.checkInTime).toISOString().split('T')[0],
                            overtimeHours: parseFloat(overtimeHours.toFixed(2)),
                            reason: 'Work extension',
                          };
                        })
                        .filter((r: any) => r.overtimeHours > 0);
                      
                      if (reportData.length > 0) {
                        generateOvertimeReportCSV(reportData);
                      } else {
                        toast.info('No overtime recorded for this period');
                      }
                    } else {
                      toast.error('No attendance data available to export');
                    }
                  }} className="bg-purple-600 hover:bg-purple-700 h-20 text-white border-0 flex flex-col items-center justify-center gap-2">
                    <Download className="w-5 h-5" />
                    <span>Overtime Report</span>
                  </Button>
                  <Button onClick={() => {
                    if (leaveRequests && leaveRequests.length > 0) {
                      const reportData = toLeaveReportRows(leaveRequests);
                      generateLeaveReportCSV(reportData);
                    } else {
                      toast.error('No leave request data available to export');
                    }
                  }} className="bg-green-600 hover:bg-green-700 h-20 text-white border-0 flex flex-col items-center justify-center gap-2">
                    <Download className="w-5 h-5" />
                    <span>Leave Report</span>
                  </Button>
                  <Button onClick={() => {
                    if (Array.isArray(attendanceRecords) && attendanceRecords.length > 0) {
                      const reportData = attendanceRecords.map((record: any) => ({
                        staffId: record.userId || 1,
                        name: record.userName || `Staff ${record.userId}`,
                        date: new Date(record.checkInTime).toISOString().split('T')[0],
                        checkInLocation: record.checkInAddress || (record.workModality ? record.workModality.replace(/_/g, ' ') : 'Field'),
                        checkOutLocation: record.checkOutAddress || (record.workModality ? record.workModality.replace(/_/g, ' ') : 'Field'),
                        totalDistance: record.distanceTraveled ? parseFloat(record.distanceTraveled as any) / 1000 : 0,
                        waypointCount: 0,
                      }));
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
                      if (Array.isArray(attendanceRecords) && window.google?.maps?.marker?.AdvancedMarkerElement) {
                        attendanceRecords.forEach((record: any) => {
                          if (record.checkInLat && record.checkInLng) {
                            const marker = new window.google.maps.marker.AdvancedMarkerElement({
                              map,
                              position: { lat: parseFloat(record.checkInLat), lng: parseFloat(record.checkInLng) },
                              title: record.userName || `Staff ${record.userId}`,
                            });
                            const infoWindow = new window.google.maps.InfoWindow({
                              content: `<div class="text-black p-2"><strong>${record.userName || `Staff ${record.userId}`}</strong><br/>Checked in at ${new Date(record.checkInTime).toLocaleTimeString()}</div>`,
                            });
                            marker.addListener('click', () => {
                              infoWindow.open(map, marker);
                            });
                          }
                        });
                      }
                    }}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                  <Card className="bg-slate-700 border-slate-600">
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <p className="text-slate-400 text-sm">Staff Checked In</p>
                        <p className="text-2xl font-bold text-green-400">{Array.isArray(attendanceRecords) ? attendanceRecords.length : 0}</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-slate-700 border-slate-600">
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <p className="text-slate-400 text-sm">Last Update</p>
                        <p className="text-sm font-mono text-blue-400">{Array.isArray(attendanceRecords) && attendanceRecords.length > 0 ? new Date(attendanceRecords[0].checkInTime).toLocaleTimeString() : 'N/A'}</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-slate-700 border-slate-600">
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <p className="text-slate-400 text-sm">Accuracy</p>
                        <p className="text-sm font-mono text-yellow-400">{Array.isArray(attendanceRecords) && attendanceRecords.length > 0 && attendanceRecords[0].checkInAccuracy ? (typeof attendanceRecords[0].checkInAccuracy === 'number' ? attendanceRecords[0].checkInAccuracy.toFixed(1) : parseFloat(attendanceRecords[0].checkInAccuracy as any).toFixed(1)) : 'N/A'}m</p>
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
                        <span className="text-white font-mono">{Array.isArray(attendanceRecords) && attendanceRecords.length > 0 && attendanceRecords[0].checkInLat ? (typeof attendanceRecords[0].checkInLat === 'number' ? attendanceRecords[0].checkInLat.toFixed(6) : parseFloat(attendanceRecords[0].checkInLat as any).toFixed(6)) : 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Longitude:</span>
                        <span className="text-white font-mono">{Array.isArray(attendanceRecords) && attendanceRecords.length > 0 && attendanceRecords[0].checkInLng ? (typeof attendanceRecords[0].checkInLng === 'number' ? attendanceRecords[0].checkInLng.toFixed(6) : parseFloat(attendanceRecords[0].checkInLng as any).toFixed(6)) : 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Check-in Time:</span>
                        <span className="text-white font-mono">{Array.isArray(attendanceRecords) && attendanceRecords.length > 0 && attendanceRecords[0].checkInTime ? new Date(attendanceRecords[0].checkInTime).toLocaleString() : 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Total Staff Checked In:</span>
                        <span className="text-white font-mono">{Array.isArray(attendanceRecords) ? attendanceRecords.length : 0}</span>
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
          <TabsContent value="timesheet" className="space-y-4">
            <TimesheetDetailedView />
          </TabsContent>

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
                      if (Array.isArray(attendanceRecords) && window.google?.maps?.marker?.AdvancedMarkerElement) {
                        attendanceRecords.forEach((record: any) => {
                          if (record.checkInLat && record.checkInLng) {
                            new window.google.maps.marker.AdvancedMarkerElement({
                              map,
                              position: { lat: parseFloat(record.checkInLat), lng: parseFloat(record.checkInLng) },
                              title: `${record.userName || `Staff ${record.userId}`}`,
                            });
                          }
                        });
                      }
                      if (Array.isArray(attendanceRecords) && window.google?.maps?.marker?.AdvancedMarkerElement) {
                        attendanceRecords.forEach((record: any) => {
                          if (record.checkInLat && record.checkInLng) {
                            new window.google.maps.marker.AdvancedMarkerElement({
                              map,
                              position: { lat: parseFloat(record.checkInLat), lng: parseFloat(record.checkInLng) },
                              title: `${record.userName || `Staff ${record.userId}`}`,
                            });
                          }
                        });
                      }
                      if (Array.isArray(attendanceRecords) && window.google?.maps?.marker?.AdvancedMarkerElement) {
                        attendanceRecords.forEach((record: any) => {
                          if (record.checkInLat && record.checkInLng) {
                            new window.google.maps.marker.AdvancedMarkerElement({
                              map,
                              position: { lat: parseFloat(record.checkInLat), lng: parseFloat(record.checkInLng) },
                              title: `${record.userName || `Staff ${record.userId}`}`,
                            });
                          }
                        });
                      }
                      if (Array.isArray(attendanceRecords) && window.google?.maps?.marker?.AdvancedMarkerElement) {
                        attendanceRecords.forEach((record: any) => {
                          if (record.checkInLat && record.checkInLng) {
                            new window.google.maps.marker.AdvancedMarkerElement({
                              map,
                              position: { lat: parseFloat(record.checkInLat), lng: parseFloat(record.checkInLng) },
                              title: `${record.userName || `Staff ${record.userId}`}`,
                            });
                          }
                        });
                      }
                      if (Array.isArray(attendanceRecords) && window.google?.maps?.marker?.AdvancedMarkerElement) {
                        attendanceRecords.forEach((record: any) => {
                          if (record.checkInLat && record.checkInLng) {
                            new window.google.maps.marker.AdvancedMarkerElement({
                              map,
                              position: { lat: parseFloat(record.checkInLat), lng: parseFloat(record.checkInLng) },
                              title: `${record.userName || `Staff ${record.userId}`}`,
                            });
                          }
                        });
                      }
                      if (Array.isArray(attendanceRecords) && window.google?.maps?.marker?.AdvancedMarkerElement) {
                        attendanceRecords.forEach((record: any) => {
                          if (record.checkInLat && record.checkInLng) {
                            new window.google.maps.marker.AdvancedMarkerElement({
                              map,
                              position: { lat: parseFloat(record.checkInLat), lng: parseFloat(record.checkInLng) },
                              title: `${record.userName || `Staff ${record.userId}`}`,
                            });
                          }
                        });
                      }
                      if (Array.isArray(attendanceRecords) && window.google?.maps?.marker?.AdvancedMarkerElement) {
                        attendanceRecords.forEach((record: any) => {
                          if (record.checkInLat && record.checkInLng) {
                            new window.google.maps.marker.AdvancedMarkerElement({
                              map,
                              position: { lat: parseFloat(record.checkInLat), lng: parseFloat(record.checkInLng) },
                              title: `${record.userName || `Staff ${record.userId}`}`,
                            });
                          }
                        });
                      }
                      if (Array.isArray(attendanceRecords) && window.google?.maps?.marker?.AdvancedMarkerElement) {
                        attendanceRecords.forEach((record: any) => {
                          if (record.checkInLat && record.checkInLng) {
                            new window.google.maps.marker.AdvancedMarkerElement({
                              map,
                              position: { lat: parseFloat(record.checkInLat), lng: parseFloat(record.checkInLng) },
                              title: `${record.userName || `Staff ${record.userId}`}`,
                            });
                          }
                        });
                      }
                      if (Array.isArray(attendanceRecords) && window.google?.maps?.marker?.AdvancedMarkerElement) {
                        attendanceRecords.forEach((record: any) => {
                          if (record.checkInLat && record.checkInLng) {
                            new window.google.maps.marker.AdvancedMarkerElement({
                              map,
                              position: { lat: parseFloat(record.checkInLat), lng: parseFloat(record.checkInLng) },
                              title: `${record.userName || `Staff ${record.userId}`}`,
                            });
                          }
                        });
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
