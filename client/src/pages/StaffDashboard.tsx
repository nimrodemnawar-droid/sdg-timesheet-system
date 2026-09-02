import React, { useMemo, useState, useEffect, useRef } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { countKenyaWorkingDays } from "../../../shared/leave";
import { shouldRetryGpsCapture } from "../../../shared/location";
import { countCompletedAttendanceDays } from "../../../shared/attendanceSummary";
import { isTimesheetSubmittedForAttendance } from "../../../shared/checkoutEligibility";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, MapPin, Clock, AlertCircle, CheckCircle2, FileUp, Activity, Briefcase, Target, Plus, Trash2, Navigation, Calendar, History } from "lucide-react";
import { LoadingAnimationButton, SuccessToastContent, ErrorToastContent } from "@/components/LoadingAnimationButton";
import { toast } from "sonner";
import { NotificationBanner } from "@/components/NotificationBanner";
import { WaypointTracker } from "@/components/WaypointTracker";
import { LeaveCalendar } from "@/components/LeaveCalendar";
import { WorkplaceSelector } from "@/components/WorkplaceSelector";
import { GPSStatusIndicator } from "@/components/GPSStatusIndicator";
import { MapView } from "@/components/Map";
import { OvertimeAlert, OvertimeIndicator } from "@/components/OvertimeAlert";
import { OvertimeWaypointPanel } from "@/components/OvertimeWaypointPanel";

interface GPSCoordinates {
  latitude: number;
  longitude: number;
  accuracy: number;
}

const ACTIVITY_CATEGORIES = [
  "Meeting", "Training", "Mobilisation", "Planning", "Reporting", "Follow Up", "Programme Implementation", "Community Outreach", "Monitoring & Evaluation", "Data Collection", "Stakeholder Engagement", "Administrative Work", "Field Visit", "Other",
];

const ORGANIZATIONS = [
  { label: "ICY Africa", value: "icy_africa" },
  { label: "Africa for SDGs", value: "africa_for_sdgs" },
  { label: "Joint", value: "joint" },
];

const DEPARTMENT_FUNCTIONS = ["Programme", "Admin", "Finance", "Communication", "Monitoring & Evaluation", "Partnerships", "Other"];
const LOCATION_PLATFORMS = [
  { label: "Physical location", value: "physical_location" }, { label: "Zoom", value: "zoom" }, { label: "WhatsApp", value: "whatsapp" }, { label: "Email", value: "email" }, { label: "School", value: "school" }, { label: "Church", value: "church" }, { label: "Other", value: "other" },
] as const;
const EVIDENCE_TYPES = [
  { label: "Report", value: "report" }, { label: "Photo", value: "photo" }, { label: "Email", value: "email" }, { label: "Registration list", value: "registration_list" }, { label: "Document", value: "document" }, { label: "Social media link", value: "social_media_link" }, { label: "Other", value: "other" },
] as const;

const WORK_MODALITIES = [
  { label: "Nairobi Office", value: "nairobi_office" },
  { label: "Homa Bay Office", value: "homa_bay_office" },
  { label: "Field", value: "field" },
  { label: "Remote", value: "remote" },
];

const TASK_DURATIONS = [
  { label: "0–1 hour", value: "0_1_hour" },
  { label: "2 hours", value: "2_hours" },
  { label: "3 hours", value: "3_hours" },
  { label: "4 hours", value: "4_hours" },
  { label: "5–8 hours", value: "5_8_hours" },
] as const;

const COUNTRIES = [
  "Kenya",
  "Uganda",
  "Tanzania",
  "Rwanda",
  "Burundi",
  "South Sudan",
  "Ethiopia",
  "Somalia",
  "Democratic Republic of the Congo",
  "Ghana",
  "Nigeria",
  "South Africa",
  "Other",
] as const;

type TaskDuration = (typeof TASK_DURATIONS)[number]["value"];
type CountryCoordinationDraft = { country: string; participantsAttended: string };
type TimesheetTaskDraft = {
  estimatedDuration: TaskDuration;
  activityType: string;
  taskDescription: string;
  specificActivity: string;
  targetStakeholder: string;
  locationPlatform: string;
  tangibleOutput: string;
  numbersReached: string;
  outcomeResults: string;
  followUpRequired: "yes" | "no";
  evidenceType: string;
  evidenceLink: string;
  activityStatus: "completed" | "ongoing" | "pending";
  onlineMissionary: boolean;
  onlineMissionaryParticipants: string;
  challenges: string;
  includesCoordination: boolean;
  countries: CountryCoordinationDraft[];
};

const createTaskDraft = (): TimesheetTaskDraft => ({
  estimatedDuration: "0_1_hour",
  activityType: "",
  taskDescription: "",
  specificActivity: "",
  targetStakeholder: "",
  locationPlatform: "",
  tangibleOutput: "",
  numbersReached: "",
  outcomeResults: "",
  followUpRequired: "no",
  evidenceType: "",
  evidenceLink: "",
  activityStatus: "completed",
  onlineMissionary: false,
  onlineMissionaryParticipants: "",
  challenges: "",
  includesCoordination: false,
  countries: [{ country: "", participantsAttended: "" }],
});

const createInitialTimesheetData = () => ({
  date: new Date().toISOString().split("T")[0],
  workModality: "field",
  organization: "",
  departmentFunction: "",
  programProject: "",
  activityCategory: "",
  program: "",
  kpi: "none",
  staffRemarks: "",
  evidenceFile: null as File | null,
  tasks: [createTaskDraft()],
});

interface Waypoint {
  id: number;
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: Date;
  cumulativeDistance: number;
}

export default function StaffDashboard() {
  const { user } = useAuth();
  const [gpsCoordinates, setGpsCoordinates] = useState<GPSCoordinates | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [checkInSuccess, setCheckInSuccess] = useState(false);
  const [checkOutSuccess, setCheckOutSuccess] = useState(false);
  const [checkInError, setCheckInError] = useState(false);
  const [checkOutError, setCheckOutError] = useState(false);
  const [lastCheckInAddress, setLastCheckInAddress] = useState<string>("");
  const [lastCheckOutAddress, setLastCheckOutAddress] = useState<string>("");
  const [isSubmittingTimesheet, setIsSubmittingTimesheet] = useState(false);
  const [submittedAttendanceId, setSubmittedAttendanceId] = useState<number | null>(null);
  const submitTimesheetMutation = trpc.attendance.submitTimesheet.useMutation({
    onSuccess: async () => {
      toast.success('Timesheet submitted successfully!');
      setTimesheetData(createInitialTimesheetData());
      // Refresh the attendance record so the checkout gate sees isSubmitted=true immediately.
      await utils.attendance.getToday.invalidate();
      await utils.attendance.getStaffAttendance.invalidate();
      await refetchAttendance();
    },
    onError: (error) => {
      toast.error(`Failed to submit timesheet: ${error.message}`);
    },
  });
  const [gpsStatus, setGpsStatus] = useState<"idle" | "acquiring" | "ready">("idle");
  const [activeTab, setActiveTab] = useState("check-in");
  const [showGpsMap, setShowGpsMap] = useState(false);
  const mapRef = useRef<google.maps.Map | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const watchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Timesheet form state. Tasks are repeatable and remain separate from the attendance record.
  const { data: activityCategoriesData } = trpc.system.getActivityCategories.useQuery();
  const [timesheetData, setTimesheetData] = useState(createInitialTimesheetData);

  const updateTask = (taskIndex: number, patch: Partial<TimesheetTaskDraft>) => {
    setTimesheetData((current) => ({
      ...current,
      tasks: current.tasks.map((task, index) => index === taskIndex ? { ...task, ...patch } : task),
    }));
  };

  const addTask = () => {
    setTimesheetData((current) => current.tasks.length >= 4 ? current : ({ ...current, tasks: [...current.tasks, createTaskDraft()] }));
  };

  const removeTask = (taskIndex: number) => {
    setTimesheetData((current) => ({
      ...current,
      tasks: current.tasks.length === 1 ? current.tasks : current.tasks.filter((_, index) => index !== taskIndex),
    }));
  };

  const updateCountry = (taskIndex: number, countryIndex: number, patch: Partial<CountryCoordinationDraft>) => {
    setTimesheetData((current) => ({
      ...current,
      tasks: current.tasks.map((task, index) => index !== taskIndex ? task : {
        ...task,
        countries: task.countries.map((country, index) => index === countryIndex ? { ...country, ...patch } : country),
      }),
    }));
  };

  const addCountry = (taskIndex: number) => {
    setTimesheetData((current) => ({
      ...current,
      tasks: current.tasks.map((task, index) => index !== taskIndex ? task : {
        ...task,
        countries: [...task.countries, { country: "", participantsAttended: "" }],
      }),
    }));
  };

  const removeCountry = (taskIndex: number, countryIndex: number) => {
    setTimesheetData((current) => ({
      ...current,
      tasks: current.tasks.map((task, index) => index !== taskIndex ? task : {
        ...task,
        countries: task.countries.length === 1 ? task.countries : task.countries.filter((_, index) => index !== countryIndex),
      }),
    }));
  };

  // Waypoint state
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [isAddingWaypoint, setIsAddingWaypoint] = useState(false);
  const [waypointNote, setWaypointNote] = useState("");

  // Leave request form state
  const [leaveFormData, setLeaveFormData] = useState({
    leaveType: '',
    startDate: '',
    endDate: '',
    reason: '',
  });
  const [isSubmittingLeave, setIsSubmittingLeave] = useState(false);

  // Workplace selection state
  const [selectedWorkplace, setSelectedWorkplace] = useState<string>("field");

  const { data: todayAttendance, refetch: refetchAttendance } = trpc.attendance.getToday.useQuery();
  const currentMonthKey = new Date().toISOString().slice(0, 7);
  const [historyMonth, setHistoryMonth] = useState(currentMonthKey);
  const historyRange = useMemo(() => {
    const [year, month] = historyMonth.split("-").map(Number);
    const lastDay = new Date(year, month, 0).getDate();
    return { startDate: `${historyMonth}-01`, endDate: `${historyMonth}-${String(lastDay).padStart(2, "0")}` };
  }, [historyMonth]);
  const currentMonthRange = useMemo(() => {
    const [year, month] = currentMonthKey.split("-").map(Number);
    const lastDay = new Date(year, month, 0).getDate();
    return { startDate: `${currentMonthKey}-01`, endDate: `${currentMonthKey}-${String(lastDay).padStart(2, "0")}` };
  }, [currentMonthKey]);
  const { data: monthlyTimesheetHistory, isLoading: isLoadingTimesheetHistory } = trpc.timesheet.getMyComplete.useQuery(historyRange);
  const { data: monthlyAttendance = [] } = trpc.attendance.getMyHistory.useQuery(currentMonthRange, { refetchInterval: 5000 });
  const workedDaysThisMonth = useMemo(() => countCompletedAttendanceDays(monthlyAttendance as any[]), [monthlyAttendance]);
  const { data: allLeaveBalances } = trpc.leave.getAllBalances.useQuery(undefined, { refetchInterval: 5000, refetchOnWindowFocus: true });
  const { data: activeLeaveTypes = [], isLoading: isLoadingLeaveTypes, isError: isLeaveTypesError } = trpc.leave.getTypes.useQuery();
  const myLeaveBalance = useMemo(() => (allLeaveBalances || []).find((balance: any) => balance.userId === user?.id), [allLeaveBalances, user?.id]);
  const { data: myLeaveRequests, isLoading: isLoadingLeaveRequests } = trpc.leave.getMyRequests.useQuery();
  const { data: todayWaypoints, refetch: refetchWaypoints } = trpc.attendance.getWaypoints.useQuery(
    todayAttendance?.id ? { attendanceId: todayAttendance.id } : { attendanceId: 0 },
    { enabled: !!todayAttendance?.id }
  );
  const utils = trpc.useUtils();
  const checkInMutation = trpc.attendance.checkIn.useMutation({
    onSuccess: () => {
      // Invalidate all attendance-related queries to trigger immediate updates
      utils.attendance.getToday.invalidate();
      utils.attendance.getStaffAttendance.invalidate();
    },
  });
  const checkOutMutation = trpc.attendance.checkOut.useMutation({
    onSuccess: async () => {
      // Invalidate all attendance-related queries to trigger immediate updates
      await utils.attendance.getToday.invalidate();
      await utils.attendance.getStaffAttendance.invalidate();
      // Refetch to ensure latest data is displayed
      await refetchAttendance();
    },
  });
  const addWaypointMutation = trpc.attendance.addWaypoint.useMutation({
    onSuccess: () => {
      // Invalidate waypoint queries
      utils.attendance.getWaypoints.invalidate();
    },
  });
  const isAdminDepartment = timesheetData.departmentFunction.trim().toLowerCase() === "admin";

  const submitLeaveRequest = trpc.leave.createRequest.useMutation({
    onSuccess: () => {
      toast.success('Leave request submitted successfully!');
      setLeaveFormData({ leaveType: '', startDate: '', endDate: '', reason: '' });
      utils.leave.getMyRequests.invalidate();
      utils.leave.getAllBalances.invalidate();
    },
    onError: (error: any) => {
      toast.error(`Failed to submit leave request: ${error.message}`);
    },
  });

  // Acquire GPS coordinates with improved reliability
  const acquireGPS = () => {
    setGpsStatus("acquiring");
    setGpsError(null);

    if (!navigator.geolocation) {
      setGpsError("Geolocation is not supported by your browser. Please use a modern browser with location support.");
      setGpsStatus("idle");
      return;
    }

    // Stop any previous watch
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (watchTimeoutRef.current) {
      clearTimeout(watchTimeoutRef.current);
      watchTimeoutRef.current = null;
    }

    let bestPosition: GeolocationPosition | null = null;
    let bestAccuracy = Infinity;

    // Use watchPosition for more reliable GPS acquisition
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        // Keep track of the most accurate position
        if (position.coords.accuracy < bestAccuracy) {
          bestAccuracy = position.coords.accuracy;
          bestPosition = position;
        }

        // If we have a good accuracy (<50m), use it immediately
        if (position.coords.accuracy < 50) {
          const coords = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          };
          
          console.log("🔴 DEBUG: GPS COORDINATES CAPTURED FROM DEVICE");
          console.log(`Latitude: ${coords.latitude}`);
          console.log(`Longitude: ${coords.longitude}`);
          console.log(`Accuracy: ${coords.accuracy}m (HIGH ACCURACY)`);
          
          setGpsCoordinates(coords);
          setGpsStatus("ready");
          
          // Stop watching
          if (watchIdRef.current !== null) {
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
          }
          if (watchTimeoutRef.current) {
            clearTimeout(watchTimeoutRef.current);
            watchTimeoutRef.current = null;
          }
        }
      },
      (error) => {
        console.error("GPS acquisition failed:", error.message);
        console.error("Error code:", error.code);
        
        let errorMsg = "GPS Error: ";
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMsg += "Location permission denied. Please enable location access in your browser settings and try again.";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMsg += "Location information is unavailable. Please ensure location services are enabled on your device.";
            break;
          case error.TIMEOUT:
            errorMsg += "GPS acquisition timed out. Please try again in an area with better GPS signal.";
            break;
          default:
            errorMsg += error.message;
        }
        
        setGpsError(errorMsg);
        setGpsStatus("idle");
        setGpsCoordinates(null);
        
        if (watchIdRef.current !== null) {
          navigator.geolocation.clearWatch(watchIdRef.current);
          watchIdRef.current = null;
        }
      },
      { enableHighAccuracy: true, timeout: 30000, maximumAge: 0 }
    );

    // Set a timeout to stop watching after 30 seconds
    watchTimeoutRef.current = setTimeout(() => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }

      // Use the best position we got, even if not perfect
      if (bestPosition) {
        const coords = {
          latitude: bestPosition.coords.latitude,
          longitude: bestPosition.coords.longitude,
          accuracy: bestPosition.coords.accuracy,
        };
        
        console.log("🔴 DEBUG: GPS COORDINATES CAPTURED (BEST AVAILABLE)");
        console.log(`Latitude: ${coords.latitude}`);
        console.log(`Longitude: ${coords.longitude}`);
        console.log(`Accuracy: ${coords.accuracy}m`);
        
        setGpsCoordinates(coords);
        setGpsStatus("ready");
      } else {
        setGpsError("Could not acquire GPS coordinates. Please ensure location services are enabled and try again.");
        setGpsStatus("idle");
        setGpsCoordinates(null);
      }
    }, 30000);
  };

  const handleCheckIn = async () => {
    if (!gpsCoordinates) {
      toast.error("GPS coordinates required. Please click 'Acquire GPS' first.");
      return;
    }

    // Warn if GPS accuracy is poor but allow check-in (GPS is optional)
    if (gpsCoordinates.accuracy > 1000) {
      toast.warning(`GPS accuracy is poor (${gpsCoordinates.accuracy.toFixed(0)}m). Check-in will proceed but location may be inaccurate. Try moving to an open area for better signal.`);
    }

    // Workplace selection is now optional - use GPS location if available
    // if (!selectedWorkplace) {
    //   toast.error("Please select a workplace");
    //   return;
    // }

    setIsCheckingIn(true);
    setCheckInError(false);
    setCheckInSuccess(false);
    try {
      const result = await checkInMutation.mutateAsync({
        latitude: gpsCoordinates.latitude,
        longitude: gpsCoordinates.longitude,
        accuracy: gpsCoordinates.accuracy,
        timestamp: new Date().toISOString(),
      });
      
      // Show success with location details from reverse geocoding
      const address = (result as any)?.checkInAddress || selectedWorkplace || "Current location";
      setLastCheckInAddress(address);
      setCheckInSuccess(true);
      
      toast.success(
        <SuccessToastContent
          title="Checked in successfully"
          location={address}
          accuracy={gpsCoordinates.accuracy}
          timestamp={new Date()}
        />
      );
      
      // Reset success state after 3 seconds
      setTimeout(() => setCheckInSuccess(false), 3000);
      await refetchAttendance();
    } catch (error: any) {
      setCheckInError(true);
      toast.error(
        <ErrorToastContent
          title="Check-in failed"
          message={error?.message || "Unable to process your check-in. Please try again."}
          retryable={true}
        />
      );
      // Reset error state after 3 seconds
      setTimeout(() => setCheckInError(false), 3000);
    } finally {
      setIsCheckingIn(false);
    }
  };

  const handleCheckOut = async () => {
    if (!gpsCoordinates) {
      toast.error("Please acquire GPS coordinates first");
      return;
    }

    if (!todayAttendance?.id) {
      toast.error("No active check-in found");
      return;
    }

    const timesheetSubmittedForAttendance = isTimesheetSubmittedForAttendance(todayAttendance, submittedAttendanceId);
    if (!timesheetSubmittedForAttendance) {
      toast.error("Submit your timesheet before checking out");
      setActiveTab("timesheet");
      return;
    }

    // Warn if GPS accuracy is poor but allow check-out (GPS is optional)
    if (gpsCoordinates.accuracy > 1000) {
      toast.warning(`GPS accuracy is poor (${gpsCoordinates.accuracy.toFixed(0)}m). Check-out will proceed but location may be inaccurate.`);
    }

    setIsCheckingOut(true);
    setCheckOutError(false);
    setCheckOutSuccess(false);
    try {
      const result = await checkOutMutation.mutateAsync({
        latitude: gpsCoordinates.latitude,
        longitude: gpsCoordinates.longitude,
        accuracy: gpsCoordinates.accuracy,
        timestamp: new Date().toISOString(),
      });
      
      // Show success with location details from reverse geocoding
      const address = (result as any)?.checkOutAddress || "Current location";
      setLastCheckOutAddress(address);
      setCheckOutSuccess(true);
      
      toast.success(
        <SuccessToastContent
          title="Checked out successfully"
          location={address}
          accuracy={gpsCoordinates.accuracy}
          timestamp={new Date()}
        />
      );
      
      // Reset success state after 3 seconds
      setTimeout(() => setCheckOutSuccess(false), 3000);
      await refetchAttendance();
    } catch (error: any) {
      console.error('Check-out error:', error);
      setCheckOutError(true);
      toast.error(
        <ErrorToastContent
          title="Check-out failed"
          message={error?.message || "Unable to process your check-out. Please try again."}
          retryable={true}
        />
      );
      // Reset error state after 3 seconds
      setTimeout(() => setCheckOutError(false), 3000);
    } finally {
      setIsCheckingOut(false);
    }
  };

  const isCheckedIn = todayAttendance?.checkInTime && !todayAttendance?.checkOutTime;
  const hasSubmittedTimesheet = isTimesheetSubmittedForAttendance(todayAttendance, submittedAttendanceId);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-2 sm:p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Notification Banner */}
        <div className="mb-6">
          <NotificationBanner />
        </div>

        {/* Header */}
        <div className="space-y-2">
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <div className="flex items-center gap-3">
              <Briefcase className="w-8 h-8 text-blue-400" />
              <h1 className="text-2xl md:text-4xl font-bold text-white">Staff Dashboard</h1>
            </div>
            {user?.staffNumber && (
              <div className="bg-gradient-to-r from-purple-600 to-blue-600 px-4 py-2 rounded-lg md:ml-auto w-fit">
                <p className="text-white font-bold text-sm md:text-lg">Staff #{String(user.staffNumber).padStart(3, '0')}</p>
              </div>
            )}
          </div>
          <p className="text-slate-300">Welcome, {user?.name}. Track your time and activities.</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-blue-500/30 hover:border-blue-400 transition-all duration-300 shadow-lg">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm mb-1 font-medium">Status Today</p>
                  <p className="text-2xl font-bold text-white">
                    {isCheckedIn ? "Checked In" : "Not Checked In"}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {todayAttendance?.checkInTime
                      ? new Date(todayAttendance.checkInTime).toLocaleTimeString()
                      : "No check-in yet"}
                  </p>
                </div>
                <Activity className="w-10 h-10 text-blue-400 opacity-80" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-green-500/30 hover:border-green-400 transition-all duration-300 shadow-lg">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm mb-1 font-medium">Leave Balance</p>
                  <p className="text-2xl font-bold text-white">{myLeaveBalance?.annual?.remainingDays ?? 0}</p>
                  <p className="text-xs text-slate-500 mt-1">Annual leave days</p>
                </div>
                <Clock className="w-10 h-10 text-green-400 opacity-80" />
              </div>
            </CardContent>
          </Card>

          <Card className={`bg-gradient-to-br from-slate-800 to-slate-900 transition-all duration-300 shadow-lg ${
            todayAttendance?.checkOutTime && (new Date(todayAttendance.checkOutTime).getTime() - new Date(todayAttendance.checkInTime).getTime()) / (1000 * 60 * 60) > 8
              ? 'border-red-500/30 hover:border-red-400'
              : 'border-yellow-500/30 hover:border-yellow-400'
          }`}>
            <CardContent className="pt-6">
              {todayAttendance?.checkOutTime && (new Date(todayAttendance.checkOutTime).getTime() - new Date(todayAttendance.checkInTime).getTime()) / (1000 * 60 * 60) > 8 && (
                <div className="mb-4">
                  <OvertimeAlert
                    hoursWorked={parseFloat(((new Date(todayAttendance.checkOutTime).getTime() - new Date(todayAttendance.checkInTime).getTime()) / (1000 * 60 * 60)).toFixed(2))}
                    overtimeHours={parseFloat((((new Date(todayAttendance.checkOutTime).getTime() - new Date(todayAttendance.checkInTime).getTime()) / (1000 * 60 * 60)) - 8).toFixed(2))}
                    isOvertime={true}
                    compact={false}
                  />
                </div>
              )}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm mb-1 font-medium">Hours Worked Today</p>
                  <p className={`text-2xl font-bold ${
                    todayAttendance?.checkOutTime && (new Date(todayAttendance.checkOutTime).getTime() - new Date(todayAttendance.checkInTime).getTime()) / (1000 * 60 * 60) > 8
                      ? 'text-red-400'
                      : 'text-white'
                  }`}>
                    {todayAttendance?.checkOutTime
                      ? (
                          (new Date(todayAttendance.checkOutTime).getTime() - new Date(todayAttendance.checkInTime).getTime()) /
                          (1000 * 60 * 60)
                        ).toFixed(2)
                      : "0.00"}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">hours</p>
                </div>
                <Clock className={`w-10 h-10 opacity-80 ${
                  todayAttendance?.checkOutTime && (new Date(todayAttendance.checkOutTime).getTime() - new Date(todayAttendance.checkInTime).getTime()) / (1000 * 60 * 60) > 8
                    ? 'text-red-400'
                    : 'text-yellow-400'
                }`} />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-cyan-500/30 hover:border-cyan-400 transition-all duration-300 shadow-lg">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div><p className="text-slate-400 text-sm mb-1 font-medium">Worked Days This Month</p><p className="text-2xl font-bold text-white">{workedDaysThisMonth}</p><p className="text-xs text-slate-500 mt-1">Completed check-in and check-out days</p></div>
                <Calendar className="w-10 h-10 text-cyan-400 opacity-80" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-amber-500/30 hover:border-amber-400 transition-all duration-300 shadow-lg">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm mb-1 font-medium">GPS Status</p>
                  <p className="text-2xl font-bold text-white">
                    {gpsStatus === "ready" ? "Ready" : gpsStatus === "acquiring" ? "Acquiring..." : "Idle"}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {gpsCoordinates ? `Accuracy: ${gpsCoordinates.accuracy.toFixed(1)}m` : "No coordinates"}
                  </p>
                </div>
                <MapPin className="w-10 h-10 text-amber-400 opacity-80" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Overtime & Waypoints Panel */}
        {todayAttendance && (
          <div className="mb-6">
            <OvertimeWaypointPanel
              hoursWorked={todayAttendance.checkOutTime ? 
                parseFloat(((new Date(todayAttendance.checkOutTime).getTime() - new Date(todayAttendance.checkInTime).getTime()) / (1000 * 60 * 60)).toFixed(2))
                : 0
              }
              overtimeHours={todayAttendance.checkOutTime ? 
                Math.max(0, parseFloat(((new Date(todayAttendance.checkOutTime).getTime() - new Date(todayAttendance.checkInTime).getTime()) / (1000 * 60 * 60)).toFixed(2)) - 8)
                : 0
              }
              waypoints={todayWaypoints || []}
              totalDistance={todayAttendance.distanceTraveled ? parseFloat(String(todayAttendance.distanceTraveled)) : 0}
              checkInTime={todayAttendance.checkInTime}
              checkOutTime={todayAttendance.checkOutTime}
            />
          </div>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="flex w-full max-w-full min-h-12 justify-start gap-1 overflow-x-auto overflow-y-hidden flex-nowrap whitespace-nowrap bg-slate-800/50 border border-slate-700 backdrop-blur-sm p-1">
            <TabsTrigger value="check-in" className="data-[state=active]:bg-blue-600 text-slate-300 data-[state=active]:text-white shrink-0 min-w-max text-xs sm:text-sm">
              <MapPin className="w-4 h-4 mr-2" />
              Check In/Out
            </TabsTrigger>
            <TabsTrigger value="timesheet" className="data-[state=active]:bg-blue-600 text-slate-300 data-[state=active]:text-white shrink-0 min-w-max text-xs sm:text-sm">
              <Briefcase className="w-4 h-4 mr-2" />
              Timesheet
            </TabsTrigger>
            <TabsTrigger value="history" className="data-[state=active]:bg-cyan-600 text-slate-300 data-[state=active]:text-white shrink-0 min-w-max text-xs sm:text-sm"><History className="w-4 h-4 mr-2" />Monthly History</TabsTrigger>
            <TabsTrigger value="activities" className="data-[state=active]:bg-blue-600 text-slate-300 data-[state=active]:text-white shrink-0 min-w-max text-xs sm:text-sm">
              <Activity className="w-4 h-4 mr-2" />
              Activities
            </TabsTrigger>
            <TabsTrigger value="waypoints" className="data-[state=active]:bg-blue-600 text-slate-300 data-[state=active]:text-white shrink-0 min-w-max text-xs sm:text-sm">
              <Navigation className="w-4 h-4 mr-2" />
              Waypoints
            </TabsTrigger>
            <TabsTrigger value="leave" className="data-[state=active]:bg-purple-600 text-slate-300 data-[state=active]:text-white shrink-0 min-w-max text-xs sm:text-sm">
              <AlertCircle className="w-4 h-4 mr-2" />
              Request Leave
            </TabsTrigger>
            <TabsTrigger value="calendar" className="data-[state=active]:bg-indigo-600 text-slate-300 data-[state=active]:text-white shrink-0 min-w-max text-xs sm:text-sm">
              <Calendar className="w-4 h-4 mr-2" />
              Leave Calendar
            </TabsTrigger>
          </TabsList>

          {/* Check In/Out Tab */}
          <TabsContent value="check-in" className="space-y-4">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-blue-400" />
                  GPS Check In/Out
                  {user?.staffNumber && (
                    <span className="ml-auto bg-purple-600 px-3 py-1 rounded text-sm font-bold">Staff #{String(user.staffNumber).padStart(3, '0')}</span>
                  )}
                </CardTitle>
                <CardDescription className="text-slate-400">Use GPS to check in and out of work</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Workplace Selection */}
                <WorkplaceSelector
                  value={selectedWorkplace}
                  onChange={setSelectedWorkplace}
                  disabled={isCheckedIn}
                />

                {/* GPS Status Indicator */}
                {gpsCoordinates && (
                  <GPSStatusIndicator
                    accuracy={gpsCoordinates.accuracy}
                    latitude={gpsCoordinates.latitude}
                    longitude={gpsCoordinates.longitude}
                    lastUpdated={new Date()}
                    isSearching={gpsStatus === "acquiring"}
                  />
                )}

                {/* GPS Status */}
                {gpsError && (
                  <div className="p-4 bg-red-900/20 border border-red-500/50 rounded-lg flex gap-3">
                    <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-red-300 font-medium">GPS Error</p>
                      <p className="text-red-200 text-sm">{gpsError}</p>
                      <Button type="button" size="sm" onClick={acquireGPS} disabled={gpsStatus === "acquiring"} className="mt-3 bg-red-700 hover:bg-red-600 text-white">Retry GPS capture</Button>
                    </div>
                  </div>
                )}

                {gpsCoordinates && (
                  <div className="p-4 bg-green-900/20 border border-green-500/50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 className="w-5 h-5 text-green-400" />
                      <p className="text-green-300 font-medium">GPS Acquired</p>
                    </div>
                    <div className="text-sm text-green-200 space-y-1">
                      <p>Latitude: {gpsCoordinates.latitude.toFixed(8)}</p>
                      <p>Longitude: {gpsCoordinates.longitude.toFixed(8)}</p>
                      <p>Accuracy: {gpsCoordinates.accuracy.toFixed(1)}m</p>
                    </div>
                  </div>
                )}

                {/* GPS Buttons */}
                <div className="space-y-3">
                  <Button
                    onClick={acquireGPS}
                    disabled={gpsStatus === "acquiring"}
                    className="w-full bg-blue-600 hover:bg-blue-700 h-12 text-white border-0 text-base"
                  >
                    {gpsStatus === "acquiring" ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Acquiring GPS...
                      </>
                    ) : (
                      <>
                        <MapPin className="w-4 h-4 mr-2" />
                        Acquire GPS Coordinates
                      </>
                    )}
                  </Button>

                  {shouldRetryGpsCapture(false, gpsCoordinates?.accuracy) && (
                    <Button type="button" onClick={acquireGPS} disabled={gpsStatus === "acquiring"} variant="outline" className="w-full border-amber-500/60 text-amber-200 hover:bg-amber-900/30 h-11">
                      Retry for better accuracy
                    </Button>
                  )}

                  {gpsCoordinates && (
                    <Button
                      onClick={() => setShowGpsMap(true)}
                      className="w-full bg-purple-600 hover:bg-purple-700 h-12 text-white border-0 text-base"
                    >
                      <MapPin className="w-4 h-4 mr-2" />
                      View GPS Location on Map
                    </Button>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      onClick={handleCheckIn}
                      disabled={!gpsCoordinates || isCheckingIn || isCheckedIn}
                      className={`h-12 text-white border-0 font-semibold text-base ${
                        isCheckedIn
                          ? 'bg-gray-500 cursor-not-allowed opacity-50'
                          : 'bg-green-600 hover:bg-green-700'
                      }`}
                      title={!gpsCoordinates ? 'Acquire GPS coordinates first' : isCheckedIn ? 'Already checked in' : ''}
                    >
                      {isCheckingIn ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Checking In...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                          Check In
                        </>
                      )}
                    </Button>

                    <Button
                      onClick={handleCheckOut}
                      disabled={!gpsCoordinates || isCheckingOut || !isCheckedIn || !hasSubmittedTimesheet}
                      className={`h-12 text-white border-0 font-semibold text-base ${
                        !isCheckedIn
                          ? 'bg-gray-500 cursor-not-allowed opacity-50'
                          : 'bg-red-600 hover:bg-red-700'
                      }`}
                      title={!gpsCoordinates ? 'Acquire GPS coordinates first' : !isCheckedIn ? 'Check in first to enable check out' : !hasSubmittedTimesheet ? 'Submit your timesheet before checking out' : ''}
                    >
                      {isCheckingOut ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Checking Out...
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-4 h-4 mr-2" />
                          Check Out
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Help Text */}
                  {!gpsCoordinates && (
                    <div className="p-3 bg-yellow-900/30 border border-yellow-600/50 rounded-lg">
                      <p className="text-sm text-yellow-200">📍 <strong>GPS Required:</strong> Click "Acquire GPS Coordinates" above to enable Check In/Out</p>
                    </div>
                  )}
                  {gpsCoordinates && !isCheckedIn && (
                    <div className="p-3 bg-blue-900/30 border border-blue-600/50 rounded-lg">
                      <p className="text-sm text-blue-200">✓ <strong>Ready to Check In:</strong> Click the Check In button to start your day</p>
                    </div>
                  )}
                  {isCheckedIn && !hasSubmittedTimesheet && (
                    <div className="p-3 bg-amber-900/30 border border-amber-600/50 rounded-lg">
                      <p className="text-sm text-amber-200">Before checking out, open the Timesheet tab, complete every task, and press <strong>Submit Timesheet</strong>.</p>
                    </div>
                  )}
                  {isCheckedIn && hasSubmittedTimesheet && (
                    <div className="p-3 bg-green-900/30 border border-green-600/50 rounded-lg">
                      <p className="text-sm text-green-200">✓ <strong>Timesheet submitted:</strong> Check Out is ready when you finish your day.</p>
                    </div>
                  )}
                </div>

                {/* Today's Attendance Summary */}
                {todayAttendance && (
                  <div className="p-4 bg-slate-700/50 rounded-lg border border-slate-600/50">
                    <p className="text-white font-medium mb-3">Today's Summary</p>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Check In:</span>
                        <span className="text-white">
                          {todayAttendance.checkInTime
                            ? new Date(todayAttendance.checkInTime).toLocaleTimeString()
                            : "-"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Check Out:</span>
                        <span className="text-white">
                          {todayAttendance.checkOutTime
                            ? new Date(todayAttendance.checkOutTime).toLocaleTimeString()
                            : "-"}
                        </span>
                      </div>
                      <div className="flex justify-between border-t border-slate-600 pt-2">
                        <span className="text-slate-400">Duration:</span>
                        <span className="text-white font-medium">
                          {todayAttendance.durationMinutes
                            ? `${Math.floor(todayAttendance.durationMinutes / 60)}h ${todayAttendance.durationMinutes % 60}m`
                            : "In Progress"}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Timesheet Tab */}
          <TabsContent value="timesheet" className="space-y-4">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-blue-400" />
                  Daily Timesheet
                </CardTitle>
                <CardDescription className="text-slate-400">Submit your daily work activities and hours</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-slate-300">Date (Today Only)</Label>
                    <div className="bg-slate-700/50 border border-slate-600 rounded-md px-3 py-2 text-white">
                      {new Date(timesheetData.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </div>
                    <p className="text-xs text-slate-400 mt-1">Timesheet can only be submitted for today. Past days cannot be edited.</p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-slate-300">Activity Type (Task 1) *</Label>
                    <Select value={timesheetData.tasks[0]?.activityType || "not-selected"} onValueChange={(value) => updateTask(0, { activityType: value === "not-selected" ? "" : value })}>
                      <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white"><SelectValue placeholder="Choose activity type" /></SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700"><SelectItem value="not-selected" className="text-slate-400">Choose activity type</SelectItem>{ACTIVITY_CATEGORIES.map((item) => <SelectItem key={item} value={item} className="text-white">{item}</SelectItem>)}</SelectContent>
                    </Select>
                    <p className="text-xs text-slate-500">Additional tasks can use their own activity type inside each task card.</p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-slate-300">Organisation *</Label>
                    <Select value={timesheetData.organization || "not-selected"} onValueChange={(value) => setTimesheetData({ ...timesheetData, organization: value === "not-selected" ? "" : value })}>
                      <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white"><SelectValue placeholder="Choose organisation" /></SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700"><SelectItem value="not-selected" className="text-slate-400">Choose organisation</SelectItem>{ORGANIZATIONS.map((item) => <SelectItem key={item.value} value={item.value} className="text-white">{item.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-slate-300">Department / Function *</Label>
                    <Select value={timesheetData.departmentFunction || "not-selected"} onValueChange={(value) => setTimesheetData({ ...timesheetData, departmentFunction: value === "not-selected" ? "" : value })}>
                      <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white"><SelectValue placeholder="Choose function" /></SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700"><SelectItem value="not-selected" className="text-slate-400">Choose function</SelectItem>{DEPARTMENT_FUNCTIONS.map((item) => <SelectItem key={item} value={item} className="text-white">{item}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-slate-300">Programme / Project <span className="text-slate-500">(optional)</span></Label>
                    <Input value={timesheetData.programProject} onChange={(event) => setTimesheetData({ ...timesheetData, programProject: event.target.value })} placeholder="Specific programme or project" className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400" />
                  </div>

                </div>

                <div className="space-y-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <Label className="text-white text-base">Work Tasks</Label>
                      <p className="text-xs text-slate-400 mt-1">Add up to four tasks. The fields below change automatically based on your department and selected activity mode.</p>
                    </div>
                    <Button type="button" onClick={addTask} disabled={timesheetData.tasks.length >= 4} variant="outline" className="border-blue-500/50 text-blue-300 hover:bg-blue-900/30"><Plus className="w-4 h-4 mr-2" />{timesheetData.tasks.length >= 4 ? "Maximum 4 Tasks" : "Add Task"}</Button>
                  </div>

                  {timesheetData.tasks.map((task, taskIndex) => (
                    <div key={`task-${taskIndex}`} className="rounded-xl border border-slate-600 bg-slate-700/30 p-4 space-y-4">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="text-white font-semibold">Task {taskIndex + 1}</h3>
                        {timesheetData.tasks.length > 1 && <Button type="button" size="sm" variant="ghost" onClick={() => removeTask(taskIndex)} className="text-red-300 hover:text-red-200 hover:bg-red-900/20"><Trash2 className="w-4 h-4 mr-1" />Remove</Button>}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {taskIndex > 0 && <div className="space-y-2">
                          <Label className="text-slate-300">Activity Type *</Label>
                          <Select value={task.activityType || "not-selected"} onValueChange={(value) => updateTask(taskIndex, { activityType: value === "not-selected" ? "" : value })}>
                            <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white"><SelectValue placeholder="Choose activity type" /></SelectTrigger>
                            <SelectContent className="bg-slate-800 border-slate-700"><SelectItem value="not-selected" className="text-slate-400">Choose activity type</SelectItem>{ACTIVITY_CATEGORIES.map((item) => <SelectItem key={item} value={item} className="text-white">{item}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>}
                        <div className="space-y-2">
                          <Label className="text-slate-300">Estimated Time *</Label>
                          <Select value={task.estimatedDuration} onValueChange={(value) => updateTask(taskIndex, { estimatedDuration: value as TaskDuration })}>
                            <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white"><SelectValue /></SelectTrigger>
                            <SelectContent className="bg-slate-800 border-slate-700">{TASK_DURATIONS.map((duration) => <SelectItem key={duration.value} value={duration.value} className="text-white">{duration.label}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        {!isAdminDepartment && <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-2 rounded-lg border border-slate-600 bg-slate-800/40 p-3">
                          <Button type="button" variant={task.includesCoordination ? "default" : "outline"} onClick={() => updateTask(taskIndex, { includesCoordination: !task.includesCoordination, onlineMissionary: false })} className={task.includesCoordination ? "w-full bg-indigo-600 hover:bg-indigo-700 text-white border-0" : "w-full border-slate-600 text-slate-300 hover:bg-slate-700"}>
                            {task.includesCoordination ? "Multi-country Coordination selected" : "Add Multi-country Coordination"}
                          </Button>
                          <Button type="button" variant={task.onlineMissionary ? "default" : "outline"} onClick={() => updateTask(taskIndex, { onlineMissionary: !task.onlineMissionary, includesCoordination: false })} className={task.onlineMissionary ? "w-full bg-cyan-600 hover:bg-cyan-700 text-white border-0" : "w-full border-slate-600 text-slate-300 hover:bg-slate-700"}>
                            {task.onlineMissionary ? "Online Missionary selected" : "Add Online Missionary"}
                          </Button>
                          <p className="sm:col-span-2 text-xs text-slate-400">Optional: leave both unselected for the standard task fields.</p>
                        </div>}
                      </div>
                      <div className="space-y-2"><Label className="text-slate-300">Specific Activity *</Label><Textarea value={task.specificActivity} onChange={(event) => updateTask(taskIndex, { specificActivity: event.target.value, taskDescription: event.target.value })} placeholder={`What specific activity did you complete for Task ${taskIndex + 1}?`} className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400 min-h-20" /></div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {!isAdminDepartment && !task.includesCoordination && !task.onlineMissionary && <>
                          <div className="space-y-2"><Label className="text-slate-300">Target / Stakeholder</Label><Input value={task.targetStakeholder} onChange={(event) => updateTask(taskIndex, { targetStakeholder: event.target.value })} placeholder="Who was this activity directed to?" className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400" /></div>
                          <div className="space-y-2"><Label className="text-slate-300">Location / Platform</Label><Select value={task.locationPlatform || "not-selected"} onValueChange={(value) => updateTask(taskIndex, { locationPlatform: value === "not-selected" ? "" : value })}><SelectTrigger className="bg-slate-700/50 border-slate-600 text-white"><SelectValue placeholder="Choose location or platform" /></SelectTrigger><SelectContent className="bg-slate-800 border-slate-700"><SelectItem value="not-selected" className="text-slate-400">Choose location or platform</SelectItem>{LOCATION_PLATFORMS.map((item) => <SelectItem key={item.value} value={item.value} className="text-white">{item.label}</SelectItem>)}</SelectContent></Select></div>
                        </>}
                        {!isAdminDepartment && !task.onlineMissionary && <div className="space-y-2"><Label className="text-slate-300">Tangible Output</Label><Textarea value={task.tangibleOutput} onChange={(event) => updateTask(taskIndex, { tangibleOutput: event.target.value })} placeholder="What was produced or accomplished?" className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400 min-h-20" /></div>}
                        {!task.includesCoordination && !task.onlineMissionary && <div className="space-y-2"><Label className="text-slate-300">Numbers Reached / Engaged</Label><Input type="number" min="0" step="1" value={task.numbersReached} onChange={(event) => updateTask(taskIndex, { numbersReached: event.target.value })} placeholder="If applicable" className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400" /></div>}
                        <div className="space-y-2 md:col-span-2"><Label className="text-slate-300">{task.onlineMissionary ? "Results" : "Outcome / Results"}</Label><Textarea value={task.outcomeResults} onChange={(event) => updateTask(taskIndex, { outcomeResults: event.target.value })} placeholder={task.onlineMissionary ? "What resulted from the missionary activity?" : "What changed or was achieved?"} className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400 min-h-20" /></div>
                        <div className="space-y-2"><Label className="text-slate-300">Follow-up Required</Label><Select value={task.followUpRequired} onValueChange={(value) => updateTask(taskIndex, { followUpRequired: value as "yes" | "no" })}><SelectTrigger className="bg-slate-700/50 border-slate-600 text-white"><SelectValue /></SelectTrigger><SelectContent className="bg-slate-800 border-slate-700"><SelectItem value="yes" className="text-white">Yes</SelectItem><SelectItem value="no" className="text-white">No</SelectItem></SelectContent></Select></div>
                        {!task.onlineMissionary && <div className="space-y-2"><Label className="text-slate-300">Status</Label><Select value={task.activityStatus} onValueChange={(value) => updateTask(taskIndex, { activityStatus: value as "completed" | "ongoing" | "pending" })}><SelectTrigger className="bg-slate-700/50 border-slate-600 text-white"><SelectValue /></SelectTrigger><SelectContent className="bg-slate-800 border-slate-700"><SelectItem value="completed" className="text-white">Completed</SelectItem><SelectItem value="ongoing" className="text-white">Ongoing</SelectItem><SelectItem value="pending" className="text-white">Pending</SelectItem></SelectContent></Select></div>}
                        {!task.onlineMissionary && <div className="space-y-2"><Label className="text-slate-300">Evidence Type</Label><Select value={task.evidenceType || "not-selected"} onValueChange={(value) => updateTask(taskIndex, { evidenceType: value === "not-selected" ? "" : value })}><SelectTrigger className="bg-slate-700/50 border-slate-600 text-white"><SelectValue placeholder="Choose evidence" /></SelectTrigger><SelectContent className="bg-slate-800 border-slate-700"><SelectItem value="not-selected" className="text-slate-400">Choose evidence</SelectItem>{EVIDENCE_TYPES.map((item) => <SelectItem key={item.value} value={item.value} className="text-white">{item.label}</SelectItem>)}</SelectContent></Select></div>}
                        {!task.onlineMissionary && <div className="space-y-2"><Label className="text-slate-300">Evidence / Link</Label><Input value={task.evidenceLink} onChange={(event) => updateTask(taskIndex, { evidenceLink: event.target.value })} placeholder="Paste a link or evidence reference" className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400" /></div>}
                      </div>
                      <div className="space-y-2"><Label className="text-slate-300">Challenges (if any)</Label><Textarea value={task.challenges} onChange={(event) => updateTask(taskIndex, { challenges: event.target.value })} placeholder="Describe blockers or challenges, or write None" className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400 min-h-20" /></div>
                      {task.onlineMissionary && <div className="rounded-lg border border-cyan-500/30 bg-cyan-950/20 p-3 space-y-2"><p className="text-cyan-100 font-medium">Online Missionary details</p><div className="space-y-1"><Label className="text-xs text-slate-400">Numbers attended that day (optional)</Label><Input type="number" min="0" step="1" value={task.onlineMissionaryParticipants} onChange={(event) => updateTask(taskIndex, { onlineMissionaryParticipants: event.target.value })} className="bg-slate-700/50 border-slate-600 text-white" /></div></div>}

                      {task.includesCoordination && (
                        <div className="rounded-lg border border-indigo-500/30 bg-indigo-950/30 p-3 space-y-3">
                          <div className="flex items-center justify-between gap-2"><div><p className="text-indigo-200 font-medium">Country coordination</p><p className="text-xs text-slate-400">Select each country and record how many people attended.</p></div><Button type="button" size="sm" variant="outline" onClick={() => addCountry(taskIndex)} className="border-indigo-400/50 text-indigo-200 hover:bg-indigo-900/40"><Plus className="w-4 h-4 mr-1" />Country</Button></div>
                          {task.countries.map((country, countryIndex) => (
                            <div key={`task-${taskIndex}-country-${countryIndex}`} className="grid grid-cols-1 sm:grid-cols-[1fr_9rem_auto] gap-2 items-end">
                              <div className="space-y-1"><Label className="text-xs text-slate-400">Country *</Label><Select value={country.country || "not-selected"} onValueChange={(value) => updateCountry(taskIndex, countryIndex, { country: value === "not-selected" ? "" : value })}><SelectTrigger className="bg-slate-700/50 border-slate-600 text-white"><SelectValue placeholder="Choose country" /></SelectTrigger><SelectContent className="bg-slate-800 border-slate-700"><SelectItem value="not-selected" className="text-slate-400">Choose country</SelectItem>{COUNTRIES.map((countryName) => <SelectItem key={countryName} value={countryName} className="text-white">{countryName}</SelectItem>)}</SelectContent></Select></div>
                              <div className="space-y-1"><Label className="text-xs text-slate-400">People attended (optional)</Label><Input type="number" min="0" step="1" value={country.participantsAttended} onChange={(event) => updateCountry(taskIndex, countryIndex, { participantsAttended: event.target.value })} className="bg-slate-700/50 border-slate-600 text-white" /></div>
                              {task.countries.length > 1 && <Button type="button" size="icon" variant="ghost" onClick={() => removeCountry(taskIndex, countryIndex)} className="text-red-300 hover:text-red-200" aria-label="Remove country"><Trash2 className="w-4 h-4" /></Button>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="space-y-2"><Label className="text-slate-300">Staff Remarks</Label><Textarea placeholder="Any additional remarks..." value={timesheetData.staffRemarks} onChange={(e) => setTimesheetData({ ...timesheetData, staffRemarks: e.target.value })} className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400 min-h-20" /></div>

                <Button 
                  disabled={isSubmittingTimesheet || !todayAttendance?.checkInTime}
                  className="w-full bg-blue-600 hover:bg-blue-700 h-12 text-white border-0 text-base disabled:opacity-50"
                  onClick={async () => {
                    if (!todayAttendance?.id) {
                      toast.error('No attendance record found for today');
                      return;
                    }
                    if (!timesheetData.organization || !timesheetData.departmentFunction) {
                      toast.error('Choose an organisation and department/function before submitting');
                      return;
                    }
                    const missingTask = timesheetData.tasks.findIndex((task) => !task.activityType || !task.specificActivity.trim());
                    if (missingTask >= 0) {
                      toast.error(`Choose an activity type and add a specific activity for Task ${missingTask + 1}`);
                      return;
                    }
                    const invalidMissionary = timesheetData.tasks.some((task) => task.onlineMissionary && !/^(0|[1-9]\\d*)$/.test(task.onlineMissionaryParticipants));
                    if (invalidMissionary) {
                      toast.error('Enter the number attended for every online missionary activity');
                      return;
                    }
                    const invalidCoordination = timesheetData.tasks.some((task) => task.includesCoordination && task.countries.some((country) => !country.country.trim() || ! /^(0|[1-9]\d*)$/.test(country.participantsAttended)));
                    if (invalidCoordination) {
                      toast.error('Complete each country and participant count in the coordination section');
                      return;
                    }
                    setIsSubmittingTimesheet(true);
                    try {
                      const submitData = {
                        attendanceId: todayAttendance.id,
                        workModality: timesheetData.workModality as "nairobi_office" | "homa_bay_office" | "field" | "remote",
                        kpiId: timesheetData.kpi && timesheetData.kpi !== 'none' ? parseInt(timesheetData.kpi) : undefined,
                        program: timesheetData.program,
                        organization: timesheetData.organization as "icy_africa" | "africa_for_sdgs" | "joint",
                        departmentFunction: timesheetData.departmentFunction,
                        programProject: timesheetData.programProject,
                        activityCategory: timesheetData.tasks[0]?.activityType || timesheetData.activityCategory || "Other",
                        staffRemarks: timesheetData.staffRemarks,
                        tasks: timesheetData.tasks.map((task) => ({
                          estimatedDuration: task.estimatedDuration,
                          activityType: task.activityType,
                          taskDescription: task.specificActivity.trim(),
                          specificActivity: task.specificActivity.trim(),
                          targetStakeholder: task.targetStakeholder.trim() || undefined,
                          locationPlatform: task.locationPlatform ? task.locationPlatform as "physical_location" | "zoom" | "whatsapp" | "email" | "school" | "church" | "other" : undefined,
                          tangibleOutput: task.tangibleOutput.trim() || undefined,
                          numbersReached: task.numbersReached ? Number(task.numbersReached) : undefined,
                          outcomeResults: task.outcomeResults.trim() || undefined,
                          followUpRequired: task.followUpRequired,
                          evidenceType: task.evidenceType ? task.evidenceType as "report" | "photo" | "email" | "registration_list" | "document" | "social_media_link" | "other" : undefined,
                          evidenceLink: task.evidenceLink.trim() || undefined,
                          activityStatus: task.activityStatus,
                          onlineMissionary: task.onlineMissionary,
                          onlineMissionaryParticipants: task.onlineMissionary ? Number(task.onlineMissionaryParticipants) : undefined,
                          challenges: task.challenges.trim() || undefined,
                          coordination: task.includesCoordination
                            ? task.countries.map((country) => ({
                                country: country.country.trim(),
                                participantsAttended: Number(country.participantsAttended),
                              }))
                            : [],
                        })),
                      };
                      console.log('[StaffDashboard] Submitting timesheet with data:', submitData);
                      await submitTimesheetMutation.mutateAsync(submitData);
                      setSubmittedAttendanceId(Number(todayAttendance.id));
                    } finally {
                      setIsSubmittingTimesheet(false);
                    }
                  }}
                >
                  {isSubmittingTimesheet ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <FileUp className="w-4 h-4 mr-2" />
                      Submit Timesheet
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Monthly History Tab */}
          <TabsContent value="history" className="space-y-4">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2"><History className="w-5 h-5 text-cyan-400" />Monthly Timesheet History</CardTitle>
                <CardDescription className="text-slate-400">Submitted timesheets are saved here for tracing and monthly report preparation. The entry form resets for each new day.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="max-w-xs space-y-2"><Label className="text-slate-300">Choose month</Label><Input type="month" value={historyMonth} onChange={(event) => setHistoryMonth(event.target.value)} className="bg-slate-700/50 border-slate-600 text-white" /></div>
                {isLoadingTimesheetHistory ? <p className="text-slate-400 text-sm">Loading your saved timesheets...</p> : monthlyTimesheetHistory && monthlyTimesheetHistory.length > 0 ? (
                  <div className="space-y-3">
                    {monthlyTimesheetHistory.map((record) => (
                      <div key={record.id} className="rounded-xl border border-slate-700 bg-slate-900/40 p-4 space-y-3">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-white font-semibold">{record.date}</p><p className="text-xs text-slate-400">{record.workModality.replace(/_/g, " ")} · {record.activityCategory} · {record.organization || "Organisation not recorded"} · {record.departmentFunction || "Function not recorded"}</p><p className="text-xs text-slate-500">Programme / Project: {record.programProject || "Not specified"}</p></div><Badge className={record.isSubmitted ? "bg-green-600" : "bg-slate-600"}>{record.isSubmitted ? "Submitted" : "Draft"}</Badge></div>
                        <div className="grid grid-cols-2 gap-3 text-sm"><div><p className="text-slate-400">Hours worked</p><p className="text-white font-medium">{record.hoursWorked}h</p></div><div><p className="text-slate-400">Distance</p><p className="text-white font-medium">{record.distanceTraveled}</p></div></div>
                        <div className="space-y-2"><p className="text-slate-400 text-sm">Tasks</p>{record.tasks && record.tasks.length > 0 ? record.tasks.map((task) => <div key={task.id} className="rounded-lg bg-slate-800 p-3 space-y-1"><div className="flex flex-wrap justify-between gap-2"><p className="text-white font-medium">Task {task.taskNumber}</p><span className="text-xs text-cyan-300">{task.estimatedDuration.replace(/_/g, " ")} · {task.activityStatus || "completed"}</span></div><p className="text-slate-200 text-sm whitespace-pre-wrap"><span className="text-cyan-300">{task.activityType || "Activity"}:</span> {task.specificActivity || task.taskDescription}</p><p className="text-slate-400 text-xs"><span className="font-medium text-slate-300">Target:</span> {task.targetStakeholder || "Not specified"} · <span className="font-medium text-slate-300">Platform:</span> {task.locationPlatform || "Not specified"}</p><p className="text-slate-400 text-xs"><span className="font-medium text-slate-300">Output:</span> {task.tangibleOutput || "Not specified"} · <span className="font-medium text-slate-300">Reached:</span> {task.numbersReached ?? "N/A"}</p><p className="text-slate-400 text-xs"><span className="font-medium text-slate-300">Outcome:</span> {task.outcomeResults || "Not specified"} · <span className="font-medium text-slate-300">Follow-up:</span> {task.followUpRequired || "no"}</p><p className="text-slate-400 text-xs"><span className="font-medium text-slate-300">Evidence:</span> {task.evidenceType || "Not specified"}{task.evidenceLink ? ` · ${task.evidenceLink}` : ""}{task.onlineMissionary ? ` · Online missionary attended: ${task.onlineMissionaryParticipants ?? 0}` : ""}</p><p className="text-slate-400 text-xs">Challenges: {task.challenges || "None"}</p>{task.coordination && task.coordination.length > 0 && <p className="text-indigo-300 text-xs">Coordination: {task.coordination.map((item) => `${item.country} (${item.participantsAttended})`).join(", ")}</p>}</div>) : <p className="text-slate-400 text-sm">No task details recorded for this entry.</p>}</div>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-slate-400 text-sm">No timesheets saved for this month.</p>}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Activities Tab */}
          <TabsContent value="activities" className="space-y-4">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Activity className="w-5 h-5 text-blue-400" />
                  Recent Activities
                </CardTitle>
                <CardDescription className="text-slate-400">Your submitted activities and work logs</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Activity className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-400">No activities submitted yet</p>
                  <p className="text-slate-500 text-sm">Submit your first timesheet to see activities here</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Waypoints Tab */}
          <TabsContent value="waypoints" className="space-y-4">
            {todayAttendance?.id ? (
              <WaypointTracker
                attendanceId={todayAttendance.id}
                isCheckedIn={!!isCheckedIn}
                isCheckedOut={!!todayAttendance?.checkOutTime}
              />
            ) : (
              <Card className="border-dashed">
                <CardContent className="pt-12 pb-12 text-center">
                  <Navigation className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600 text-lg">Check in first to track waypoints</p>
                  <p className="text-gray-500 text-sm mt-2">Waypoints can only be logged after checking in</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Leave Request Tab */}
          <TabsContent value="leave" className="space-y-4">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-purple-400" />
                  Request Leave
                </CardTitle>
                <CardDescription className="text-slate-400">Submit a leave request and select your leave type</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Leave Balance Summary */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {isLoadingLeaveTypes ? (
                    <div className="col-span-2 md:col-span-4 bg-slate-700/50 rounded-lg p-4 border border-slate-600"><p className="text-slate-400 text-sm">Loading leave types...</p></div>
                  ) : isLeaveTypesError ? (
                    <div className="col-span-2 md:col-span-4 bg-red-900/20 rounded-lg p-4 border border-red-500/30"><p className="text-red-200 text-sm">Leave types could not be loaded. Refresh and try again.</p></div>
                  ) : myLeaveBalance && activeLeaveTypes.length > 0 ? (
                    activeLeaveTypes.map((setting: any) => {
                      const balance = (myLeaveBalance as any)[setting.leaveType];
                      if (!balance) return null;
                      const typeColors: Record<string, string> = { annual: 'text-blue-400', sick: 'text-green-400', unpaid: 'text-yellow-400', maternity: 'text-pink-400', other: 'text-purple-400' };
                      return (
                        <div key={setting.leaveType} className="bg-slate-700/50 rounded-lg p-4 border border-slate-600">
                          <p className="text-slate-400 text-xs font-medium mb-1">{setting.label}</p>
                          <p className={`text-2xl font-bold ${typeColors[setting.leaveType] || 'text-cyan-400'}`}>{parseFloat(balance.remainingDays.toString())}</p>
                          <p className="text-xs text-slate-500 mt-1">days remaining</p>
                        </div>
                      );
                    })
                  ) : (
                    <div className="col-span-2 md:col-span-4 bg-slate-700/50 rounded-lg p-4 border border-slate-600">
                      <p className="text-slate-400 text-sm">Loading leave balances...</p>
                    </div>
                  )}
                </div>

                {/* Leave Request Form */}
                <div className="space-y-4 pt-4 border-t border-slate-700">
                  <div className="space-y-2">
                    <Label htmlFor="leaveType" className="text-white font-medium">Select Leave Type *</Label>
                    <Select value={leaveFormData.leaveType} onValueChange={(value) => setLeaveFormData({ ...leaveFormData, leaveType: value })} disabled={isLoadingLeaveTypes || isLeaveTypesError || activeLeaveTypes.length === 0}>
                      <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                        <SelectValue placeholder="Choose leave type" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-600">
                        {activeLeaveTypes.length > 0 ? activeLeaveTypes.map((setting: any) => (
                          <SelectItem key={setting.leaveType} value={setting.leaveType} className="text-white">
                            {setting.label}
                          </SelectItem>
                        )) : <SelectItem value="no-types" disabled className="text-slate-400">No leave types available</SelectItem>}
                      </SelectContent>
                    </Select>
                    {/* Show selected leave type balance */}
                    {leaveFormData.leaveType && allLeaveBalances && (
                      <div className="mt-3 p-3 bg-blue-900/30 border border-blue-500/50 rounded-lg">
                        {(() => {
                          const leaveTypeKey = leaveFormData.leaveType as 'annual' | 'sick' | 'maternity' | 'unpaid';
                          const selectedBalance = myLeaveBalance?.[leaveTypeKey];
                          if (selectedBalance) {
                            const remaining = parseFloat(selectedBalance.remainingDays.toString());
                            const allocated = parseFloat(selectedBalance.allocatedDays.toString());
                            const used = parseFloat(selectedBalance.usedDays.toString());
                            return (
                              <div className="space-y-2">
                                <p className="text-blue-300 text-sm font-medium">Leave Balance Details:</p>
                                <div className="grid grid-cols-3 gap-2 text-xs">
                                  <div>
                                    <p className="text-slate-400">Allocated</p>
                                    <p className="text-blue-400 font-bold text-lg">{allocated}</p>
                                  </div>
                                  <div>
                                    <p className="text-slate-400">Used</p>
                                    <p className="text-yellow-400 font-bold text-lg">{used}</p>
                                  </div>
                                  <div>
                                    <p className="text-slate-400">Available</p>
                                    <p className={`font-bold text-lg ${remaining > 0 ? 'text-green-400' : 'text-red-400'}`}>{remaining}</p>
                                  </div>
                                </div>
                              </div>
                            );
                          }
                          return <p className="text-slate-400 text-sm">No balance data available for this leave type</p>;
                        })()}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="startDate" className="text-white font-medium">Start Date *</Label>
                      <Input type="date" id="startDate" value={leaveFormData.startDate} onChange={(e) => setLeaveFormData({ ...leaveFormData, startDate: e.target.value })} className="bg-slate-700 border-slate-600 text-white" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="endDate" className="text-white font-medium">End Date *</Label>
                      <Input type="date" id="endDate" value={leaveFormData.endDate} onChange={(e) => setLeaveFormData({ ...leaveFormData, endDate: e.target.value })} className="bg-slate-700 border-slate-600 text-white" />
                    </div>
                  </div>

                  {/* Days Requested and Balance Validation */}
                  <p className="text-xs text-slate-400">Leave days are calculated as working days only; Saturdays, Sundays, and configured public holidays are excluded.</p>
                  {leaveFormData.startDate && leaveFormData.endDate && leaveFormData.leaveType && (() => {
                    const startDate = new Date(`${leaveFormData.startDate}T00:00:00`);
                    const endDate = new Date(`${leaveFormData.endDate}T00:00:00`);
                    const daysRequested = countKenyaWorkingDays(startDate, endDate);
                    const leaveTypeKey = leaveFormData.leaveType as 'annual' | 'sick' | 'maternity' | 'unpaid';
                    const selectedBalance = allLeaveBalances?.[0]?.[leaveTypeKey];
                    const availableDays = selectedBalance ? parseFloat(selectedBalance.remainingDays.toString()) : 0;
                    const isEnoughBalance = daysRequested <= availableDays && daysRequested > 0;
                    
                    return (
                      <div className={`p-4 rounded-lg border-2 ${isEnoughBalance ? 'bg-green-900/20 border-green-500/50' : 'bg-red-900/20 border-red-500/50'}`}>
                        <div className="grid grid-cols-3 gap-4 text-center">
                          <div>
                            <p className="text-slate-400 text-xs font-medium mb-1">Days Requested</p>
                            <p className={`text-2xl font-bold ${isEnoughBalance ? 'text-green-400' : 'text-yellow-400'}`}>{daysRequested}</p>
                          </div>
                          <div>
                            <p className="text-slate-400 text-xs font-medium mb-1">Available Days</p>
                            <p className="text-2xl font-bold text-blue-400">{availableDays}</p>
                          </div>
                          <div>
                            <p className="text-slate-400 text-xs font-medium mb-1">After Request</p>
                            <p className={`text-2xl font-bold ${isEnoughBalance ? 'text-green-400' : 'text-red-400'}`}>{Math.max(0, availableDays - daysRequested)}</p>
                          </div>
                        </div>
                        {!isEnoughBalance && (
                          <p className="text-red-300 text-sm mt-3 font-medium">⚠️ Insufficient leave balance! You need {daysRequested - availableDays} more days.</p>
                        )}
                        {isEnoughBalance && (
                          <p className="text-green-300 text-sm mt-3 font-medium">✓ You have enough leave balance for this request.</p>
                        )}
                      </div>
                    );
                  })()}

                  <div className="space-y-2">
                    <Label htmlFor="reason" className="text-white font-medium">Reason for Leave</Label>
                    <Textarea 
                      id="reason" 
                      value={leaveFormData.reason}
                      onChange={(e) => setLeaveFormData({ ...leaveFormData, reason: e.target.value })}
                      placeholder="Provide reason for your leave request..." 
                      className="bg-slate-700 border-slate-600 text-white min-h-24" 
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button 
                      onClick={async () => {
                        if (!leaveFormData.leaveType || !leaveFormData.startDate || !leaveFormData.endDate) {
                          toast.error('Please fill in all required fields');
                          return;
                        }
                        const startDate = leaveFormData.startDate;
                        const endDate = leaveFormData.endDate;

                        // The server validates the authoritative weekday/public-holiday count.
                        setIsSubmittingLeave(true);
                        try {
                          await submitLeaveRequest.mutateAsync({
                            leaveType: leaveFormData.leaveType as any,
                            startDate,
                            endDate,
                            reason: leaveFormData.reason,
                          });
                        } finally {
                          setIsSubmittingLeave(false);
                        }
                      }}
                      disabled={isSubmittingLeave || submitLeaveRequest.isPending}
                      className="flex-1 bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50"
                    >
                      {isSubmittingLeave || submitLeaveRequest.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4 mr-2" />
                          Submit Leave Request
                        </>
                      )}
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setLeaveFormData({ leaveType: '', startDate: '', endDate: '', reason: '' })}
                      className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700"
                    >
                      Clear
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2"><Calendar className="w-5 h-5 text-indigo-400" />Previous Leave Records</CardTitle>
                <CardDescription className="text-slate-400">Track your submitted, approved, and rejected leave requests.</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingLeaveRequests ? <p className="text-slate-400 text-sm">Loading leave history...</p> : myLeaveRequests && myLeaveRequests.length > 0 ? (
                  <div className="space-y-3">
                    {myLeaveRequests.map((request) => (
                      <div key={request.id} className="rounded-lg border border-slate-700 bg-slate-900/40 p-3">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div><p className="text-white font-medium capitalize">{request.leaveType} leave</p><p className="text-xs text-slate-400">{new Date(request.startDate).toLocaleDateString()} – {new Date(request.endDate).toLocaleDateString()} · {request.daysRequested} working day(s)</p></div>
                          <Badge className={request.status === "approved" ? "bg-green-600" : request.status === "rejected" ? "bg-red-600" : "bg-amber-600"}>{request.status.charAt(0).toUpperCase() + request.status.slice(1)}</Badge>
                        </div>
                        {request.approvalReason && <p className="mt-2 text-xs text-slate-400">Decision note: {request.approvalReason}</p>}
                      </div>
                    ))}
                  </div>
                ) : <p className="text-slate-400 text-sm">No leave requests recorded yet.</p>}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Leave Calendar Tab */}
          <TabsContent value="calendar" className="space-y-4">
            <LeaveCalendar 
              leaveRequests={myLeaveRequests?.map((req) => ({
                id: req.id,
                startDate: new Date(req.startDate),
                endDate: new Date(req.endDate),
                leaveType: req.leaveType,
                status: req.status as "approved" | "pending" | "rejected",
                reason: req.reason || undefined,
              })) || []}
              isLoading={isLoadingLeaveRequests}
            />
          </TabsContent>
        </Tabs>

        {/* GPS Map Modal */}
        {showGpsMap && gpsCoordinates && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-2xl bg-slate-800 border-slate-700">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <CardTitle className="text-white">Your GPS Location</CardTitle>
                <button
                  onClick={() => setShowGpsMap(false)}
                  className="text-slate-400 hover:text-white"
                >
                  X
                </button>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-slate-700 rounded-lg overflow-hidden" style={{ height: '400px' }}>
                  <MapView
                    initialCenter={{ lat: gpsCoordinates.latitude, lng: gpsCoordinates.longitude }}
                    initialZoom={16}
                    onMapReady={(map) => {
                      mapRef.current = map;
                      if (window.google?.maps?.marker?.AdvancedMarkerElement) {
                        new window.google.maps.marker.AdvancedMarkerElement({
                          map,
                          position: { lat: gpsCoordinates.latitude, lng: gpsCoordinates.longitude },
                          title: 'Your Location',
                        });
                      }
                    }}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="bg-slate-700 p-3 rounded">
                    <p className="text-slate-400">Latitude</p>
                    <p className="text-white font-mono">{gpsCoordinates.latitude.toFixed(6)}</p>
                  </div>
                  <div className="bg-slate-700 p-3 rounded">
                    <p className="text-slate-400">Longitude</p>
                    <p className="text-white font-mono">{gpsCoordinates.longitude.toFixed(6)}</p>
                  </div>
                  <div className="bg-slate-700 p-3 rounded col-span-2">
                    <p className="text-slate-400">Accuracy</p>
                    <p className="text-white font-mono">{gpsCoordinates.accuracy.toFixed(2)} meters</p>
                  </div>
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
