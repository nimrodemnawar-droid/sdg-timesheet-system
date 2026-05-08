import React, { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MapPin, Users, Clock, AlertCircle, Loader2, CheckCircle2, MessageSquare, TrendingUp } from "lucide-react";
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
  const [activeTab, setActiveTab] = useState("overview");

  const { data: staffList } = trpc.users.getAll.useQuery();
  const { data: attendanceData, refetch: refetchAttendance } = trpc.attendance.getStaffAttendance.useQuery(
    selectedStaff
      ? {
          staffId: selectedStaff,
          startDate: startDate,
          endDate: endDate,
        }
      : { staffId: 0 },
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
    if (acc < 10) return { label: "Excellent", color: "bg-green-600" };
    if (acc < 50) return { label: "Good", color: "bg-blue-600" };
    if (acc < 100) return { label: "Fair", color: "bg-yellow-600" };
    return { label: "Poor", color: "bg-red-600" };
  };

  const selectedStaffData = staffList?.find((s: any) => s.id === selectedStaff);
  const totalStaffCount = staffList?.length || 0;
  const checkedInCount = staffList?.filter((s: any) => s.isActive)?.length || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <Users className="w-8 h-8 text-blue-400" />
            <h1 className="text-4xl font-bold text-white">Supervisor Dashboard</h1>
          </div>
          <p className="text-slate-300">Monitor staff attendance and field activities</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-blue-500/30 hover:border-blue-400 transition-all duration-300 shadow-lg">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm mb-1 font-medium">Total Staff</p>
                  <p className="text-3xl font-bold text-white">{totalStaffCount}</p>
                  <p className="text-xs text-slate-500 mt-1">Under supervision</p>
                </div>
                <Users className="w-10 h-10 text-blue-400 opacity-80" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-green-500/30 hover:border-green-400 transition-all duration-300 shadow-lg">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm mb-1 font-medium">Active Today</p>
                  <p className="text-3xl font-bold text-white">{checkedInCount}</p>
                  <p className="text-xs text-slate-500 mt-1">Checked in</p>
                </div>
                <CheckCircle2 className="w-10 h-10 text-green-400 opacity-80" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-amber-500/30 hover:border-amber-400 transition-all duration-300 shadow-lg">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm mb-1 font-medium">Selected Staff</p>
                  <p className="text-3xl font-bold text-white">{selectedStaffData?.name || "None"}</p>
                  <p className="text-xs text-slate-500 mt-1">For detailed view</p>
                </div>
                <MapPin className="w-10 h-10 text-amber-400 opacity-80" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Staff List */}
          <Card className="lg:col-span-1 bg-slate-800/50 border-slate-700 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-400" />
                Staff List
              </CardTitle>
              <CardDescription className="text-slate-400">Select staff to view details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {staffList?.map((staff: any) => (
                <button
                  key={staff.id}
                  onClick={() => setSelectedStaff(staff.id)}
                  className={`w-full text-left p-3 rounded-lg transition border ${
                    selectedStaff === staff.id
                      ? "bg-blue-600 border-blue-500 text-white"
                      : "bg-slate-700/50 border-slate-600/50 text-slate-300 hover:bg-slate-700"
                  }`}
                >
                  <p className="font-medium">{staff.name}</p>
                  <p className="text-xs opacity-75">{staff.email}</p>
                  <Badge className={`mt-1 ${staff.isActive ? "bg-green-600" : "bg-slate-600"}`}>
                    {staff.isActive ? "Active" : "Inactive"}
                  </Badge>
                </button>
              ))}
            </CardContent>
          </Card>

          {/* Attendance Details */}
          <div className="lg:col-span-3 space-y-4">
            {selectedStaff ? (
              <>
                {/* Date Range Filter */}
                <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Clock className="w-5 h-5 text-blue-400" />
                      Filter Period
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex gap-4">
                    <div className="flex-1">
                      <label className="text-sm text-slate-400 block mb-1">From</label>
                      <Input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="bg-slate-700/50 border-slate-600 text-white"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-sm text-slate-400 block mb-1">To</label>
                      <Input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="bg-slate-700/50 border-slate-600 text-white"
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Attendance Records */}
                <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-blue-400" />
                      Attendance Records
                    </CardTitle>
                    <CardDescription className="text-slate-400">
                      {formatDate(startDate)} to {formatDate(endDate)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {attendanceData && Array.isArray(attendanceData) && attendanceData.length > 0 ? (
                      attendanceData.map((record: any) => {
                        const accuracyQuality = getAccuracyQuality(record.checkInAccuracy || 0);
                        return (
                          <div key={record.id} className="p-4 bg-slate-700/50 rounded-lg border border-slate-600/50 hover:border-blue-500/50 transition">
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                <p className="text-white font-medium">{formatDate(record.checkInTime)}</p>
                                <div className="flex gap-2 mt-1">
                                  <Badge className={`${accuracyQuality.color} text-white`}>
                                    {accuracyQuality.label} GPS
                                  </Badge>
                                  <Badge className={record.checkOutTime ? "bg-green-600" : "bg-blue-600"}>
                                    {record.checkOutTime ? "Completed" : "In Progress"}
                                  </Badge>
                                </div>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                              <div>
                                <p className="text-slate-400">Check In</p>
                                <p className="text-white font-medium">{formatTime(record.checkInTime)}</p>
                              </div>
                              <div>
                                <p className="text-slate-400">Check Out</p>
                                <p className="text-white font-medium">
                                  {record.checkOutTime ? formatTime(record.checkOutTime) : "-"}
                                </p>
                              </div>
                              <div>
                                <p className="text-slate-400">Duration</p>
                                <p className="text-white font-medium">
                                  {calculateDuration(record.checkInTime, record.checkOutTime)}
                                </p>
                              </div>
                              <div>
                                <p className="text-slate-400">Accuracy</p>
                                <p className="text-white font-medium">
                                  {record.checkInAccuracy ? `${parseFloat(record.checkInAccuracy).toFixed(1)}m` : "-"}
                                </p>
                              </div>
                            </div>

                            {record.supervisorRemark && (
                              <div className="p-2 bg-blue-900/20 rounded border border-blue-500/30 mb-3">
                                <p className="text-xs text-blue-300 font-medium mb-1">Supervisor Remark</p>
                                <p className="text-blue-200 text-sm">{record.supervisorRemark}</p>
                              </div>
                            )}

                            <div className="space-y-2">
                              <Textarea
                                placeholder="Add supervisor remark..."
                                value={remark}
                                onChange={(e) => setRemark(e.target.value)}
                                className="bg-slate-600/50 border-slate-600 text-white placeholder:text-slate-400 text-sm min-h-16"
                              />
                              <Button
                                onClick={() => handleAddRemark(record.id)}
                                disabled={isAddingRemark || !remark.trim()}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white border-0"
                              >
                                {isAddingRemark ? (
                                  <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Adding Remark...
                                  </>
                                ) : (
                                  <>
                                    <MessageSquare className="w-4 h-4 mr-2" />
                                    Add Remark
                                  </>
                                )}
                              </Button>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center py-8">
                        <AlertCircle className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                        <p className="text-slate-400">No attendance records found for this period</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
                <CardContent className="pt-12 pb-12 text-center">
                  <Users className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400 text-lg">Select a staff member to view their attendance records</p>
                  <p className="text-slate-500 text-sm mt-2">Choose from the staff list on the left</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
