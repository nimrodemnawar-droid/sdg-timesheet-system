import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Users, Clock, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function AdminDashboard() {
  const { user } = useAuth();
  const [selectedRequest, setSelectedRequest] = useState<number | null>(null);
  const [approvalReason, setApprovalReason] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);

  const { data: stats } = trpc.attendance.getToday.useQuery() as any;
  const { data: leaveRequests, refetch: refetchRequests } = trpc.leave.getMyRequests.useQuery() as any;
  const { data: staffList } = trpc.users.getAll.useQuery();

  const approveRequestMutation = trpc.leave.createRequest.useMutation() as any;
  const rejectRequestMutation = trpc.leave.createRequest.useMutation() as any;

  const handleApproveRequest = async (requestId: number) => {
    if (!approvalReason.trim()) {
      toast.error("Please enter an approval reason");
      return;
    }

    setIsProcessing(true);
    try {
      await approveRequestMutation.mutateAsync({
        leaveRequestId: requestId,
        approvalReason,
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
        approvalReason,
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-slate-900">Admin Dashboard</h1>
          <p className="text-slate-600">System overview and leave request management</p>
        </div>

        {/* KPI Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-slate-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Total Staff
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-slate-900">{stats.totalStaff}</p>
                <p className="text-xs text-slate-500 mt-1">Active users</p>
              </CardContent>
            </Card>

            <Card className="border-slate-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Checked In Today
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-green-600">{stats.checkedInToday}</p>
                <p className="text-xs text-slate-500 mt-1">
                  {((stats.checkedInToday / stats.totalStaff) * 100).toFixed(0)}% attendance
                </p>
              </CardContent>
            </Card>

            <Card className="border-slate-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Overtime Hours
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-orange-600">{stats.totalOvertimeHours}</p>
                <p className="text-xs text-slate-500 mt-1">This week</p>
              </CardContent>
            </Card>

            <Card className="border-slate-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  Pending Requests
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-amber-600">{leaveRequests?.length || 0}</p>
                <p className="text-xs text-slate-500 mt-1">Leave requests</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Leave Request Management */}
        <Card className="border-slate-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Leave Request Management</CardTitle>
            <CardDescription>Review and approve/reject staff leave requests</CardDescription>
          </CardHeader>
          <CardContent>
            {leaveRequests && leaveRequests.length > 0 ? (
              <div className="space-y-4">
                {leaveRequests.map((request: any) => (
                  <div
                    key={request.id}
                    onClick={() => setSelectedRequest(selectedRequest === request.id ? null : request.id)}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition ${
                      selectedRequest === request.id
                        ? "border-blue-500 bg-blue-50"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    {/* Request Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-semibold text-slate-900">
                          {request.userName || "Unknown Staff"}
                        </p>
                        <p className="text-sm text-slate-600">{request.userEmail}</p>
                      </div>
                      <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                        Pending
                      </Badge>
                    </div>

                    {/* Request Details */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3 text-sm">
                      <div className="p-2 bg-slate-50 rounded">
                        <p className="text-xs text-slate-600">Type</p>
                        <p className="font-semibold text-slate-900 capitalize">{request.leaveType}</p>
                      </div>
                      <div className="p-2 bg-slate-50 rounded">
                        <p className="text-xs text-slate-600">Days Requested</p>
                        <p className="font-semibold text-slate-900">{request.daysRequested}</p>
                      </div>
                      <div className="p-2 bg-slate-50 rounded">
                        <p className="text-xs text-slate-600">Start Date</p>
                        <p className="font-semibold text-slate-900">
                          {formatDate(request.startDate)}
                        </p>
                      </div>
                      <div className="p-2 bg-slate-50 rounded">
                        <p className="text-xs text-slate-600">End Date</p>
                        <p className="font-semibold text-slate-900">
                          {formatDate(request.endDate)}
                        </p>
                      </div>
                    </div>

                    {/* Reason */}
                    {request.reason && (
                      <p className="text-sm text-slate-600 italic mb-3">
                        <strong>Reason:</strong> {request.reason}
                      </p>
                    )}

                    {/* Expanded Action Panel */}
                    {selectedRequest === request.id && (
                      <div className="mt-4 pt-4 border-t border-slate-200 space-y-3">
                        <div>
                          <label className="text-sm font-medium text-slate-700 mb-2 block">
                            Approval/Rejection Reason
                          </label>
                          <Textarea
                            placeholder="Enter your decision reason..."
                            value={approvalReason}
                            onChange={(e) => setApprovalReason(e.target.value)}
                            className="text-sm"
                            rows={3}
                          />
                        </div>

                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleApproveRequest(request.id)}
                            disabled={isProcessing || !approvalReason.trim()}
                            className="flex-1 bg-green-600 hover:bg-green-700"
                          >
                            {isProcessing ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Processing...
                              </>
                            ) : (
                              "Approve"
                            )}
                          </Button>
                          <Button
                            onClick={() => handleRejectRequest(request.id)}
                            disabled={isProcessing || !approvalReason.trim()}
                            variant="destructive"
                            className="flex-1"
                          >
                            {isProcessing ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Processing...
                              </>
                            ) : (
                              "Reject"
                            )}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-slate-600 py-8">No pending leave requests</p>
            )}
          </CardContent>
        </Card>

        {/* Staff Overview */}
        <Card className="border-slate-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Staff Overview</CardTitle>
            <CardDescription>All registered staff members</CardDescription>
          </CardHeader>
          <CardContent>
            {staffList && staffList.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-slate-200">
                    <tr>
                      <th className="text-left py-2 px-3 font-semibold text-slate-700">Name</th>
                      <th className="text-left py-2 px-3 font-semibold text-slate-700">Email</th>
                      <th className="text-left py-2 px-3 font-semibold text-slate-700">Role</th>
                      <th className="text-left py-2 px-3 font-semibold text-slate-700">Login Method</th>
                    </tr>
                  </thead>
                  <tbody>
                    {staffList.map((staff) => (
                      <tr key={staff.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-3 px-3 text-slate-900">{staff.name}</td>
                        <td className="py-3 px-3 text-slate-600">{staff.email}</td>
                        <td className="py-3 px-3">
                          <Badge
                            variant="outline"
                            className={
                              staff.role === "admin"
                                ? "bg-purple-50 text-purple-700 border-purple-200"
                                : "bg-blue-50 text-blue-700 border-blue-200"
                            }
                          >
                            {staff.role.charAt(0).toUpperCase() + staff.role.slice(1)}
                          </Badge>
                        </td>
                        <td className="py-3 px-3 text-slate-600 capitalize">{staff.loginMethod}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-center text-slate-600 py-8">No staff members found</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
