import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Download, Printer, Search, MapPin, Clock, Users } from "lucide-react";
import { toast } from "sonner";

export function TimesheetViewTab() {
  const [startDate, setStartDate] = useState<string>(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch timesheet data
  const { data: timesheetData, isLoading, refetch } = trpc.timesheet.getComplete.useQuery(
    {
      startDate: new Date(startDate),
      endDate: new Date(endDate),
    },
    {
      refetchInterval: 5000, // Refresh every 5 seconds
    }
  );

  // Filter data based on search term
  const filteredData = (timesheetData || []).filter(
    (record) =>
      record.staffName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.staffNumber.toString().includes(searchTerm) ||
      record.staffEmail.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handlePrint = () => {
    window.print();
    toast.success("Print dialog opened");
  };

  const handleExportCSV = () => {
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
      "Check-in Location (Lat, Lng)",
      "Check-in Address",
      "Check-out Location (Lat, Lng)",
      "Check-out Address",
      "Work Modality",
      "Activity Category",
      "SDG Goal",
      "KPI",
      "AM Start Time",
      "AM End Time",
      "PM Start Time",
      "PM End Time",
      "Task Description",
      "Staff Remarks",
      "Program/Department",
      "Hours Worked",
      "Distance Traveled",
      "Submission Status",
      "Submitted At",
      "Evidence File",
    ];

    const rows = filteredData.map((record) => [
      record.staffNumber,
      record.staffName,
      record.staffEmail,
      record.date,
      record.checkInTime,
      record.checkOutTime,
      record.checkInCoordinates,
      record.checkInAddress,
      record.checkOutCoordinates,
      record.checkOutAddress,
      record.workModality,
      record.activityCategory,
      record.sdgGoal,
      record.kpi,
      record.amStartTime,
      record.amEndTime,
      record.pmStartTime,
      record.pmEndTime,
      record.taskDescription,
      record.staffRemarks,
      record.program,
      record.hoursWorked,
      record.distanceTraveled,
      record.isSubmitted ? "Submitted" : "Draft",
      record.submittedAt,
      record.evidenceUploadKey !== "N/A" ? "Uploaded" : "None",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row
          .map((cell) =>
            typeof cell === "string" && cell.includes(",")
              ? `"${cell.replace(/"/g, '""')}"`
              : cell
          )
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `timesheet-${new Date().toISOString().split("T")[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSV exported successfully");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">Complete Timesheet Records</h2>
          <p className="text-slate-400 text-sm mt-1">
            All staff submitted data with GPS coordinates and full details
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handlePrint}
            variant="outline"
            className="border-slate-600 text-white hover:bg-slate-700"
          >
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
          <Button
            onClick={handleExportCSV}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Total Records</p>
                <p className="text-2xl font-bold text-white">{filteredData?.length || 0}</p>
              </div>
              <Users className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Unique Staff</p>
                <p className="text-2xl font-bold text-white">
                  {new Set(filteredData?.map((r) => r.staffNumber)).size}
                </p>
              </div>
              <Users className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Total Hours</p>
                <p className="text-2xl font-bold text-white">
                  {(
                    filteredData?.reduce((sum, r) => sum + parseFloat(r.hoursWorked), 0) || 0
                  ).toFixed(2)}
                </p>
              </div>
              <Clock className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Data Table */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Timesheet Summary</CardTitle>
          <CardDescription className="text-slate-400">
            {isLoading ? "Loading..." : `Showing ${filteredData?.length || 0} records`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-slate-400">Loading timesheet data...</div>
          ) : filteredData && filteredData.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left py-3 px-4 text-slate-300 font-semibold">Staff</th>
                    <th className="text-left py-3 px-4 text-slate-300 font-semibold">Date</th>
                    <th className="text-left py-3 px-4 text-slate-300 font-semibold">Check-in</th>
                    <th className="text-left py-3 px-4 text-slate-300 font-semibold">Check-out</th>
                    <th className="text-left py-3 px-4 text-slate-300 font-semibold">Location</th>
                    <th className="text-left py-3 px-4 text-slate-300 font-semibold">Activity</th>
                    <th className="text-left py-3 px-4 text-slate-300 font-semibold">KPI</th>
                    <th className="text-left py-3 px-4 text-slate-300 font-semibold">Hours</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((record) => (
                    <tr key={record.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                      <td className="py-3 px-4">
                        <div>
                          <p className="text-white font-medium">{record.staffName}</p>
                          <p className="text-slate-400 text-xs">#{record.staffNumber}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-300">{record.date}</td>
                      <td className="py-3 px-4 text-slate-300">{record.checkInTime}</td>
                      <td className="py-3 px-4 text-slate-300">{record.checkOutTime}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-blue-400" />
                          <span className="text-slate-300 text-xs">{record.checkInCoordinates}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="outline" className="text-slate-300 border-slate-600">
                          {record.activityCategory || "N/A"}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-slate-300 text-xs">{record.kpi}</td>
                      <td className="py-3 px-4 text-slate-300 font-medium">{record.hoursWorked}h</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-slate-400">No timesheet records found</div>
          )}
        </CardContent>
      </Card>

      {/* Detailed View */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Detailed Records</CardTitle>
          <CardDescription className="text-slate-400">
            Full details of each timesheet submission
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {filteredData && filteredData.length > 0 ? (
              filteredData.map((record) => (
                <div
                  key={record.id}
                  className="bg-slate-700/30 border border-slate-600 rounded-lg p-6 space-y-4"
                >
                  {/* Header */}
                  <div className="flex justify-between items-start border-b border-slate-600 pb-4">
                    <div>
                      <h3 className="text-lg font-bold text-white">{record.staffName}</h3>
                      <p className="text-slate-400 text-sm">Staff #{record.staffNumber}</p>
                    </div>
                    <Badge className="bg-blue-600">{record.date}</Badge>
                  </div>

                  {/* Two Column Layout */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Left Column */}
                    <div className="space-y-4">
                      <div>
                        <label className="text-slate-400 text-sm">Email</label>
                        <p className="text-white">{record.staffEmail}</p>
                      </div>
                      <div>
                        <label className="text-slate-400 text-sm">Check-in Time</label>
                        <p className="text-white">{record.checkInTime}</p>
                      </div>
                      <div>
                        <label className="text-slate-400 text-sm">Check-out Time</label>
                        <p className="text-white">{record.checkOutTime}</p>
                      </div>
                      <div>
                        <label className="text-slate-400 text-sm">Hours Worked</label>
                        <p className="text-white font-bold">{record.hoursWorked} hours</p>
                      </div>
                      <div>
                        <label className="text-slate-400 text-sm">Work Modality</label>
                        <Badge variant="outline" className="text-slate-300 border-slate-600">
                          {record.workModality}
                        </Badge>
                      </div>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-4">
                      <div>
                        <label className="text-slate-400 text-sm">Check-in Location</label>
                        <div className="bg-slate-800 rounded p-2 text-slate-300 text-xs">
                          <p>Coordinates: {record.checkInCoordinates}</p>
                          <p>Address: {record.checkInAddress}</p>
                        </div>
                      </div>
                      <div>
                        <label className="text-slate-400 text-sm">Check-out Location</label>
                        <div className="bg-slate-800 rounded p-2 text-slate-300 text-xs">
                          <p>Coordinates: {record.checkOutCoordinates}</p>
                          <p>Address: {record.checkOutAddress}</p>
                        </div>
                      </div>
                      <div>
                        <label className="text-slate-400 text-sm">Distance Traveled</label>
                        <p className="text-white">{record.distanceTraveled}</p>
                      </div>
                    </div>
                  </div>

                  {/* Activity Details */}
                  <div className="border-t border-slate-600 pt-4 space-y-4">
                    <h4 className="text-white font-semibold">Activity Details</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-slate-400 text-sm">Activity Category</label>
                        <p className="text-white font-medium">{record.activityCategory}</p>
                        <p className="text-slate-500 text-xs">ID: {record.activityCategoryId}</p>
                      </div>
                      <div>
                        <label className="text-slate-400 text-sm">SDG Goal</label>
                        <p className="text-white font-medium">{record.sdgGoal}</p>
                        <p className="text-slate-500 text-xs">ID: {record.sdgGoalId}</p>
                      </div>
                      <div>
                        <label className="text-slate-400 text-sm">Linked Output / KPI</label>
                        <Badge className="bg-purple-600">{record.kpi}</Badge>
                      </div>
                    </div>
                    <div>
                      <label className="text-slate-400 text-sm">Task Description</label>
                      <p className="text-white text-sm bg-slate-800 rounded p-2">{record.taskDescription}</p>
                    </div>
                    <div>
                      <label className="text-slate-400 text-sm">Staff Remarks</label>
                      <p className="text-white text-sm bg-slate-800 rounded p-2">{record.staffRemarks}</p>
                    </div>
                  </div>

                  {/* Session Times */}
                  <div className="border-t border-slate-600 pt-4 space-y-4">
                    <h4 className="text-white font-semibold">Session Times</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-slate-400 text-sm">AM Start Time</label>
                        <p className="text-white">{record.amStartTime}</p>
                      </div>
                      <div>
                        <label className="text-slate-400 text-sm">AM End Time</label>
                        <p className="text-white">{record.amEndTime}</p>
                      </div>
                      <div>
                        <label className="text-slate-400 text-sm">PM Start Time</label>
                        <p className="text-white">{record.pmStartTime}</p>
                      </div>
                      <div>
                        <label className="text-slate-400 text-sm">PM End Time</label>
                        <p className="text-white">{record.pmEndTime}</p>
                      </div>
                    </div>
                  </div>

                  {/* Additional Information */}
                  <div className="border-t border-slate-600 pt-4 space-y-4">
                    <h4 className="text-white font-semibold">Additional Information</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-slate-400 text-sm">Program/Department</label>
                        <p className="text-white">{record.program}</p>
                      </div>
                      <div>
                        <label className="text-slate-400 text-sm">Submission Status</label>
                        <Badge className={record.isSubmitted ? "bg-green-600" : "bg-gray-600"}>
                          {record.isSubmitted ? "Submitted" : "Draft"}
                        </Badge>
                      </div>
                      <div>
                        <label className="text-slate-400 text-sm">Submitted At</label>
                        <p className="text-white text-sm">{record.submittedAt}</p>
                      </div>
                      <div>
                        <label className="text-slate-400 text-sm">Evidence File</label>
                        <p className="text-white text-sm">{record.evidenceUploadKey !== "N/A" ? "✓ Uploaded" : "No file"}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-slate-400">No detailed records to display</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
