import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle, XCircle, DollarSign } from "lucide-react";
import { toast } from "sonner";

interface OvertimeRecord {
  attendanceId: number;
  staffId: number;
  staffName: string;
  overtimeHours: number;
  checkInTime: Date;
  checkOutTime: Date;
  overtimeDate: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  approvalNotes?: string;
  payoutMultiplier?: number;
  payoutAmount?: number;
}

interface OvertimeApprovalManagerProps {
  records: OvertimeRecord[];
  onApprove: (data: {
    attendanceId: number;
    staffId: number;
    staffName: string;
    overtimeHours: number;
    approvalNotes?: string;
    payoutMultiplier?: number;
    hourlyRate?: number;
  }) => Promise<{ success: boolean; payoutAmount?: number }>;
  onReject: (data: {
    attendanceId: number;
    staffId: number;
    staffName: string;
    overtimeHours: number;
    rejectionReason: string;
  }) => Promise<{ success: boolean }>;
  isLoading?: boolean;
}

export function OvertimeApprovalManager({
  records,
  onApprove,
  onReject,
  isLoading = false,
}: OvertimeApprovalManagerProps) {
  const [selectedRecord, setSelectedRecord] = useState<OvertimeRecord | null>(null);
  const [approvalNotes, setApprovalNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [payoutMultiplier, setPayoutMultiplier] = useState("1.50");
  const [hourlyRate, setHourlyRate] = useState("0");
  const [isProcessing, setIsProcessing] = useState(false);

  const pendingRecords = records.filter((r) => r.status === "PENDING");

  const handleApprove = async () => {
    if (!selectedRecord) return;

    setIsProcessing(true);
    try {
      const result = await onApprove({
        attendanceId: selectedRecord.attendanceId,
        staffId: selectedRecord.staffId,
        staffName: selectedRecord.staffName,
        overtimeHours: selectedRecord.overtimeHours,
        approvalNotes,
        payoutMultiplier: parseFloat(payoutMultiplier),
        hourlyRate: parseFloat(hourlyRate),
      });

      if (result.success) {
        toast.success(
          `Overtime approved for ${selectedRecord.staffName}. Payout: $${result.payoutAmount}`
        );
        setSelectedRecord(null);
        setApprovalNotes("");
        setPayoutMultiplier("1.50");
        setHourlyRate("0");
      }
    } catch (error) {
      toast.error("Failed to approve overtime");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRecord || !rejectionReason.trim()) {
      toast.error("Please provide a rejection reason");
      return;
    }

    setIsProcessing(true);
    try {
      const result = await onReject({
        attendanceId: selectedRecord.attendanceId,
        staffId: selectedRecord.staffId,
        staffName: selectedRecord.staffName,
        overtimeHours: selectedRecord.overtimeHours,
        rejectionReason,
      });

      if (result.success) {
        toast.success(`Overtime rejected for ${selectedRecord.staffName}`);
        setSelectedRecord(null);
        setRejectionReason("");
      }
    } catch (error) {
      toast.error("Failed to reject overtime");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Pending Reviews</p>
                <p className="text-3xl font-bold text-yellow-400">{pendingRecords.length}</p>
              </div>
              <Clock className="w-12 h-12 text-yellow-400 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Total Pending Hours</p>
                <p className="text-3xl font-bold text-blue-400">
                  {pendingRecords.reduce((sum, r) => sum + r.overtimeHours, 0).toFixed(1)}h
                </p>
              </div>
              <Clock className="w-12 h-12 text-blue-400 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Est. Payout (1.5x)</p>
                <p className="text-3xl font-bold text-green-400">
                  $
                  {(
                    pendingRecords.reduce((sum, r) => sum + r.overtimeHours, 0) *
                    1.5 *
                    (parseFloat(hourlyRate) || 20)
                  ).toFixed(2)}
                </p>
              </div>
              <DollarSign className="w-12 h-12 text-green-400 opacity-20" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pending Records List */}
        <div className="lg:col-span-1">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Pending Overtime</CardTitle>
              <CardDescription className="text-slate-400">
                {pendingRecords.length} records awaiting approval
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 max-h-96 overflow-y-auto">
              {pendingRecords.length === 0 ? (
                <p className="text-slate-400 text-sm">No pending overtime records</p>
              ) : (
                pendingRecords.map((record) => (
                  <button
                    key={record.attendanceId}
                    onClick={() => setSelectedRecord(record)}
                    className={`w-full text-left p-3 rounded-lg border transition-all ${
                      selectedRecord?.attendanceId === record.attendanceId
                        ? "bg-blue-900/30 border-blue-500"
                        : "bg-slate-700/30 border-slate-600 hover:border-slate-500"
                    }`}
                  >
                    <p className="font-medium text-white text-sm">{record.staffName}</p>
                    <p className="text-xs text-slate-400">{record.overtimeDate}</p>
                    <p className="text-xs text-yellow-400 font-semibold">{record.overtimeHours}h overtime</p>
                  </button>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Approval Form */}
        <div className="lg:col-span-2">
          {selectedRecord ? (
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Review Overtime Request</CardTitle>
                <CardDescription className="text-slate-400">
                  {selectedRecord.staffName} - {selectedRecord.overtimeDate}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Record Details */}
                <div className="bg-slate-700/30 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Overtime Hours:</span>
                    <span className="text-white font-semibold">{selectedRecord.overtimeHours}h</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Check-in:</span>
                    <span className="text-white text-sm">
                      {new Date(selectedRecord.checkInTime).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Check-out:</span>
                    <span className="text-white text-sm">
                      {new Date(selectedRecord.checkOutTime).toLocaleTimeString()}
                    </span>
                  </div>
                </div>

                {/* Approval Fields */}
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-slate-300">Hourly Rate ($)</label>
                    <Input
                      type="number"
                      value={hourlyRate}
                      onChange={(e) => setHourlyRate(e.target.value)}
                      placeholder="20.00"
                      className="bg-slate-700/50 border-slate-600 text-white mt-1"
                      step="0.01"
                      min="0"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-slate-300">Payout Multiplier</label>
                    <Select value={payoutMultiplier} onValueChange={setPayoutMultiplier}>
                      <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        <SelectItem value="1.50" className="text-white">
                          1.5x (Regular Overtime)
                        </SelectItem>
                        <SelectItem value="2.00" className="text-white">
                          2.0x (Holiday/Weekend)
                        </SelectItem>
                        <SelectItem value="2.50" className="text-white">
                          2.5x (Special)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-slate-300">Approval Notes</label>
                    <Textarea
                      value={approvalNotes}
                      onChange={(e) => setApprovalNotes(e.target.value)}
                      placeholder="Add any notes for approval..."
                      className="bg-slate-700/50 border-slate-600 text-white mt-1 min-h-20"
                    />
                  </div>

                  {/* Calculated Payout */}
                  <div className="bg-green-900/20 border border-green-500/50 rounded-lg p-3">
                    <p className="text-sm text-slate-400">Estimated Payout:</p>
                    <p className="text-2xl font-bold text-green-400">
                      $
                      {(
                        selectedRecord.overtimeHours *
                        parseFloat(payoutMultiplier) *
                        (parseFloat(hourlyRate) || 0)
                      ).toFixed(2)}
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <Button
                    onClick={handleApprove}
                    disabled={isProcessing || !hourlyRate}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Approve
                  </Button>
                  <Button
                    onClick={() => setSelectedRecord(null)}
                    variant="outline"
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>

                {/* Rejection Section */}
                <div className="border-t border-slate-600 pt-4">
                  <label className="text-sm font-medium text-slate-300">Rejection Reason (if rejecting)</label>
                  <Textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Explain why this overtime is being rejected..."
                    className="bg-slate-700/50 border-slate-600 text-white mt-2 min-h-20"
                  />
                  <Button
                    onClick={handleReject}
                    disabled={isProcessing || !rejectionReason.trim()}
                    className="w-full mt-3 bg-red-600 hover:bg-red-700 text-white"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Reject Overtime
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <Clock className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-400">Select a pending overtime record to review</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
