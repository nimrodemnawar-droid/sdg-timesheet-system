import React, { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  Download,
  MapPin,
  TrendingUp,
  LogOut,
  Plus,
  Search,
  Filter,
} from "lucide-react";
import { toast } from "sonner";
import { ExportDialog } from "@/components/ExportDialog";

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedRequest, setSelectedRequest] = useState<number | null>(null);
  const [approvalReason, setApprovalReason] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  const { data: stats } = trpc.attendance.getToday.useQuery() as any;
  const { data: leaveRequests, refetch: refetchRequests } = trpc.leave.getMyRequests.useQuery() as any;
  const { data: staffList } = trpc.users.getAll.useQuery();

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
      console.error(error);
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
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
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
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white">Admin Dashboard</h1>
            <p className="text-slate-400 mt-2">Complete timesheet management system</p>
          </div>
          <Button variant="outline" onClick={logout} className="gap-2 bg-slate-800 border-slate-600 text-white hover:bg-slate-700">
            <LogOut className="w-4 h-4" />
            Logout
          </Button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-slate-800 border-slate-700">
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

          <Card className="bg-slate-800 border-slate-700">
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

          <Card className="bg-slate-800 border-slate-700">
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

          <Card className="bg-slate-800 border-slate-700">
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
          <TabsList className="bg-slate-800 border-slate-700">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="staff">Staff Management</TabsTrigger>
            <TabsTrigger value="leave">Leave Requests</TabsTrigger>
            <TabsTrigger value="attendance">Attendance</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Recent Activity */}
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">Recent Activity</CardTitle>
                  <CardDescription className="text-slate-400">Latest timesheet submissions</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {staffList?.slice(0, 5).map((staff: any) => (
                    <div key={staff.id} className="flex items-center justify-between p-3 bg-slate-700 rounded-lg">
                      <div>
                        <p className="text-white font-medium">{staff.name}</p>
                        <p className="text-xs text-slate-400">{staff.email}</p>
                      </div>
                      <Badge className="bg-green-600">{staff.role}</Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Quick Actions */}
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
                {/* Search and Filter */}
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

                {/* Staff Table */}
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
                        <tr key={staff.id} className="border-b border-slate-700 hover:bg-slate-700/50">
                          <td className="py-3 px-4 text-white">{staff.name}</td>
                          <td className="py-3 px-4 text-slate-300">{staff.email}</td>
                          <td className="py-3 px-4">
                            <Badge className={staff.role === "admin" ? "bg-red-600" : staff.role === "supervisor" ? "bg-purple-600" : "bg-blue-600"}>
                              {staff.role}
                            </Badge>
                          </td>
                          <td className="py-3 px-4">
                            <Badge className="bg-green-600">Active</Badge>
                          </td>
                          <td className="py-3 px-4">
                            <Button size="sm" variant="outline" className="bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600">
                              Edit
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
              <CardContent className="space-y-4">
                {pendingRequests.length === 0 ? (
                  <p className="text-slate-400 text-center py-8">No pending leave requests</p>
                ) : (
                  <div className="space-y-4">
                    {pendingRequests.map((request: any) => (
                      <div key={request.id} className="p-4 bg-slate-700 rounded-lg border border-slate-600">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <p className="text-white font-semibold">{request.leaveType} Leave</p>
                            <p className="text-slate-400 text-sm">
                              {formatDate(request.startDate)} to {formatDate(request.endDate)}
                            </p>
                          </div>
                          <Badge className="bg-amber-600">{request.daysRequested} days</Badge>
                        </div>

                        {request.reason && (
                          <p className="text-slate-300 text-sm mb-4">Reason: {request.reason}</p>
                        )}

                        {selectedRequest === request.id ? (
                          <div className="space-y-3">
                            <div>
                              <Label className="text-slate-300 mb-2 block">Decision Notes</Label>
                              <Textarea
                                placeholder="Enter approval/rejection reason..."
                                value={approvalReason}
                                onChange={(e) => setApprovalReason(e.target.value)}
                                className="bg-slate-600 border-slate-500 text-white placeholder:text-slate-400"
                                rows={3}
                              />
                            </div>
                            <div className="flex gap-2">
                              <Button
                                onClick={() => handleApproveRequest(request.id)}
                                disabled={isProcessing}
                                className="flex-1 bg-green-600 hover:bg-green-700"
                              >
                                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Approve"}
                              </Button>
                              <Button
                                onClick={() => handleRejectRequest(request.id)}
                                disabled={isProcessing}
                                variant="destructive"
                                className="flex-1"
                              >
                                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Reject"}
                              </Button>
                              <Button
                                onClick={() => {
                                  setSelectedRequest(null);
                                  setApprovalReason("");
                                }}
                                variant="outline"
                                className="bg-slate-600 border-slate-500 text-slate-300 hover:bg-slate-500"
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
                <div className="flex gap-2">
                  <Input
                    type="date"
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                  <Button className="bg-blue-600 hover:bg-blue-700 gap-2">
                    <Download className="w-4 h-4" />
                    Export
                  </Button>
                </div>
                <div className="p-8 text-center text-slate-400">
                  <MapPin className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Attendance records will be displayed here</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">Attendance Report</CardTitle>
                  <CardDescription className="text-slate-400">Export attendance data as CSV or PDF</CardDescription>
                </CardHeader>
                <CardContent>
                  <ExportDialog reportType="attendance" />
                </CardContent>
              </Card>

              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">Overtime Report</CardTitle>
                  <CardDescription className="text-slate-400">Export overtime data as CSV or PDF</CardDescription>
                </CardHeader>
                <CardContent>
                  <ExportDialog reportType="overtime" />
                </CardContent>
              </Card>

              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">Leave Report</CardTitle>
                  <CardDescription className="text-slate-400">Export leave data as CSV or PDF</CardDescription>
                </CardHeader>
                <CardContent>
                  <ExportDialog reportType="leave" />
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
