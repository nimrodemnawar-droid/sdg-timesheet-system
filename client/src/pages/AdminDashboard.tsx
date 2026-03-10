import React, { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
} from "lucide-react";
import { toast } from "sonner";
import { ExportDialog } from "@/components/ExportDialog";

export default function AdminDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedRequest, setSelectedRequest] = useState<number | null>(null);
  const [approvalReason, setApprovalReason] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [showExport, setShowExport] = useState<"attendance" | "overtime" | "leave" | null>(null);

  // Queries
  const { data: stats } = trpc.attendance.getToday.useQuery() as any;
  const { data: leaveRequests, refetch: refetchRequests } = trpc.leave.getMyRequests.useQuery() as any;
  const { data: staffList } = trpc.users.getAll.useQuery();
  const { data: attendanceRecords } = trpc.attendance.getToday.useQuery();

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold text-white">Admin Dashboard</h1>
          <p className="text-slate-400 mt-2">Complete timesheet management system</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-slate-800 border-slate-700 hover:border-blue-500 transition-colors">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm mb-1">Total Staff</p>
                  <p className="text-3xl font-bold text-white">{staffList?.length || 0}</p>
                </div>
                <Users className="w-8 h-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700 hover:border-green-500 transition-colors">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm mb-1">Checked In Today</p>
                  <p className="text-3xl font-bold text-white">{stats?.checkedInCount || 0}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700 hover:border-yellow-500 transition-colors">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm mb-1">Overtime Hours</p>
                  <p className="text-3xl font-bold text-white">{stats?.overtimeHours || 0}h</p>
                </div>
                <Clock className="w-8 h-8 text-amber-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700 hover:border-red-500 transition-colors">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm mb-1">Pending Requests</p>
                  <p className="text-3xl font-bold text-white">{pendingRequests.length}</p>
                </div>
                <AlertCircle className="w-8 h-8 text-red-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="bg-slate-800 border border-slate-700">
            <TabsTrigger value="overview" className="data-[state=active]:bg-blue-600">Overview</TabsTrigger>
            <TabsTrigger value="staff" className="data-[state=active]:bg-blue-600">Staff Management</TabsTrigger>
            <TabsTrigger value="leave" className="data-[state=active]:bg-blue-600">Leave Requests</TabsTrigger>
            <TabsTrigger value="attendance" className="data-[state=active]:bg-blue-600">Attendance</TabsTrigger>
            <TabsTrigger value="reports" className="data-[state=active]:bg-blue-600">Reports</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">Recent Activity</CardTitle>
                  <CardDescription className="text-slate-400">Latest system events</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {staffList?.slice(0, 5).map((staff: any) => (
                    <div key={staff.id} className="flex items-center justify-between p-3 bg-slate-700 rounded-lg hover:bg-slate-600 transition">
                      <div>
                        <p className="text-white font-medium">{staff.name}</p>
                        <p className="text-xs text-slate-400">{staff.email}</p>
                      </div>
                      <Badge className={staff.role === "admin" ? "bg-red-600" : "bg-blue-600"}>{staff.role}</Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">Quick Actions</CardTitle>
                  <CardDescription className="text-slate-400">Common administrative tasks</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button className="w-full bg-blue-600 hover:bg-blue-700 justify-start gap-2">
                    <Plus className="w-4 h-4" />
                    Add New Staff
                  </Button>
                  <Button className="w-full bg-purple-600 hover:bg-purple-700 justify-start gap-2">
                    <Download className="w-4 h-4" />
                    Export Attendance Report
                  </Button>
                  <Button className="w-full bg-green-600 hover:bg-green-700 justify-start gap-2">
                    <MapPin className="w-4 h-4" />
                    View Live GPS Map
                  </Button>
                  <Button className="w-full bg-amber-600 hover:bg-amber-700 justify-start gap-2">
                    <TrendingUp className="w-4 h-4" />
                    View Analytics
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Staff Management Tab */}
          <TabsContent value="staff" className="space-y-4">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Staff Directory</CardTitle>
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
                      className="pl-10 bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                    />
                  </div>
                  <Button className="bg-blue-600 hover:bg-blue-700 gap-2">
                    <Plus className="w-4 h-4" />
                    Add Staff
                  </Button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-slate-600">
                      <tr>
                        <th className="text-left py-3 px-4 text-slate-300">Name</th>
                        <th className="text-left py-3 px-4 text-slate-300">Email</th>
                        <th className="text-left py-3 px-4 text-slate-300">Role</th>
                        <th className="text-left py-3 px-4 text-slate-300">Status</th>
                        <th className="text-left py-3 px-4 text-slate-300">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStaff?.map((staff: any) => (
                        <tr key={staff.id} className="border-b border-slate-700 hover:bg-slate-700/50">
                          <td className="py-3 px-4 text-white">{staff.name}</td>
                          <td className="py-3 px-4 text-slate-400">{staff.email}</td>
                          <td className="py-3 px-4">
                            <Badge className={staff.role === "admin" ? "bg-red-600" : "bg-blue-600"}>{staff.role}</Badge>
                          </td>
                          <td className="py-3 px-4">
                            <Badge className={staff.isActive ? "bg-green-600" : "bg-gray-600"}>
                              {staff.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 flex gap-2">
                            <Button size="sm" variant="outline" className="border-slate-600 hover:bg-slate-700">
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="outline" className="border-slate-600 hover:bg-red-700">
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
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Leave Request Management</CardTitle>
                <CardDescription className="text-slate-400">Approve or reject leave requests</CardDescription>
              </CardHeader>
              <CardContent>
                {pendingRequests.length > 0 ? (
                  <div className="space-y-4">
                    {pendingRequests.map((request: any) => (
                      <div key={request.id} className="p-4 bg-slate-700 rounded-lg">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <p className="font-medium text-white">{request.leaveType}</p>
                            <p className="text-sm text-slate-400">
                              {new Date(request.startDate).toLocaleDateString()} - {new Date(request.endDate).toLocaleDateString()}
                            </p>
                          </div>
                          <Badge className="bg-yellow-600">Pending</Badge>
                        </div>
                        <p className="text-sm text-slate-300 mb-3">{request.reason}</p>
                        
                        {selectedRequest === request.id ? (
                          <div className="space-y-3">
                            <Textarea
                              placeholder="Enter approval/rejection reason..."
                              value={approvalReason}
                              onChange={(e) => setApprovalReason(e.target.value)}
                              className="bg-slate-600 border-slate-500 text-white placeholder:text-slate-400"
                            />
                            <div className="flex gap-2">
                              <Button
                                onClick={() => handleApproveRequest(request.id)}
                                disabled={isProcessing}
                                className="bg-green-600 hover:bg-green-700 flex-1"
                              >
                                Approve
                              </Button>
                              <Button
                                onClick={() => handleRejectRequest(request.id)}
                                disabled={isProcessing}
                                className="bg-red-600 hover:bg-red-700 flex-1"
                              >
                                Reject
                              </Button>
                              <Button
                                onClick={() => {
                                  setSelectedRequest(null);
                                  setApprovalReason("");
                                }}
                                variant="outline"
                                className="border-slate-600"
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <Button
                            onClick={() => setSelectedRequest(request.id)}
                            className="w-full bg-blue-600 hover:bg-blue-700"
                          >
                            Review Request
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-slate-400">No pending leave requests</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Attendance Tab */}
          <TabsContent value="attendance" className="space-y-4">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Attendance Records</CardTitle>
                <CardDescription className="text-slate-400">View and manage attendance data</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2 mb-4">
                  <Input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>

                {attendanceRecords && attendanceRecords.checkInTime ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="border-b border-slate-600">
                        <tr>
                          <th className="text-left py-3 px-4 text-slate-300">Staff</th>
                          <th className="text-left py-3 px-4 text-slate-300">Check-in</th>
                          <th className="text-left py-3 px-4 text-slate-300">Check-out</th>
                          <th className="text-left py-3 px-4 text-slate-300">Duration</th>
                          <th className="text-left py-3 px-4 text-slate-300">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-slate-700 hover:bg-slate-700/50">
                            <td className="py-3 px-4 text-white">Staff Member</td>
                            <td className="py-3 px-4 text-slate-400">
                              {new Date(attendanceRecords.checkInTime).toLocaleTimeString()}
                            </td>
                            <td className="py-3 px-4 text-slate-400">
                              {attendanceRecords.checkOutTime ? new Date(attendanceRecords.checkOutTime).toLocaleTimeString() : "—"}
                            </td>
                            <td className="py-3 px-4 text-white">— hrs</td>
                            <td className="py-3 px-4">
                              <Badge className={attendanceRecords.checkOutTime ? "bg-green-600" : "bg-yellow-600"}>
                                {attendanceRecords.checkOutTime ? "Completed" : "Active"}
                              </Badge>
                            </td>
                          </tr>
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-slate-400">No attendance records for this date</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <FileText className="w-5 h-5" /> Attendance Report
                  </CardTitle>
                  <CardDescription className="text-slate-400">Export attendance data</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={() => setShowExport("attendance")}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    <Download className="w-4 h-4 mr-2" /> Export
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <TrendingUp className="w-5 h-5" /> Overtime Report
                  </CardTitle>
                  <CardDescription className="text-slate-400">Export overtime data</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={() => setShowExport("overtime")}
                    className="w-full bg-orange-600 hover:bg-orange-700"
                  >
                    <Download className="w-4 h-4 mr-2" /> Export
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <AlertCircle className="w-5 h-5" /> Leave Report
                  </CardTitle>
                  <CardDescription className="text-slate-400">Export leave data</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={() => setShowExport("leave")}
                    className="w-full bg-red-600 hover:bg-red-700"
                  >
                    <Download className="w-4 h-4 mr-2" /> Export
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Export Dialog */}
      {showExport && (
        <ExportDialog
          reportType={showExport}
          onExport={() => setShowExport(null)}
        />
      )}
    </div>
  );
}
