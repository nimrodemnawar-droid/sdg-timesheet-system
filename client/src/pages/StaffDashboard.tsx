import { useEffect, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, MapPin, Clock, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface GPSCoordinates {
  latitude: number;
  longitude: number;
  accuracy: number;
}

export default function StaffDashboard() {
  const { user } = useAuth();
  const [gpsCoordinates, setGpsCoordinates] = useState<GPSCoordinates | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [gpsStatus, setGpsStatus] = useState<"idle" | "acquiring" | "ready">("idle");

  const { data: todayAttendance, refetch: refetchAttendance } = trpc.attendance.getToday.useQuery();
  const checkInMutation = trpc.attendance.checkIn.useMutation();
  const checkOutMutation = trpc.attendance.checkOut.useMutation();
  const submitTimesheetMutation = trpc.attendance.submitTimesheet.useMutation();

  // Request GPS permission and start tracking
  useEffect(() => {
    if (!navigator.geolocation) {
      setGpsError("Geolocation is not supported by your browser");
      return;
    }

    // Request permission and get initial position
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

      toast.success("Checked in successfully");
      await refetchAttendance();
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
      // Calculate distance (simplified - would use waypoints in real app)
      const distance = "0.0";

      await checkOutMutation.mutateAsync({
        attendanceId: todayAttendance.id,
        latitude: gpsCoordinates.latitude.toFixed(8),
        longitude: gpsCoordinates.longitude.toFixed(8),
        accuracy: gpsCoordinates.accuracy.toFixed(2),
        distanceTraveled: distance,
      });

      toast.success("Checked out successfully");
      await refetchAttendance();
    } catch (error) {
      toast.error("Failed to check out");
      console.error(error);
    } finally {
      setIsCheckingOut(false);
    }
  };

  const handleSubmitTimesheet = async () => {
    if (!todayAttendance) {
      toast.error("No attendance record found");
      return;
    }

    try {
      await submitTimesheetMutation.mutateAsync({
        attendanceId: todayAttendance.id,
      });

      toast.success("Timesheet submitted successfully");
      await refetchAttendance();
    } catch (error) {
      toast.error("Failed to submit timesheet");
      console.error(error);
    }
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const calculateDuration = () => {
    if (!todayAttendance?.checkOutTime) return null;
    const checkIn = new Date(todayAttendance.checkInTime).getTime();
    const checkOut = new Date(todayAttendance.checkOutTime).getTime();
    const minutes = Math.floor((checkOut - checkIn) / 60000);
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const getAccuracyQuality = (accuracy: number) => {
    if (accuracy < 10) return { label: "Excellent", color: "bg-green-100 text-green-800" };
    if (accuracy < 50) return { label: "Good", color: "bg-blue-100 text-blue-800" };
    if (accuracy < 100) return { label: "Fair", color: "bg-yellow-100 text-yellow-800" };
    return { label: "Poor", color: "bg-red-100 text-red-800" };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-slate-900">Staff Dashboard</h1>
          <p className="text-slate-600">Welcome, {user?.name || "Staff Member"}</p>
        </div>

        {/* GPS Status Card */}
        <Card className="border-slate-200">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">GPS Status</CardTitle>
              <Badge
                variant="outline"
                className={
                  gpsStatus === "ready"
                    ? "bg-green-50 text-green-700 border-green-200"
                    : gpsStatus === "acquiring"
                      ? "bg-yellow-50 text-yellow-700 border-yellow-200"
                      : "bg-slate-50 text-slate-700 border-slate-200"
                }
              >
                {gpsStatus === "ready" ? "Ready" : gpsStatus === "acquiring" ? "Acquiring..." : "Idle"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {gpsError && (
              <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-700">{gpsError}</p>
              </div>
            )}

            {gpsCoordinates && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <p className="text-xs text-slate-600 mb-1">Latitude</p>
                    <p className="font-mono text-sm font-semibold text-slate-900">
                      {gpsCoordinates.latitude.toFixed(8)}
                    </p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <p className="text-xs text-slate-600 mb-1">Longitude</p>
                    <p className="font-mono text-sm font-semibold text-slate-900">
                      {gpsCoordinates.longitude.toFixed(8)}
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-xs text-slate-600 mb-1">Accuracy</p>
                  <div className="flex items-center justify-between">
                    <p className="font-mono text-sm font-semibold text-slate-900">
                      {gpsCoordinates.accuracy.toFixed(2)} m
                    </p>
                    <Badge className={getAccuracyQuality(gpsCoordinates.accuracy).color}>
                      {getAccuracyQuality(gpsCoordinates.accuracy).label}
                    </Badge>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Attendance Card */}
        <Card className="border-slate-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Today's Attendance</CardTitle>
            <CardDescription>
              {todayAttendance ? "Active session" : "No active session"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {todayAttendance ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-xs text-green-700 mb-1">Check-In Time</p>
                    <p className="font-semibold text-green-900">{formatTime(todayAttendance.checkInTime)}</p>
                  </div>

                  {todayAttendance.checkOutTime ? (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-xs text-red-700 mb-1">Check-Out Time</p>
                      <p className="font-semibold text-red-900">{formatTime(todayAttendance.checkOutTime)}</p>
                    </div>
                  ) : (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-xs text-blue-700 mb-1">Status</p>
                      <p className="font-semibold text-blue-900">Checked In</p>
                    </div>
                  )}
                </div>

                {todayAttendance.checkOutTime && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <p className="text-xs text-slate-600 mb-1">Duration</p>
                      <p className="font-semibold text-slate-900">{calculateDuration()}</p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <p className="text-xs text-slate-600 mb-1">Distance</p>
                      <p className="font-semibold text-slate-900">
                        {todayAttendance.distanceTraveled?.toString() || "0"} km
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  {!todayAttendance.checkOutTime ? (
                    <Button
                      onClick={handleCheckOut}
                      disabled={isCheckingOut || !gpsCoordinates}
                      className="flex-1 bg-red-600 hover:bg-red-700"
                    >
                      {isCheckingOut ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Checking Out...
                        </>
                      ) : (
                        <>
                          <MapPin className="w-4 h-4 mr-2" />
                          Check Out
                        </>
                      )}
                    </Button>
                  ) : !todayAttendance.isSubmitted ? (
                    <Button
                      onClick={handleSubmitTimesheet}
                      className="flex-1 bg-blue-600 hover:bg-blue-700"
                    >
                      <Clock className="w-4 h-4 mr-2" />
                      Submit Timesheet
                    </Button>
                  ) : (
                    <Button disabled className="flex-1">
                      ✓ Timesheet Submitted
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-slate-600 text-center py-4">No active check-in. Start your day by checking in.</p>
                <Button
                  onClick={handleCheckIn}
                  disabled={isCheckingIn || !gpsCoordinates}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  {isCheckingIn ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Checking In...
                    </>
                  ) : (
                    <>
                      <MapPin className="w-4 h-4 mr-2" />
                      Check In Now
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Info */}
        <Card className="border-slate-200 bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-900">
                <p className="font-semibold mb-1">GPS Precision</p>
                <p>
                  Your location is recorded with 8-decimal precision for accurate field work tracking. Ensure GPS is
                  enabled for best accuracy.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
