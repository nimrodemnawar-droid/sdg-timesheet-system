import { useState } from "react";
import React from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Download, Search } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

interface TimesheetRecord {
  id: string;
  staffNumber: string;
  staffName: string;
  email: string;
  date: string;
  checkInTime: string;
  checkOutTime: string;
  checkInLat: number;
  checkInLng: number;
  checkInAddress: string;
  checkOutLat?: number;
  checkOutLng?: number;
  checkOutAddress?: string;
  workModality: string;
  activityCategory: string;
  kpi: string;
  taskDescription: string;
  staffRemarks: string;
  hoursWorked: number;
  distanceTraveled: number;
  submissionStatus: string;
  submittedAt: string;
  evidenceFile: string;
}

export function TimesheetDetailedView() {
  const [startDate, setStartDate] = useState<string>(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch timesheet data
  const { data: timesheetData, isLoading } = trpc.timesheet.getComplete.useQuery(
    {
      startDate: startDate,
      endDate: endDate,
    },
    {
      refetchInterval: 5000,
    }
  );

  // Filter data based on search term
  const filteredData = (timesheetData || []).filter(
    (record: any) =>
      record.staffName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.staffNumber.toString().includes(searchTerm) ||
      record.staffEmail.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Sort by date (newest first)
  const sortedData = [...(filteredData || [])].sort((a: any, b: any) => {
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  const handleExportExcel = () => {
    if (!filteredData || filteredData.length === 0) {
      toast.error("No data to export");
      return;
    }

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
      "Task Description",
      "Staff Remarks",
      "Hours Worked",
      "Distance Traveled",
      "Submission Status",
      "Submitted At",
      "Evidence File",
    ];

    // Build rows with date separators
    const rows: any[] = [];
    let currentDate = "";
    
    sortedData.forEach((record: any) => {
      const recordDate = new Date(record.date).toDateString();
      
      // Add date separator row if date changed
      if (recordDate !== currentDate) {
        currentDate = recordDate;
        const dateStr = new Date(record.date).toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        });
        rows.push([`📅 ${dateStr}`, "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""]);
      }
      
      // Add data row
      rows.push([
        record.staffNumber || "N/A",
        record.staffName || "N/A",
        record.staffEmail || "N/A",
        new Date(record.date).toLocaleDateString("en-US"),
        record.checkInTime || "N/A",
        record.checkOutTime || "N/A",
        record.checkInAddress || "N/A",
        record.checkOutAddress || "N/A",
        record.workModality || "N/A",
        record.activityCategory || "N/A",
        record.kpi || "N/A",
        record.taskDescription || "N/A",
        record.staffRemarks || "N/A",
        record.hoursWorked || "0",
        record.distanceTraveled || "0",
        record.isSubmitted ? "Submitted" : "Draft",
        record.submittedAt || "N/A",
        record.evidenceUploadKey !== "N/A" ? "Uploaded" : "None",
      ]);
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

    // Set column widths
    const colWidths = [12, 15, 20, 12, 12, 12, 25, 20, 25, 20, 12, 15, 12, 20, 15, 12, 15, 15, 15, 12];
    ws["!cols"] = colWidths.map((w) => ({ wch: w }));

    XLSX.utils.book_append_sheet(wb, ws, "Timesheet");
    XLSX.writeFile(wb, `timesheet-${new Date().toISOString().split("T")[0]}.xlsx`);
    toast.success("Excel file exported successfully");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">Detailed Timesheet Records</h2>
          <p className="text-slate-400 text-sm mt-1">
            Complete staff timesheet with all 20 columns - each day displayed separately
          </p>
        </div>
        <Button
          onClick={handleExportExcel}
          className="bg-green-600 hover:bg-green-700 text-white"
        >
          <Download className="w-4 h-4 mr-2" />
          Export to Excel
        </Button>
      </div>

      {/* Filters */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm text-slate-300 block mb-2">Start Date</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-slate-700/50 border-slate-600 text-white"
              />
            </div>
            <div>
              <label className="text-sm text-slate-300 block mb-2">End Date</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-slate-700/50 border-slate-600 text-white"
              />
            </div>
            <div>
              <label className="text-sm text-slate-300 block mb-2">Search Staff</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Name, Number, or Email"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-slate-700/50 border-slate-600 text-white pl-10"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="pt-6">
            <div>
              <p className="text-slate-400 text-sm">Total Records</p>
              <p className="text-3xl font-bold text-white">{filteredData?.length || 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="pt-6">
            <div>
              <p className="text-slate-400 text-sm">Total Hours Worked</p>
              <p className="text-3xl font-bold text-white">
                {(
                  filteredData?.reduce((sum: number, r: any) => sum + parseFloat(r.hoursWorked || 0), 0) || 0
                ).toFixed(2)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Data Table */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Complete Timesheet Data</CardTitle>
          <CardDescription className="text-slate-400">
            {isLoading ? "Loading..." : `Showing ${filteredData?.length || 0} records`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-slate-400">Loading timesheet data...</div>
          ) : filteredData && filteredData.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-700/50 border-b-2 border-slate-600 sticky top-0">
                    <th className="text-left py-3 px-2 text-slate-200 font-bold">Staff #</th>
                    <th className="text-left py-3 px-2 text-slate-200 font-bold">Staff Name</th>
                    <th className="text-left py-3 px-2 text-slate-200 font-bold">Email</th>
                    <th className="text-left py-3 px-2 text-slate-200 font-bold">Date</th>
                    <th className="text-left py-3 px-2 text-slate-200 font-bold">Check-in Time</th>
                    <th className="text-left py-3 px-2 text-slate-200 font-bold">Check-out Time</th>
                    <th className="text-left py-3 px-2 text-slate-200 font-bold">Check-in Location</th>
                    <th className="text-left py-3 px-2 text-slate-200 font-bold">Check-out Location</th>
                    <th className="text-left py-3 px-2 text-slate-200 font-bold">Work Modality</th>
                    <th className="text-left py-3 px-2 text-slate-200 font-bold">Activity Category</th>
                    <th className="text-left py-3 px-2 text-slate-200 font-bold">KPI</th>
                    <th className="text-left py-3 px-2 text-slate-200 font-bold">Task Description</th>
                    <th className="text-left py-3 px-2 text-slate-200 font-bold">Staff Remarks</th>
                    <th className="text-left py-3 px-2 text-slate-200 font-bold">Hours Worked</th>
                    <th className="text-left py-3 px-2 text-slate-200 font-bold">Distance Traveled</th>
                    <th className="text-left py-3 px-2 text-slate-200 font-bold">Status</th>
                    <th className="text-left py-3 px-2 text-slate-200 font-bold">Submitted At</th>
                    <th className="text-left py-3 px-2 text-slate-200 font-bold">Evidence</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedData.map((record: any, idx: number) => {
                    // Check if this is a new date
                    const prevRecord = idx > 0 ? sortedData[idx - 1] : null;
                    const isNewDate = !prevRecord || new Date(record.date).toDateString() !== new Date(prevRecord.date).toDateString();
                    
                    return (
                      <React.Fragment key={`row-${record.id}-${idx}`}>
                        {isNewDate && idx > 0 && (
                          <tr key={`date-separator-${new Date(record.date).toDateString()}`} className="bg-slate-600/30 border-b-2 border-slate-500">
                            <td colSpan={18} className="py-3 px-4 text-slate-300 font-semibold text-center">
                              📅 {new Date(record.date).toLocaleDateString("en-US", {
                                weekday: "long",
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              })}
                            </td>
                          </tr>
                        )}
                        {isNewDate && idx === 0 && (
                          <tr key={`date-separator-first-${new Date(record.date).toDateString()}`} className="bg-slate-600/30 border-b-2 border-slate-500">
                            <td colSpan={18} className="py-3 px-4 text-slate-300 font-semibold text-center">
                              📅 {new Date(record.date).toLocaleDateString("en-US", {
                                weekday: "long",
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              })}
                            </td>
                          </tr>
                        )}
                        <tr
                          key={`${record.id}-${idx}`}
                          className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors"
                        >
                      <td className="py-2 px-2 text-slate-300 font-medium">{record.staffNumber}</td>
                      <td className="py-2 px-2 text-slate-300">{record.staffName}</td>
                      <td className="py-2 px-2 text-slate-400 text-xs">{record.staffEmail}</td>
                      <td className="py-2 px-2 text-white font-semibold bg-slate-700/20">
                        {new Date(record.date).toLocaleDateString("en-US", {
                          weekday: "short",
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </td>
                      <td className="py-2 px-2 text-slate-300">{record.checkInTime || "N/A"}</td>
                      <td className="py-2 px-2 text-slate-300">{record.checkOutTime || "N/A"}</td>
                          <td className="py-2 px-2 text-slate-300 text-xs font-medium max-w-xs">
                            {record.checkInAddress ? (
                              <div className="break-words">
                                {record.checkInAddress}
                              </div>
                            ) : (
                              "N/A"
                            )}
                          </td>
                          <td className="py-2 px-2 text-slate-300 text-xs font-medium max-w-xs">
                            {record.checkOutAddress ? (
                              <div className="break-words">
                                {record.checkOutAddress}
                              </div>
                            ) : (
                              "N/A"
                            )}
                          </td>
                      <td className="py-2 px-2">
                        <Badge variant="outline" className="text-xs">
                          {record.workModality || "N/A"}
                        </Badge>
                      </td>
                      <td className="py-2 px-2 text-slate-300 text-xs">{record.activityCategory || "N/A"}</td>
                      <td className="py-2 px-2 text-slate-300 text-xs">{record.kpi || "N/A"}</td>
                      <td className="py-2 px-2 text-slate-300 text-xs max-w-xs truncate">
                        {record.taskDescription || "N/A"}
                      </td>
                      <td className="py-2 px-2 text-slate-300 text-xs max-w-xs truncate">
                        {record.staffRemarks || "N/A"}
                      </td>
                      <td className="py-2 px-2 text-slate-300 font-medium">{record.hoursWorked || "0"}h</td>
                      <td className="py-2 px-2 text-slate-300">{record.distanceTraveled || "0"}m</td>
                      <td className="py-2 px-2">
                        <Badge
                          variant={record.isSubmitted ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {record.isSubmitted ? "Submitted" : "Draft"}
                        </Badge>
                      </td>
                      <td className="py-2 px-2 text-slate-400 text-xs">{record.submittedAt || "N/A"}</td>
                      <td className="py-2 px-2 text-xs">
                        {record.evidenceUploadKey !== "N/A" ? (
                          <Badge variant="outline" className="text-green-400 border-green-400">
                            ✓ Uploaded
                          </Badge>
                        ) : (
                          <span className="text-slate-500">None</span>
                        )}
                      </td>
                        </tr>
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-slate-400">No timesheet records found for the selected period</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
