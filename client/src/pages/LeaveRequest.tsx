import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, Calendar, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function LeaveRequest() {
  const { user } = useAuth();
  const [leaveType, setLeaveType] = useState<string>("annual");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [reason, setReason] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: leaveRequests, refetch: refetchRequests } = trpc.leave.getMyRequests.useQuery();
  const { data: leaveBalance, isError: leaveBalanceError } = trpc.leave.getBalance.useQuery({ leaveType });
  const createRequestMutation = trpc.leave.createRequest.useMutation();

  // Default leave balance if query fails
  const defaultLeaveBalance = {
    allocatedDays: 20,
    usedDays: 0,
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!startDate || !endDate) {
      toast.error("Please select start and end dates");
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      toast.error("End date must be after start date");
      return;
    }

    setIsSubmitting(true);
    try {
      // Calculate days requested (simplified)
      const start = new Date(startDate);
      const end = new Date(endDate);
      const daysRequested = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

      await createRequestMutation.mutateAsync({
        leaveType: leaveType as "annual" | "sick" | "unpaid" | "maternity" | "other",
        startDate: start,
        endDate: end,
        daysRequested: daysRequested.toString(),
        reason,
      });

      toast.success("Leave request submitted successfully");
      setStartDate("");
      setEndDate("");
      setReason("");
      await refetchRequests();
    } catch (error) {
      toast.error("Failed to submit leave request");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-green-100 text-green-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-slate-100 text-slate-800";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-slate-900">Leave Management</h1>
          <p className="text-slate-600">Request and track your leave balance</p>
        </div>

        {/* Leave Balance Card */}
        <Card className="border-slate-200 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Current Leave Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="p-3 bg-white rounded-lg border border-blue-200">
                <p className="text-xs text-slate-600 mb-1">Allocated</p>
                <p className="text-2xl font-bold text-blue-900">
                  {(leaveBalance?.allocatedDays || defaultLeaveBalance.allocatedDays)}
                </p>
                <p className="text-xs text-slate-500 mt-1">days</p>
              </div>
              <div className="p-3 bg-white rounded-lg border border-blue-200">
                <p className="text-xs text-slate-600 mb-1">Used</p>
                <p className="text-2xl font-bold text-orange-600">
                  {(leaveBalance?.usedDays || defaultLeaveBalance.usedDays)}
                </p>
                <p className="text-xs text-slate-500 mt-1">days</p>
              </div>
              <div className="p-3 bg-white rounded-lg border border-blue-200">
                <p className="text-xs text-slate-600 mb-1">Remaining</p>
                <p className="text-2xl font-bold text-green-600">
                  {parseFloat((leaveBalance?.allocatedDays || defaultLeaveBalance.allocatedDays).toString()) - parseFloat((leaveBalance?.usedDays || defaultLeaveBalance.usedDays).toString())}
                </p>
                <p className="text-xs text-slate-500 mt-1">days</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Leave Request Form */}
        <Card className="border-slate-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Submit Leave Request</CardTitle>
            <CardDescription>Request time off from work</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="leaveType">Leave Type</Label>
                  <Select value={leaveType} onValueChange={setLeaveType}>
                    <SelectTrigger id="leaveType">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="annual">Annual Leave</SelectItem>
                      <SelectItem value="sick">Sick Leave</SelectItem>
                      <SelectItem value="maternity">Maternity Leave</SelectItem>
                      <SelectItem value="unpaid">Unpaid Leave</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="endDate">End Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reason">Reason (Optional)</Label>
                  <Input
                    id="reason"
                    placeholder="Brief reason for leave"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Calendar className="w-4 h-4 mr-2" />
                    Submit Request
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Leave Requests History */}
        <Card className="border-slate-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Request History</CardTitle>
            <CardDescription>Your past and pending leave requests</CardDescription>
          </CardHeader>
          <CardContent>
            {leaveRequests && Array.isArray(leaveRequests) && leaveRequests.length > 0 ? (
              <div className="space-y-3">
                {leaveRequests.map((request) => (
                  <div
                    key={request.id}
                    className="p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-semibold text-slate-900 capitalize">
                          {request.leaveType} Leave
                        </p>
                        <p className="text-sm text-slate-600">
                          {formatDate(request.startDate.toString())} to{" "}
                          {formatDate(request.endDate.toString())}
                        </p>
                      </div>
                      <Badge className={getStatusColor(request.status)}>
                        {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-slate-600">Days Requested</p>
                        <p className="font-semibold text-slate-900">{request.daysRequested}</p>
                      </div>
                      {request.approvalReason && (
                        <div>
                          <p className="text-slate-600">
                            {request.status === "rejected" ? "Rejection Reason" : "Approval Note"}
                          </p>
                          <p className="font-semibold text-slate-900">{request.approvalReason}</p>
                        </div>
                      )}
                    </div>

                    {request.reason && (
                      <p className="text-sm text-slate-600 mt-2 italic">"{request.reason}"</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-slate-600 py-8">No leave requests yet</p>
            )}
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="border-slate-200 bg-amber-50 border-amber-200">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-amber-900">
                <p className="font-semibold mb-1">Leave Request Process</p>
                <p>
                  Submit your leave request with the dates and reason. Your supervisor or admin will review and
                  approve/reject your request. You'll receive an email notification with the decision.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
