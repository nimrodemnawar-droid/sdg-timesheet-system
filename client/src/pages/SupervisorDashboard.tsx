import { useEffect, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MapPin, Users, Clock, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function SupervisorDashboard() {
  const { user } = useAuth();
  const [selectedStaff, setSelectedStaff] = useState<number | null>(null);
  const [remark, setRemark] = useState<string>("");
  const [isAddingRemark, setIsAddingRemark] = useState(false);
  const [startDate, setStartDate] = useState<string>(
    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split("T")[0]);

  const { data: staffList } = trpc.users.getAll.useQuery();
  const { data: attendanceData, refetch: refetchAttendance } = trpc.attendance.getStaffAttendance.useQuery(
    selectedStaff
      ? {
          userId: selectedStaff,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
        }
      : { userId: 0, startDate: new Date(), endDate: new Date() },
    { enabled: !!selectedStaff }
  );

  const addRemarkMutation = trpc.attendance.addRemark.useMutation();

  const handleAddRemark = async (attendanceId: number) => {
    if (!remark.trim()) {
      toast.error("Please enter a remark");
      return;
    }

    setIsAddingRemark(true);
    try {
      await addRemarkMutation.mutateAsync({
        attendanceId,
        userId: selectedStaff!,
        remark,
      });

      toast.success("Remark added successfully");
      setRemark("");
      await refetchAttendance();
    } catch (error) {
      toast.error("Failed to add remark");
      console.error(error);
    } finally {
      setIsAddingRemark(false);
    }
  };

  const formatTime = (date: Date | string) => {
    return new Date(date).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const calculateDuration = (checkIn: Date | string, checkOut: Date | string | null) => {
    if (!checkOut) return "In Progress";
    const checkInTime = new Date(checkIn).getTime();
    const checkOutTime = new Date(checkOut).getTime();
    const minutes = Math.floor((checkOutTime - checkInTime) / 60000);
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const getAccuracyQuality = (accuracy: number | string) => {
    const acc = typeof accuracy === "string" ? parseFloat(accuracy) : accuracy;
    if (acc < 10) return { label: "Excellent", color: "bg-green-100 text-green-800" };
    if (acc < 50) return { label: "Good", color: "bg-blue-100 text-blue-800" };
    if (acc < 100) return { label: "Fair", color: "bg-yellow-100 text-yellow-800" };
    return { label: "Poor", color: "bg-red-100 text-red-800" };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-slate-900">Supervisor Dashboard</h1>
          <p className="text-slate-600">Monitor staff attendance and field activities</p>
        </div>

        {/* Staff Selection */}
        <Card className="border-slate-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Select Staff Member</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {staffList?.map((staff) => (
                <button
                  key={staff.id}
                  onClick={() => setSelectedStaff(staff.id)}
                  className={`p-3 rounded-lg border-2 transition text-left ${
                    selectedStaff === staff.id
                      ? "border-blue-500 bg-blue-50"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <p className="font-semibold text-slate-900">{staff.name}</p>
                  <p className="text-xs text-slate-600">{staff.email}</p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {selectedStaff && (
          <>
            {/* Date Range Filter */}
            <Card className="border-slate-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Date Range</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-2 block">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-2 block">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Attendance Records */}
            <Card className="border-slate-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Attendance Records</CardTitle>
                <CardDescription>
                  {attendanceData?.length || 0} records found
                </CardDescription>
              </CardHeader>
              <CardContent>
                {attendanceData && attendanceData.length > 0 ? (
                  <div className="space-y-4">
                    {attendanceData.map((record) => (
                      <div
                        key={record.id}
                        className="p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition space-y-3"
                      >
                        {/* Header */}
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-semibold text-slate-900">
                              {formatDate(record.checkInTime)}
                            </p>
                            <p className="text-sm text-slate-600">
                              {formatTime(record.checkInTime)} - {record.checkOutTime ? formatTime(record.checkOutTime) : "In Progress"}
                            </p>
                          </div>
                          <Badge
                            variant="outline"
                            className={
                              record.checkOutTime
                                ? "bg-green-50 text-green-700 border-green-200"
                                : "bg-blue-50 text-blue-700 border-blue-200"
                            }
                          >
                            {record.checkOutTime ? "Completed" : "Active"}
                          </Badge>
                        </div>

                        {/* Location Data */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                          <div className="p-2 bg-slate-50 rounded">
                            <p className="text-xs text-slate-600">Check-In Lat</p>
                            <p className="font-mono font-semibold text-slate-900">
                              {record.checkInLat}
                            </p>
                          </div>
                          <div className="p-2 bg-slate-50 rounded">
                            <p className="text-xs text-slate-600">Check-In Lng</p>
                            <p className="font-mono font-semibold text-slate-900">
                              {record.checkInLng}
                            </p>
                          </div>
                          {record.checkOutLat && (
                            <div className="p-2 bg-slate-50 rounded">
                              <p className="text-xs text-slate-600">Check-Out Lat</p>
                              <p className="font-mono font-semibold text-slate-900">
                                {record.checkOutLat}
                              </p>
                            </div>
                          )}
                          {record.checkOutLng && (
                            <div className="p-2 bg-slate-50 rounded">
                              <p className="text-xs text-slate-600">Check-Out Lng</p>
                              <p className="font-mono font-semibold text-slate-900">
                                {record.checkOutLng}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Metrics */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                          <div className="p-2 bg-slate-50 rounded">
                            <p className="text-xs text-slate-600">Duration</p>
                            <p className="font-semibold text-slate-900">
                              {calculateDuration(record.checkInTime, record.checkOutTime)}
                            </p>
                          </div>
                          <div className="p-2 bg-slate-50 rounded">
                            <p className="text-xs text-slate-600">Distance</p>
                            <p className="font-semibold text-slate-900">
                              {record.distanceTraveled?.toString() || "0"} km
                            </p>
                          </div>
                          <div className="p-2 bg-slate-50 rounded">
                            <p className="text-xs text-slate-600">Check-In Accuracy</p>
                            <div className="flex items-center justify-between gap-2">
                              <p className="font-semibold text-slate-900">
                                {record.checkInAccuracy?.toString() || "N/A"} m
                              </p>
                              {record.checkInAccuracy && (
                                <Badge
                                  className={
                                    getAccuracyQuality(record.checkInAccuracy).color
                                  }
                                >
                                  {getAccuracyQuality(record.checkInAccuracy).label}
                                </Badge>
                              )}
                            </div>
                          </div>
                          {record.checkOutAccuracy && (
                            <div className="p-2 bg-slate-50 rounded">
                              <p className="text-xs text-slate-600">Check-Out Accuracy</p>
                              <div className="flex items-center justify-between gap-2">
                                <p className="font-semibold text-slate-900">
                                  {record.checkOutAccuracy.toString()} m
                                </p>
                                <Badge
                                  className={
                                    getAccuracyQuality(record.checkOutAccuracy).color
                                  }
                                >
                                  {getAccuracyQuality(record.checkOutAccuracy).label}
                                </Badge>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Remark Section */}
                        <div className="pt-3 border-t border-slate-200 space-y-2">
                          <p className="text-sm font-medium text-slate-700">Add Remark</p>
                          <div className="flex gap-2">
                            <Textarea
                              placeholder="Add observation or note about this work session..."
                              value={remark}
                              onChange={(e) => setRemark(e.target.value)}
                              className="flex-1 text-sm"
                              rows={2}
                            />
                            <Button
                              onClick={() => handleAddRemark(record.id)}
                              disabled={isAddingRemark || !remark.trim()}
                              className="bg-blue-600 hover:bg-blue-700"
                            >
                              {isAddingRemark ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                "Add"
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-slate-600 py-8">
                    No attendance records found for the selected date range
                  </p>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {/* Info Card */}
        <Card className="border-slate-200 bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-900">
                <p className="font-semibold mb-1">GPS Precision Tracking</p>
                <p>
                  All staff locations are recorded with 8-decimal GPS precision. Accuracy metrics help identify
                  signal quality. Add remarks to document observations about field work quality and performance.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
