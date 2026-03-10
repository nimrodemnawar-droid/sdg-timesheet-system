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
import { Loader2, MapPin, Clock, AlertCircle, CheckCircle2, FileUp } from "lucide-react";
import { toast } from "sonner";

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

const WORK_MODALITIES = [
  "Nairobi Office",
  "Homa Bay Office",
  "Field",
  "Remote",
];

const SDG_GOALS = Array.from({ length: 17 }, (_, i) => ({
  id: i + 1,
  title: `SDG ${i + 1}`,
  color: `hsl(${(i * 21) % 360}, 70%, 50%)`,
}));

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

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

  const { data: todayAttendance, refetch: refetchAttendance } = trpc.attendance.getToday.useQuery();
  const { data: leaveBalance } = trpc.leave.getBalance.useQuery({ leaveType: 'annual' });
  const checkInMutation = trpc.attendance.checkIn.useMutation();
  const checkOutMutation = trpc.attendance.checkOut.useMutation();
  const submitTimesheetMutation = trpc.attendance.submitTimesheet.useMutation();

  // Request GPS permission and start tracking
  useEffect(() => {
    if (!navigator.geolocation) {
      setGpsError("Geolocation is not supported by your browser");
      return;
    }

    setGpsStatus("acquiring");
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setGpsCoordinates({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
        setGpsStatus("ready");
        setGpsError(null);
      },
      (error) => {
        let errorMessage = "Unable to get GPS location";
        if (error.code === error.PERMISSION_DENIED) {
          errorMessage = "GPS permission denied. Please enable location access.";
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          errorMessage = "GPS position unavailable";
        } else if (error.code === error.TIMEOUT) {
          errorMessage = "GPS request timed out";
        }
        setGpsError(errorMessage);
        setGpsStatus("idle");
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  const getAccuracyBadge = (accuracy: number) => {
    if (accuracy < 10) return <Badge className="bg-green-500">Excellent</Badge>;
    if (accuracy < 50) return <Badge className="bg-blue-500">Good</Badge>;
    if (accuracy < 100) return <Badge className="bg-yellow-500">Fair</Badge>;
    return <Badge className="bg-red-500">Poor</Badge>;
  };

  const handleCheckIn = async () => {
    if (!gpsCoordinates) {
      toast.error("GPS location not available");
      return;
    }

    setIsCheckingIn(true);
    try {
      await checkInMutation.mutateAsync({
        latitude: gpsCoordinates.latitude.toFixed(8),
        longitude: gpsCoordinates.longitude.toFixed(8),
        accuracy: gpsCoordinates.accuracy.toFixed(2),
      });

      toast.success("✓ Checked in successfully");
      await refetchAttendance();
      setActiveTab("timesheet");
    } catch (error) {
      toast.error("Failed to check in");
      console.error(error);
    } finally {
      setIsCheckingIn(false);
    }
  };

  const handleCheckOut = async () => {
    if (!todayAttendance) {
      toast.error("No active check-in found");
      return;
    }

    if (!gpsCoordinates) {
      toast.error("GPS location not available");
      return;
    }

    setIsCheckingOut(true);
    try {
      const distance = calculateDistance(
        parseFloat(todayAttendance.checkInLat),
        parseFloat(todayAttendance.checkInLng),
        gpsCoordinates.latitude,
        gpsCoordinates.longitude
      );

      await checkOutMutation.mutateAsync({
        attendanceId: todayAttendance.id,
        latitude: gpsCoordinates.latitude.toFixed(8),
        longitude: gpsCoordinates.longitude.toFixed(8),
        accuracy: gpsCoordinates.accuracy.toFixed(2),
        distanceTraveled: distance.toFixed(2),
      });

      toast.success("✓ Checked out successfully");
      await refetchAttendance();
    } catch (error) {
      toast.error("Failed to check out");
      console.error(error);
    } finally {
      setIsCheckingOut(false);
    }
  };

  const calculateTotalHours = () => {
    let total = 0;
    if (timesheetData.amStartTime && timesheetData.amEndTime) {
      const [startH, startM] = timesheetData.amStartTime.split(":").map(Number);
      const [endH, endM] = timesheetData.amEndTime.split(":").map(Number);
      total += (endH * 60 + endM - (startH * 60 + startM)) / 60;
    }
    if (timesheetData.pmStartTime && timesheetData.pmEndTime) {
      const [startH, startM] = timesheetData.pmStartTime.split(":").map(Number);
      const [endH, endM] = timesheetData.pmEndTime.split(":").map(Number);
      total += (endH * 60 + endM - (startH * 60 + startM)) / 60;
    }
    return total.toFixed(2);
  };

  const handleSubmitTimesheet = async () => {
    if (!todayAttendance) {
      toast.error("Please check in first");
      return;
    }

    if (!timesheetData.amStartTime || !timesheetData.amEndTime) {
      toast.error("Please fill in AM times");
      return;
    }

    setIsSubmittingTimesheet(true);
    try {
      await submitTimesheetMutation.mutateAsync({
        attendanceId: todayAttendance.id,
      });

      toast.success("✓ Timesheet submitted successfully");
      setTimesheetData({
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
        evidenceFile: null,
      });
    } catch (error) {
      toast.error("Failed to submit timesheet");
      console.error(error);
    } finally {
      setIsSubmittingTimesheet(false);
    }
  };

  const totalHours = calculateTotalHours();
  const isOvertime = parseFloat(totalHours) > 8;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      {/* SDG Watermark Background */}
      <div className="fixed inset-0 opacity-5 pointer-events-none text-center flex items-center justify-center">
        <div className="text-9xl font-bold text-slate-400">SDG</div>
      </div>

      <div className="relative z-10 max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Staff Dashboard</h1>
          <p className="text-slate-600">Welcome, {user?.name}</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Today's Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {todayAttendance ? (
                  <span className="text-green-600">✓ Checked In</span>
                ) : (
                  <span className="text-slate-400">Not Started</span>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Hours Today</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${isOvertime ? "text-orange-600" : "text-blue-600"}`}>
                {totalHours} hrs
              </div>
              {isOvertime && <p className="text-xs text-orange-600 mt-1">⚠ Overtime</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Leave Balance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">
                {leaveBalance && leaveBalance.leaveType === 'annual' ? leaveBalance.remainingDays : 0} days
              </div>
              <p className="text-xs text-slate-600 mt-1">Annual Leave</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">GPS Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${gpsStatus === "ready" ? "bg-green-500" : "bg-slate-300"}`} />
                <span className="text-sm font-medium capitalize">{gpsStatus}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-8">
            <TabsTrigger value="check-in">Check In/Out</TabsTrigger>
            <TabsTrigger value="timesheet">Daily Timesheet</TabsTrigger>
            <TabsTrigger value="leave">Leave</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          {/* Check-In/Out Tab */}
          <TabsContent value="check-in">
            <Card>
              <CardHeader>
                <CardTitle>GPS Check-In / Check-Out</CardTitle>
                <CardDescription>Your location is being tracked for attendance verification</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {gpsError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-red-900">GPS Error</p>
                      <p className="text-sm text-red-700">{gpsError}</p>
                    </div>
                  </div>
                )}

                {gpsCoordinates && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-blue-600" />
                      <span className="font-medium text-blue-900">Current Location</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-blue-600">Latitude</p>
                        <p className="font-mono font-bold text-blue-900">{gpsCoordinates.latitude.toFixed(8)}</p>
                      </div>
                      <div>
                        <p className="text-blue-600">Longitude</p>
                        <p className="font-mono font-bold text-blue-900">{gpsCoordinates.longitude.toFixed(8)}</p>
                      </div>
                      <div>
                        <p className="text-blue-600">Accuracy</p>
                        <p className="font-mono font-bold text-blue-900">{gpsCoordinates.accuracy.toFixed(2)}m</p>
                      </div>
                      <div>
                        <p className="text-blue-600">Quality</p>
                        {getAccuracyBadge(gpsCoordinates.accuracy)}
                      </div>
                    </div>
                  </div>
                )}

                {todayAttendance ? (
                  <div className="space-y-4">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                        <span className="font-medium text-green-900">Checked In</span>
                      </div>
                      <p className="text-sm text-green-700">
                        Check-in time: {new Date(todayAttendance.checkInTime).toLocaleTimeString()}
                      </p>
                    </div>
                    <Button
                      onClick={handleCheckOut}
                      disabled={isCheckingOut || !gpsCoordinates}
                      className="w-full bg-red-600 hover:bg-red-700"
                      size="lg"
                    >
                      {isCheckingOut ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                      Check Out
                    </Button>
                  </div>
                ) : (
                  <Button
                    onClick={handleCheckIn}
                    disabled={isCheckingIn || !gpsCoordinates}
                    className="w-full bg-green-600 hover:bg-green-700"
                    size="lg"
                  >
                    {isCheckingIn ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                    Check In
                  </Button>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Daily Timesheet Tab */}
          <TabsContent value="timesheet">
            <Card>
              <CardHeader>
                <CardTitle>Daily Timesheet</CardTitle>
                <CardDescription>Submit your daily work details and activities</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Date */}
                  <div>
                    <Label htmlFor="date">Date</Label>
                    <Input
                      id="date"
                      type="date"
                      value={timesheetData.date}
                      onChange={(e) => setTimesheetData({ ...timesheetData, date: e.target.value })}
                    />
                  </div>

                  {/* Work Modality */}
                  <div>
                    <Label htmlFor="modality">Work Modality</Label>
                    <Select value={timesheetData.workModality} onValueChange={(val) => setTimesheetData({ ...timesheetData, workModality: val })}>
                      <SelectTrigger id="modality">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {WORK_MODALITIES.map((mod) => (
                          <SelectItem key={mod} value={mod}>
                            {mod}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* AM Start Time */}
                  <div>
                    <Label htmlFor="amStart">AM Start Time</Label>
                    <Input
                      id="amStart"
                      type="time"
                      value={timesheetData.amStartTime}
                      onChange={(e) => setTimesheetData({ ...timesheetData, amStartTime: e.target.value })}
                    />
                  </div>

                  {/* AM End Time */}
                  <div>
                    <Label htmlFor="amEnd">AM End Time</Label>
                    <Input
                      id="amEnd"
                      type="time"
                      value={timesheetData.amEndTime}
                      onChange={(e) => setTimesheetData({ ...timesheetData, amEndTime: e.target.value })}
                    />
                  </div>

                  {/* PM Start Time */}
                  <div>
                    <Label htmlFor="pmStart">PM Start Time (Optional)</Label>
                    <Input
                      id="pmStart"
                      type="time"
                      value={timesheetData.pmStartTime}
                      onChange={(e) => setTimesheetData({ ...timesheetData, pmStartTime: e.target.value })}
                    />
                  </div>

                  {/* PM End Time */}
                  <div>
                    <Label htmlFor="pmEnd">PM End Time (Optional)</Label>
                    <Input
                      id="pmEnd"
                      type="time"
                      value={timesheetData.pmEndTime}
                      onChange={(e) => setTimesheetData({ ...timesheetData, pmEndTime: e.target.value })}
                    />
                  </div>

                  {/* SDG Goal */}
                  <div>
                    <Label htmlFor="sdg">SDG Goal</Label>
                    <Select value={timesheetData.sdgGoal} onValueChange={(val) => setTimesheetData({ ...timesheetData, sdgGoal: val })}>
                      <SelectTrigger id="sdg">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SDG_GOALS.map((goal) => (
                          <SelectItem key={goal.id} value={goal.id.toString()}>
                            {goal.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Activity Category */}
                  <div>
                    <Label htmlFor="category">Primary Activity Category</Label>
                    <Select value={timesheetData.activityCategory} onValueChange={(val) => setTimesheetData({ ...timesheetData, activityCategory: val })}>
                      <SelectTrigger id="category">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ACTIVITY_CATEGORIES.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Program */}
                  <div>
                    <Label htmlFor="program">Program/Department</Label>
                    <Input
                      id="program"
                      placeholder="e.g., Health Initiative"
                      value={timesheetData.program}
                      onChange={(e) => setTimesheetData({ ...timesheetData, program: e.target.value })}
                    />
                  </div>

                  {/* KPI */}
                  <div>
                    <Label htmlFor="kpi">Linked KPI</Label>
                    <Input
                      id="kpi"
                      placeholder="e.g., KPI-001"
                      value={timesheetData.kpi}
                      onChange={(e) => setTimesheetData({ ...timesheetData, kpi: e.target.value })}
                    />
                  </div>
                </div>

                {/* Total Hours Display */}
                <div className={`p-4 rounded-lg border-2 ${isOvertime ? "border-orange-300 bg-orange-50" : "border-blue-300 bg-blue-50"}`}>
                  <div className="flex items-center justify-between">
                    <span className={`font-medium ${isOvertime ? "text-orange-900" : "text-blue-900"}`}>
                      Total Hours
                    </span>
                    <span className={`text-2xl font-bold ${isOvertime ? "text-orange-600" : "text-blue-600"}`}>
                      {totalHours} hrs
                    </span>
                  </div>
                  {isOvertime && <p className="text-xs text-orange-700 mt-2">⚠ This exceeds 8 hours (overtime)</p>}
                </div>

                {/* Task Description */}
                <div>
                  <Label htmlFor="task">Task Description</Label>
                  <Textarea
                    id="task"
                    placeholder="Describe your main activities and accomplishments today..."
                    value={timesheetData.taskDescription}
                    onChange={(e) => setTimesheetData({ ...timesheetData, taskDescription: e.target.value })}
                    rows={4}
                  />
                </div>

                {/* Staff Remarks */}
                <div>
                  <Label htmlFor="remarks">Staff Remarks</Label>
                  <Textarea
                    id="remarks"
                    placeholder="Any additional notes or observations..."
                    value={timesheetData.staffRemarks}
                    onChange={(e) => setTimesheetData({ ...timesheetData, staffRemarks: e.target.value })}
                    rows={3}
                  />
                </div>

                {/* Evidence Upload */}
                <div>
                  <Label htmlFor="evidence">Evidence/Supporting Documents</Label>
                  <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-slate-400 transition">
                    <FileUp className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <Input
                      id="evidence"
                      type="file"
                      className="hidden"
                      onChange={(e) => setTimesheetData({ ...timesheetData, evidenceFile: e.target.files?.[0] || null })}
                    />
                    <label htmlFor="evidence" className="cursor-pointer">
                      <p className="text-sm text-slate-600">Click to upload or drag and drop</p>
                      <p className="text-xs text-slate-500">PDF, images, or documents (max 10MB)</p>
                    </label>
                  </div>
                </div>

                {/* Submit Button */}
                <Button
                  onClick={handleSubmitTimesheet}
                  disabled={isSubmittingTimesheet}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  size="lg"
                >
                  {isSubmittingTimesheet ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Submit Timesheet
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Leave Tab */}
          <TabsContent value="leave">
            <Card>
              <CardHeader>
                <CardTitle>Leave Management</CardTitle>
                <CardDescription>View your leave balance and submit requests</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <p className="text-sm text-blue-600 font-medium">Annual Leave</p>
                    <p className="text-2xl font-bold text-blue-900">{leaveBalance && leaveBalance.leaveType === 'annual' ? leaveBalance.remainingDays : 0}</p>
                    <p className="text-xs text-blue-600 mt-1">days remaining</p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <p className="text-sm text-green-600 font-medium">Sick Leave</p>
                    <p className="text-2xl font-bold text-green-900">{leaveBalance && leaveBalance.leaveType === 'sick' ? leaveBalance.remainingDays : 0}</p>
                    <p className="text-xs text-green-600 mt-1">days remaining</p>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                    <p className="text-sm text-purple-600 font-medium">Maternity Leave</p>
                    <p className="text-2xl font-bold text-purple-900">{leaveBalance && leaveBalance.leaveType === 'maternity' ? leaveBalance.remainingDays : 0}</p>
                    <p className="text-xs text-purple-600 mt-1">days remaining</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                    <p className="text-sm text-slate-600 font-medium">Unpaid Leave</p>
                    <p className="text-2xl font-bold text-slate-900">Unlimited</p>
                    <p className="text-xs text-slate-600 mt-1">subject to approval</p>
                  </div>
                </div>
                <Button className="w-full bg-blue-600 hover:bg-blue-700" size="lg">
                  Request Leave
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>Submission History</CardTitle>
                <CardDescription>View your past timesheets and submissions</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600">No submissions yet</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
