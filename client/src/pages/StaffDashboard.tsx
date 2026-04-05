import React, { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, MapPin, Clock, AlertCircle, CheckCircle2, FileUp, Activity, Briefcase, Target, Plus, Trash2, Navigation, Calendar } from "lucide-react";
import { toast } from "sonner";
import { NotificationBanner } from "@/components/NotificationBanner";
import { WaypointTracker } from "@/components/WaypointTracker";
import { LeaveCalendar } from "@/components/LeaveCalendar";
import { WorkplaceSelector } from "@/components/WorkplaceSelector";
import { GPSStatusIndicator } from "@/components/GPSStatusIndicator";

interface GPSCoordinates {
  latitude: number;
  longitude: number;
  accuracy: number;
}

const ACTIVITY_CATEGORIES = [
  "Program Implementation",
  "Community Outreach",
  "Training & Workshop Facilitation",
  "Monitoring & Evaluation",
  "Data Collection",
  "Reporting & Documentation",
  "ICT Development",
  "System Maintenance",
  "Stakeholder Engagement",
  "Environmental Activity",
  "Education Support",
  "Health Outreach",
  "Research & Proposal Writing",
  "Administrative Work",
  "Field Visit",
  "Partnership Development",
  "Youth Empowerment",
  "Women Empowerment",
  "Digital Transformation",
];

const WORK_MODALITIES = ["Nairobi Office", "Homa Bay Office", "Field", "Remote"];

const SDG_GOALS = Array.from({ length: 17 }, (_, i) => ({
  id: i + 1,
  title: `SDG ${i + 1}`,
  color: `hsl(${(i * 21) % 360}, 70%, 50%)`,
}));

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
  const [isSubmittingTimesheet, setIsSubmittingTimesheet] = useState(false);
  const [gpsStatus, setGpsStatus] = useState<"idle" | "acquiring" | "ready">("idle");
  const [activeTab, setActiveTab] = useState("check-in");

  // Timesheet form state
  const [timesheetData, setTimesheetData] = useState({
    date: new Date().toISOString().split("T")[0],
    amStartTime: "",
    amEndTime: "",
    pmStartTime: "",
    pmEndTime: "",
    workModality: "Field",
    activityCategory: "Program Implementation",
    sdgGoal: "1",
    program: "",
    kpi: "",
    taskDescription: "",
    staffRemarks: "",
    evidenceFile: null as File | null,
  });

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
  const { data: allLeaveBalances } = trpc.leave.getAllBalances.useQuery({ year: new Date().getFullYear() });
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
    onSuccess: () => {
      // Invalidate all attendance-related queries to trigger immediate updates
      utils.attendance.getToday.invalidate();
      utils.attendance.getStaffAttendance.invalidate();
    },
  });
  const addWaypointMutation = trpc.attendance.addWaypoint.useMutation({
    onSuccess: () => {
      // Invalidate waypoint queries
      utils.attendance.getWaypoints.invalidate();
    },
  });
  const submitLeaveRequest = trpc.leave.createRequest.useMutation({
    onSuccess: () => {
      toast.success('Leave request submitted successfully!');
      setLeaveFormData({ leaveType: '', startDate: '', endDate: '', reason: '' });
      utils.leave.getMyRequests.invalidate();
      utils.leave.getAllBalances.invalidate();
      utils.leave.getBalance.invalidate();
    },
    onError: (error) => {
      toast.error(`Failed to submit leave request: ${error.message}`);
    },
  });

  // Acquire GPS coordinates
  const acquireGPS = () => {
    setGpsStatus("acquiring");
    setGpsError(null);

    if (!navigator.geolocation) {
      setGpsError("Geolocation is not supported by your browser");
      setGpsStatus("idle");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGpsCoordinates({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
        setGpsStatus("ready");
      },
      (error) => {
        setGpsError(`GPS Error: ${error.message}`);
        setGpsStatus("idle");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleCheckIn = async () => {
    if (!gpsCoordinates) {
      toast.error("Please acquire GPS coordinates first");
      return;
    }

    if (!selectedWorkplace) {
      toast.error("Please select a workplace");
      return;
    }

    setIsCheckingIn(true);
    try {
      await checkInMutation.mutateAsync({
        latitude: gpsCoordinates.latitude.toString(),
        longitude: gpsCoordinates.longitude.toString(),
        accuracy: gpsCoordinates.accuracy.toString(),
        workModality: selectedWorkplace as "nairobi_office" | "homa_bay_office" | "field" | "remote",
      });
      toast.success(`Checked in successfully at ${selectedWorkplace}`);
      await refetchAttendance();
    } catch (error) {
      toast.error("Failed to check in");
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

    setIsCheckingOut(true);
    try {
      await checkOutMutation.mutateAsync({
        attendanceId: todayAttendance.id,
        latitude: gpsCoordinates.latitude.toString(),
        longitude: gpsCoordinates.longitude.toString(),
        accuracy: gpsCoordinates.accuracy.toString(),
        distanceTraveled: '0',
      });
      toast.success("Checked out successfully");
      await refetchAttendance();
    } catch (error) {
      toast.error("Failed to check out");
    } finally {
      setIsCheckingOut(false);
    }
  };

  const isCheckedIn = todayAttendance?.checkInTime && !todayAttendance?.checkOutTime;

   return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-blue-900 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Notification Banner */}
        <div className="mb-6">
          <NotificationBanner />
        </div>

        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <Briefcase className="w-8 h-8 text-blue-400" />
            <h1 className="text-4xl font-bold text-white">Staff Dashboard</h1>
          </div>
          <p className="text-slate-300">Welcome, {user?.name}. Track your time and activities.</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  <p className="text-2xl font-bold text-white">{allLeaveBalances?.find(b => b.leaveType === 'annual')?.remainingDays || 0}</p>
                  <p className="text-xs text-slate-500 mt-1">Annual leave days</p>
                </div>
                <Clock className="w-10 h-10 text-green-400 opacity-80" />
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

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="bg-slate-800/50 border border-slate-700 backdrop-blur-sm">
            <TabsTrigger value="check-in" className="data-[state=active]:bg-blue-600 text-slate-300 data-[state=active]:text-white">
              <MapPin className="w-4 h-4 mr-2" />
              Check In/Out
            </TabsTrigger>
            <TabsTrigger value="timesheet" className="data-[state=active]:bg-blue-600 text-slate-300 data-[state=active]:text-white">
              <Briefcase className="w-4 h-4 mr-2" />
              Timesheet
            </TabsTrigger>
            <TabsTrigger value="activities" className="data-[state=active]:bg-blue-600 text-slate-300 data-[state=active]:text-white">
              <Activity className="w-4 h-4 mr-2" />
              Activities
            </TabsTrigger>
            <TabsTrigger value="waypoints" className="data-[state=active]:bg-blue-600 text-slate-300 data-[state=active]:text-white">
              <Navigation className="w-4 h-4 mr-2" />
              Waypoints
            </TabsTrigger>
            <TabsTrigger value="leave" className="data-[state=active]:bg-purple-600 text-slate-300 data-[state=active]:text-white">
              <AlertCircle className="w-4 h-4 mr-2" />
              Request Leave
            </TabsTrigger>
            <TabsTrigger value="calendar" className="data-[state=active]:bg-indigo-600 text-slate-300 data-[state=active]:text-white">
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

                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      onClick={handleCheckIn}
                      disabled={!gpsCoordinates || isCheckingIn || isCheckedIn}
                      className="bg-green-600 hover:bg-green-700 h-12 text-white border-0"
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
                      disabled={!gpsCoordinates || isCheckingOut || !isCheckedIn}
                      className="bg-red-600 hover:bg-red-700 h-12 text-white border-0"
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
                    <Label className="text-slate-300">Work Modality</Label>
                    <Select value={timesheetData.workModality} onValueChange={(value) => setTimesheetData({ ...timesheetData, workModality: value })}>
                      <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        {WORK_MODALITIES.map((modality) => (
                          <SelectItem key={modality} value={modality} className="text-white">
                            {modality}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-slate-300">Activity Category</Label>
                    <Select value={timesheetData.activityCategory} onValueChange={(value) => setTimesheetData({ ...timesheetData, activityCategory: value })}>
                      <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700 max-h-60">
                        {ACTIVITY_CATEGORIES.map((category) => (
                          <SelectItem key={category} value={category} className="text-white">
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-slate-300">SDG Goal</Label>
                    <Select value={timesheetData.sdgGoal} onValueChange={(value) => setTimesheetData({ ...timesheetData, sdgGoal: value })}>
                      <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700 max-h-60">
                        {SDG_GOALS.map((goal) => (
                          <SelectItem key={goal.id} value={goal.id.toString()} className="text-white">
                            {goal.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-slate-300">AM Start Time</Label>
                    <Input
                      type="time"
                      value={timesheetData.amStartTime}
                      onChange={(e) => setTimesheetData({ ...timesheetData, amStartTime: e.target.value })}
                      className="bg-slate-700/50 border-slate-600 text-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-slate-300">AM End Time</Label>
                    <Input
                      type="time"
                      value={timesheetData.amEndTime}
                      onChange={(e) => setTimesheetData({ ...timesheetData, amEndTime: e.target.value })}
                      className="bg-slate-700/50 border-slate-600 text-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-slate-300">PM Start Time</Label>
                    <Input
                      type="time"
                      value={timesheetData.pmStartTime}
                      onChange={(e) => setTimesheetData({ ...timesheetData, pmStartTime: e.target.value })}
                      className="bg-slate-700/50 border-slate-600 text-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-slate-300">PM End Time</Label>
                    <Input
                      type="time"
                      value={timesheetData.pmEndTime}
                      onChange={(e) => setTimesheetData({ ...timesheetData, pmEndTime: e.target.value })}
                      className="bg-slate-700/50 border-slate-600 text-white"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-300">Task Description</Label>
                  <Textarea
                    placeholder="Describe your work activities..."
                    value={timesheetData.taskDescription}
                    onChange={(e) => setTimesheetData({ ...timesheetData, taskDescription: e.target.value })}
                    className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400 min-h-24"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-300">Staff Remarks</Label>
                  <Textarea
                    placeholder="Any additional remarks..."
                    value={timesheetData.staffRemarks}
                    onChange={(e) => setTimesheetData({ ...timesheetData, staffRemarks: e.target.value })}
                    className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400 min-h-20"
                  />
                </div>

                <Button 
                  disabled={isSubmittingTimesheet || !todayAttendance?.checkInTime}
                  className="w-full bg-blue-600 hover:bg-blue-700 h-12 text-white border-0 text-base disabled:opacity-50"
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
                  {allLeaveBalances && allLeaveBalances.length > 0 ? (
                    allLeaveBalances.map((balance) => {
                      const leaveTypeLabels: Record<string, { label: string; color: string }> = {
                        annual: { label: 'Annual Leave', color: 'text-blue-400' },
                        sick: { label: 'Sick Leave', color: 'text-green-400' },
                        unpaid: { label: 'Unpaid Leave', color: 'text-yellow-400' },
                        maternity: { label: 'Maternity Leave', color: 'text-pink-400' },
                        other: { label: 'Other Leave', color: 'text-purple-400' },
                      };
                      const typeInfo = leaveTypeLabels[balance.leaveType] || { label: balance.leaveType, color: 'text-slate-400' };
                      return (
                        <div key={balance.id} className="bg-slate-700/50 rounded-lg p-4 border border-slate-600">
                          <p className="text-slate-400 text-xs font-medium mb-1">{typeInfo.label}</p>
                          <p className={`text-2xl font-bold ${typeInfo.color}`}>{parseFloat(balance.remainingDays.toString())}</p>
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
                    <Select value={leaveFormData.leaveType} onValueChange={(value) => setLeaveFormData({ ...leaveFormData, leaveType: value })}>
                      <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                        <SelectValue placeholder="Choose leave type" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-600">
                        <SelectItem value="annual" className="text-white">Annual Leave</SelectItem>
                        <SelectItem value="sick" className="text-white">Sick Leave</SelectItem>
                        <SelectItem value="unpaid" className="text-white">Unpaid Leave</SelectItem>
                        <SelectItem value="maternity" className="text-white">Maternity Leave</SelectItem>
                      </SelectContent>
                    </Select>
                    {/* Show selected leave type balance */}
                    {leaveFormData.leaveType && allLeaveBalances && (
                      <div className="mt-3 p-3 bg-blue-900/30 border border-blue-500/50 rounded-lg">
                        {(() => {
                          const selectedBalance = allLeaveBalances.find(b => b.leaveType === leaveFormData.leaveType);
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
                  {leaveFormData.startDate && leaveFormData.endDate && leaveFormData.leaveType && (() => {
                    const startDate = new Date(leaveFormData.startDate);
                    const endDate = new Date(leaveFormData.endDate);
                    const daysRequested = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                    const selectedBalance = allLeaveBalances?.find(b => b.leaveType === leaveFormData.leaveType);
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
                        const startDate = new Date(leaveFormData.startDate);
                        const endDate = new Date(leaveFormData.endDate);
                        const daysRequested = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                        
                        // Validate balance
                        const selectedBalance = allLeaveBalances?.find(b => b.leaveType === leaveFormData.leaveType);
                        const availableDays = selectedBalance ? parseFloat(selectedBalance.remainingDays.toString()) : 0;
                        if (daysRequested > availableDays) {
                          toast.error(`Insufficient leave balance. You need ${daysRequested - availableDays} more days.`);
                          return;
                        }
                        
                        setIsSubmittingLeave(true);
                        try {
                          await submitLeaveRequest.mutateAsync({
                            leaveType: leaveFormData.leaveType as any,
                            startDate,
                            endDate,
                            daysRequested: daysRequested.toString(),
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
      </div>
    </div>
  );
}
