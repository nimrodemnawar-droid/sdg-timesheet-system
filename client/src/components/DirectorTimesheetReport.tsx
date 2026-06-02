import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, FileText, Filter } from "lucide-react";
import { trpc } from "@/lib/trpc";

interface TimesheetRecord {
  staffNumber: string;
  staffName: string;
  email: string;
  date: string;
  checkInTime: string;
  checkOutTime: string;
  checkInAddress: string;
  checkOutAddress: string;
  workModality: string;
  activityCategory: string;
  kpi: string;
  amStartTime: string;
  pmEndTime: string;
  taskDescription: string;
  staffRemarks: string;
  hoursWorked: number;
  overtimeHours: number;
  distanceTraveled: number;
  submissionStatus: string;
  submittedAt: string;
  evidenceFile: string;
}

export default function DirectorTimesheetReport() {
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [staffFilter, setStaffFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: timesheets, isLoading } = trpc.attendance.getByDateRange.useQuery(
    {
      startDate: dateFrom ? new Date(dateFrom).toISOString() : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: dateTo ? new Date(dateTo).toISOString() : new Date().toISOString(),
    },
    { enabled: !!dateFrom || !!dateTo }
  );

  const handleExportCSV = () => {
    if (!timesheets) return;

    const headers = [
      "Staff Number",
      "Staff Name",
      "Email",
      "Date",
      "Check-in Time",
      "Check-out Time",
      "Check-in Location",
      "Check-out Location",
      "Work Modality",
      "Activity Category",
      "KPI",
      "AM Start Time",
      "PM End Time",
      "Task Description",
      "Staff Remarks",
      "Hours Worked",
      "Overtime Hours",
      "Distance Traveled (km)",
      "Submission Status",
      "Submitted At",
      "Evidence File",
    ];

    const rows = timesheets.map((record: any) => [
      record.staffNumber || "N/A",
      record.staffName || "N/A",
      record.email || "N/A",
      new Date(record.checkInTime).toLocaleDateString(),
      new Date(record.checkInTime).toLocaleTimeString(),
      record.checkOutTime ? new Date(record.checkOutTime).toLocaleTimeString() : "N/A",
      record.checkInAddress || `${record.checkInLat}, ${record.checkInLng}`,
      record.checkOutAddress || (record.checkOutLat ? `${record.checkOutLat}, ${record.checkOutLng}` : "N/A"),
      record.workModality || "N/A",
      record.activityCategory || "N/A",
      record.kpiDescription || "N/A",
      record.amStartTime || "N/A",
      record.pmEndTime || "N/A",
      record.taskDescription || "N/A",
      record.staffRemarks || "N/A",
      record.durationMinutes ? (record.durationMinutes / 60).toFixed(2) : "0",
      record.overtimeMinutes ? (record.overtimeMinutes / 60).toFixed(2) : "0",
      record.distanceTraveled ? record.distanceTraveled.toFixed(2) : "0",
      record.submissionStatus || "pending",
      record.submittedAt ? new Date(record.submittedAt).toLocaleString() : "N/A",
      record.evidenceFileUrl ? "Yes" : "No",
    ]);

    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `timesheet-report-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const handleExportPDF = () => {
    // PDF export would require a library like jsPDF or similar
    // For now, show a message
    alert("PDF export coming soon. Please use CSV export for now.");
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Director Timesheet Report</CardTitle>
          <CardDescription>Complete timesheet data with all 19 fields for executive review</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium">From Date</label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">To Date</label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="submitted">Submitted</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-2">
              <Button onClick={handleExportCSV} className="w-full">
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>

          {/* Summary Statistics */}
          {timesheets && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Total Records</p>
                <p className="text-2xl font-bold text-blue-600">{timesheets.length}</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Submitted</p>
                <p className="text-2xl font-bold text-green-600">
                  {timesheets.filter((r: any) => r.submissionStatus === "submitted").length}
                </p>
              </div>
              <div className="bg-yellow-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Approved</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {timesheets.filter((r: any) => r.submissionStatus === "approved").length}
                </p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Total Hours</p>
                <p className="text-2xl font-bold text-purple-600">
                  {(timesheets.reduce((sum: number, r: any) => sum + (r.durationMinutes || 0), 0) / 60).toFixed(1)}
                </p>
              </div>
            </div>
          )}

          {/* Table */}
          <div className="mt-6 overflow-x-auto">
            {isLoading ? (
              <p className="text-center py-8">Loading timesheet data...</p>
            ) : timesheets && timesheets.length > 0 ? (
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-100 border-b-2 border-gray-300">
                    <th className="p-2 text-left font-semibold">Staff #</th>
                    <th className="p-2 text-left font-semibold">Name</th>
                    <th className="p-2 text-left font-semibold">Date</th>
                    <th className="p-2 text-left font-semibold">Check-in</th>
                    <th className="p-2 text-left font-semibold">Check-out</th>
                    <th className="p-2 text-left font-semibold">Location</th>
                    <th className="p-2 text-left font-semibold">Hours</th>
                    <th className="p-2 text-left font-semibold">OT Hours</th>
                    <th className="p-2 text-left font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {timesheets.map((record: any, idx: number) => (
                    <tr key={idx} className="border-b hover:bg-gray-50">
                      <td className="p-2">{record.staffNumber || "N/A"}</td>
                      <td className="p-2">{record.staffName || "N/A"}</td>
                      <td className="p-2">{new Date(record.checkInTime).toLocaleDateString()}</td>
                      <td className="p-2">{new Date(record.checkInTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</td>
                      <td className="p-2">
                        {record.checkOutTime ? new Date(record.checkOutTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
                      </td>
                      <td className="p-2 text-xs">
                        {record.checkInAddress || `${record.checkInLat?.toFixed(4)}, ${record.checkInLng?.toFixed(4)}`}
                      </td>
                      <td className="p-2 font-semibold">{(record.durationMinutes / 60).toFixed(2)}</td>
                      <td className="p-2 font-semibold text-orange-600">{(record.overtimeMinutes / 60).toFixed(2)}</td>
                      <td className="p-2">
                        <span
                          className={`px-2 py-1 rounded text-xs font-semibold ${
                            record.submissionStatus === "approved"
                              ? "bg-green-100 text-green-700"
                              : record.submissionStatus === "submitted"
                              ? "bg-blue-100 text-blue-700"
                              : record.submissionStatus === "rejected"
                              ? "bg-red-100 text-red-700"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {record.submissionStatus || "Pending"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-center py-8 text-gray-500">No timesheet data available for the selected date range</p>
            )}
          </div>

          {/* Export Buttons */}
          <div className="flex gap-2 mt-6">
            <Button onClick={handleExportCSV} variant="outline" className="flex-1">
              <FileText className="w-4 h-4 mr-2" />
              Export as CSV
            </Button>
            <Button onClick={handleExportPDF} variant="outline" className="flex-1">
              <FileText className="w-4 h-4 mr-2" />
              Export as PDF
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Data Field Legend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Data Fields Included (19 Total)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-semibold mb-2">Personal Information</h4>
              <ul className="space-y-1 text-gray-700">
                <li>✓ Staff Number</li>
                <li>✓ Staff Name</li>
                <li>✓ Email</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Attendance Data</h4>
              <ul className="space-y-1 text-gray-700">
                <li>✓ Date</li>
                <li>✓ Check-in Time</li>
                <li>✓ Check-out Time</li>
                <li>✓ Hours Worked</li>
                <li>✓ Overtime Hours</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Location Data</h4>
              <ul className="space-y-1 text-gray-700">
                <li>✓ Check-in Address (with coordinates)</li>
                <li>✓ Check-out Address (with coordinates)</li>
                <li>✓ Distance Traveled</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Work Details</h4>
              <ul className="space-y-1 text-gray-700">
                <li>✓ Work Modality</li>
                <li>✓ Activity Category</li>
                <li>✓ Task Description</li>
                <li>✓ KPI / Linked Output</li>
                <li>✓ Staff Remarks</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Optional Fields</h4>
              <ul className="space-y-1 text-gray-700">
                <li>✓ AM Start Time</li>
                <li>✓ PM End Time</li>
                <li>✓ Evidence File</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Submission Tracking</h4>
              <ul className="space-y-1 text-gray-700">
                <li>✓ Submission Status</li>
                <li>✓ Submitted At</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
