import { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  AlertCircle,
  CheckCircle,
  Clock,
  TrendingDown,
  Plus,
  RefreshCw,
  FileText,
} from "lucide-react";
import { toast } from "sonner";

interface LeaveBalance {
  id: number;
  leaveType: string;
  allocatedDays: string | number;
  usedDays: string | number;
  remainingDays: string | number;
  year: number;
}

const leaveTypeConfig: Record<string, { label: string; color: string; bgColor: string; icon: React.ReactNode }> = {
  annual: {
    label: "Annual Leave",
    color: "text-blue-400",
    bgColor: "bg-blue-900/20",
    icon: <Calendar className="w-5 h-5" />,
  },
  sick: {
    label: "Sick Leave",
    color: "text-red-400",
    bgColor: "bg-red-900/20",
    icon: <AlertCircle className="w-5 h-5" />,
  },
  maternity: {
    label: "Maternity Leave",
    color: "text-pink-400",
    bgColor: "bg-pink-900/20",
    icon: <CheckCircle className="w-5 h-5" />,
  },
  unpaid: {
    label: "Unpaid Leave",
    color: "text-amber-400",
    bgColor: "bg-amber-900/20",
    icon: <Clock className="w-5 h-5" />,
  },
  other: {
    label: "Other Leave",
    color: "text-purple-400",
    bgColor: "bg-purple-900/20",
    icon: <FileText className="w-5 h-5" />,
  },
};

export default function LeaveBalanceDashboard() {
  const { user } = useAuth();
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [isLoading, setIsLoading] = useState(true);


// Fetch all leave balances for the dashboard
  const { data: allBalancesData, isLoading: balancesLoading } = trpc.leave.getAllBalances.useQuery(
    undefined,
    { enabled: !!user }
  );

  // Get staff's leave requests to calculate actual usage
  const { data: myRequests, refetch: refetchRequests } = trpc.leave.getMyRequests.useQuery(undefined, {
    enabled: !!user,
  });

  useEffect(() => {
    if (allBalancesData && Array.isArray(allBalancesData)) {
      setBalances(allBalancesData as any);
      setIsLoading(false);
    } else if (balancesLoading) {
      setIsLoading(true);
    }
  }, [allBalancesData, balancesLoading]);

  const getProgressPercentage = (used: string | number, allocated: string | number) => {
    const usedNum = typeof used === 'string' ? parseFloat(used) : used;
    const allocatedNum = typeof allocated === 'string' ? parseFloat(allocated) : allocated;
    if (allocatedNum === 0) return 0;
    return Math.min((usedNum / allocatedNum) * 100, 100);
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return "bg-red-500";
    if (percentage >= 50) return "bg-amber-500";
    return "bg-green-500";
  };

  const getStatusBadge = (remaining: string | number, allocated: string | number) => {
    const remainingNum = typeof remaining === 'string' ? parseFloat(remaining) : remaining;
    const allocatedNum = typeof allocated === 'string' ? parseFloat(allocated) : allocated;
    if (remainingNum <= 0) {
      return <Badge className="bg-red-600">No Days Left</Badge>;
    }
    if (remainingNum <= allocatedNum * 0.2) {
      return <Badge className="bg-amber-600">Low Balance</Badge>;
    }
    return <Badge className="bg-green-600">Available</Badge>;
  };

  const totalAllocated = balances.reduce((sum, b) => sum + (typeof b.allocatedDays === 'string' ? parseFloat(b.allocatedDays) : b.allocatedDays || 0), 0);
  const totalUsed = balances.reduce((sum, b) => sum + (typeof b.usedDays === 'string' ? parseFloat(b.usedDays) : b.usedDays || 0), 0);
  const totalRemaining = balances.reduce((sum, b) => sum + (typeof b.remainingDays === 'string' ? parseFloat(b.remainingDays) : b.remainingDays || 0), 0);

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-6 flex items-center justify-center">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="pt-6 text-center">
            <p className="text-slate-300">Please log in to view your leave balance</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Leave Balance Dashboard</h1>
          <p className="text-slate-400">Track your leave allocation and usage for {selectedYear}</p>
        </div>

        {/* Year Selector */}
        <div className="mb-6 flex gap-2 items-center">
          <Button
            onClick={() => setSelectedYear(selectedYear - 1)}
            variant="outline"
            className="border-slate-600 text-slate-300 hover:bg-slate-700"
          >
            ← Previous Year
          </Button>
          <span className="text-white font-semibold px-4">{selectedYear}</span>
          <Button
            onClick={() => setSelectedYear(selectedYear + 1)}
            variant="outline"
            className="border-slate-600 text-slate-300 hover:bg-slate-700"
          >
            Next Year →
          </Button>
          <Button
            onClick={() => {
              setSelectedYear(new Date().getFullYear());
              refetchRequests();
            }}
            variant="outline"
            className="border-slate-600 text-slate-300 hover:bg-slate-700 ml-auto gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-blue-900/30 to-blue-900/10 border-blue-500/30">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-300 text-sm font-medium">Total Allocated</p>
                  <p className="text-3xl font-bold text-white">{totalAllocated}</p>
                  <p className="text-xs text-blue-300 mt-1">days</p>
                </div>
                <Calendar className="w-10 h-10 text-blue-400 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-900/30 to-amber-900/10 border-amber-500/30">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-amber-300 text-sm font-medium">Days Used</p>
                  <p className="text-3xl font-bold text-white">{totalUsed}</p>
                  <p className="text-xs text-amber-300 mt-1">
                    {totalAllocated > 0 ? `${Math.round((totalUsed / totalAllocated) * 100)}%` : "0%"}
                  </p>
                </div>
                <TrendingDown className="w-10 h-10 text-amber-400 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-900/30 to-green-900/10 border-green-500/30">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-300 text-sm font-medium">Days Remaining</p>
                  <p className="text-3xl font-bold text-white">{totalRemaining}</p>
                  <p className="text-xs text-green-300 mt-1">available</p>
                </div>
                <CheckCircle className="w-10 h-10 text-green-400 opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Leave Balance Cards */}
        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-slate-400">Loading leave balance...</p>
          </div>
        ) : balances.length === 0 ? (
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="pt-6 text-center">
              <AlertCircle className="w-12 h-12 text-slate-500 mx-auto mb-3" />
              <p className="text-slate-300 mb-4">No leave balance data available for {selectedYear}</p>
              <p className="text-slate-400 text-sm">Contact your HR department to initialize your leave balance</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {balances.map((balance) => {
              const config = leaveTypeConfig[balance.leaveType] || leaveTypeConfig.other;
              const usedDays = typeof balance.usedDays === 'string' ? parseFloat(balance.usedDays) : balance.usedDays || 0;
              const allocatedDays = typeof balance.allocatedDays === 'string' ? parseFloat(balance.allocatedDays) : balance.allocatedDays || 0;
              const remainingDays = typeof balance.remainingDays === 'string' ? parseFloat(balance.remainingDays) : balance.remainingDays || 0;
              const percentage = getProgressPercentage(usedDays, allocatedDays);
              const progressColor = getProgressColor(percentage);

              return (
                <Card key={balance.id} className="bg-slate-800/50 border-slate-700 hover:border-slate-600 transition">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${config.bgColor}`}>{config.icon}</div>
                        <div>
                          <CardTitle className="text-white">{config.label}</CardTitle>
                          <CardDescription className="text-slate-400">
                            {balance.year} allocation
                          </CardDescription>
                        </div>
                      </div>
                      {getStatusBadge(remainingDays, allocatedDays)}
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {/* Progress Bar */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-400">Usage Progress</span>
                        <span className="text-sm font-semibold text-white">
                          {usedDays} / {allocatedDays} days
                        </span>
                      </div>
                      <div className="w-full bg-slate-700/50 rounded-full h-3 overflow-hidden border border-slate-600/50">
                        <div
                          className={`h-full ${progressColor} transition-all duration-300`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <div className="text-xs text-slate-400">{Math.round(percentage)}% used</div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-3 gap-3 pt-2">
                      <div className="bg-slate-700/30 p-3 rounded-lg border border-slate-600/30">
                        <p className="text-xs text-slate-400 mb-1">Allocated</p>
                        <p className="text-lg font-bold text-white">{allocatedDays}</p>
                      </div>
                      <div className="bg-slate-700/30 p-3 rounded-lg border border-slate-600/30">
                        <p className="text-xs text-slate-400 mb-1">Used</p>
                        <p className="text-lg font-bold text-amber-400">{usedDays}</p>
                      </div>
                      <div className="bg-slate-700/30 p-3 rounded-lg border border-slate-600/30">
                        <p className="text-xs text-slate-400 mb-1">Remaining</p>
                        <p className="text-lg font-bold text-green-400">{remainingDays}</p>
                      </div>
                    </div>

                    {/* Action Button */}
                    <Button
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white border-0 mt-4 gap-2"
                      onClick={() => toast.info("Redirecting to leave request form...")}
                    >
                      <Plus className="w-4 h-4" />
                      Request Leave
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Leave Requests Summary */}
        {myRequests && myRequests.length > 0 && (
          <Card className="bg-slate-800/50 border-slate-700 mt-8">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-400" />
                Recent Leave Requests
              </CardTitle>
              <CardDescription className="text-slate-400">Your pending and recent leave requests</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {myRequests.slice(0, 5).map((request: any) => (
                  <div
                    key={request.id}
                    className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg border border-slate-600/30 hover:border-slate-500/50 transition"
                  >
                    <div className="flex-1">
                      <p className="text-white font-medium">
                        {request.leaveType?.charAt(0).toUpperCase() + request.leaveType?.slice(1)} Leave
                      </p>
                      <p className="text-sm text-slate-400">
                        {new Date(request.startDate).toLocaleDateString()} -{" "}
                        {new Date(request.endDate).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge
                      className={
                        request.status === "pending"
                          ? "bg-amber-600"
                          : request.status === "approved"
                            ? "bg-green-600"
                            : "bg-red-600"
                      }
                    >
                      {request.status?.charAt(0).toUpperCase() + request.status?.slice(1)}
                    </Badge>
                  </div>
                ))}
              </div>
              {myRequests.length > 5 && (
                <Button
                  variant="outline"
                  className="w-full mt-4 border-slate-600 text-slate-300 hover:bg-slate-700"
                  onClick={() => toast.info("View all requests")}
                >
                  View All Requests
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Tips Section */}
        <Card className="bg-slate-800/50 border-slate-700 mt-8">
          <CardHeader>
            <CardTitle className="text-white">Leave Balance Tips</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-300">
            <p>
              💡 <strong>Plan Ahead:</strong> Check your leave balance regularly and plan your time off accordingly.
            </p>
            <p>
              📋 <strong>Submit Requests Early:</strong> Submit leave requests at least 2 weeks in advance for better
              approval chances.
            </p>
            <p>
              ⏰ <strong>Year Reset:</strong> Your annual leave balance resets on January 1st each year. Unused days may
              not carry over.
            </p>
            <p>
              📧 <strong>Notifications:</strong> You'll receive email notifications when your leave requests are
              approved or declined.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
