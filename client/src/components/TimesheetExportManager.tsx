"use client";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Download, FileText, Calendar, Users } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

interface TimesheetExportManagerProps {
  staffList?: Array<{ id: number; name: string }>;
  onExport?: (data: {
    format: "pdf" | "csv" | "excel";
    staffId?: number;
    startDate: string;
    endDate: string;
  }) => Promise<{ success: boolean; url?: string }>;
}

export function TimesheetExportManager({
  staffList = [],
  onExport,
}: TimesheetExportManagerProps) {
  const [exportFormat, setExportFormat] = useState<"pdf" | "csv" | "excel">("pdf");
  const [staffSelection, setStaffSelection] = useState<"all" | "single">("all");
  const [selectedStaffId, setSelectedStaffId] = useState<string>("");
  const [startDate, setStartDate] = useState(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0]);
  const [isExporting, setIsExporting] = useState(false);

  // Use tRPC mutation for export if onExport not provided
  const exportMutation = trpc.export.timesheets.useMutation();

  const handleExport = async () => {
    if (!startDate || !endDate) {
      toast.error("Please select start and end dates");
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      toast.error("Start date must be before end date");
      return;
    }

    if (staffSelection === "single" && !selectedStaffId) {
      toast.error("Please select a staff member");
      return;
    }

    setIsExporting(true);
    try {
      // Use provided onExport callback or tRPC mutation
      let result;
      if (onExport) {
        result = await onExport({
          format: exportFormat,
          staffId: staffSelection === "single" ? parseInt(selectedStaffId) : undefined,
          startDate,
          endDate,
        });
      } else {
        result = await exportMutation.mutateAsync({
          format: exportFormat,
          staffId: staffSelection === "single" ? parseInt(selectedStaffId) : undefined,
          startDate,
          endDate,
        });
      }

      if (result?.success) {
        toast.success(`Timesheet exported as ${exportFormat.toUpperCase()}`);
        
        // Handle different response types
        if ('url' in result && result.url) {
          const link = document.createElement("a");
          link.href = result.url;
          link.download = `timesheet_${new Date().getTime()}.${getFileExtension(exportFormat)}`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        } else if ('content' in result && result.content) {
          const isPdf = exportFormat === "pdf";
          const payload = isPdf
            ? Uint8Array.from(atob(result.content), (character) => character.charCodeAt(0))
            : result.content;
          const blob = new Blob([payload], { type: isPdf ? 'application/pdf' : exportFormat === 'excel' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'text/csv' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = `${result.filename}`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        }
      } else {
        toast.error("Failed to export timesheet");
      }
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Error exporting timesheet");
    } finally {
      setIsExporting(false);
    }
  };

  const getFileExtension = (format: string): string => {
    switch (format) {
      case "pdf":
        return "pdf";
      case "csv":
        return "csv";
      case "excel":
        return "xlsx";
      default:
        return "txt";
    }
  };

  const getFormatDescription = (format: string): string => {
    switch (format) {
      case "pdf":
        return "Professional PDF report with formatting";
      case "csv":
        return "Comma-separated values for spreadsheets";
      case "excel":
        return "Microsoft Excel format with formulas";
      default:
        return "";
    }
  };

  return (
    <div className="space-y-6">
      {/* Export Format Selection */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-400" />
            Export Format
          </CardTitle>
          <CardDescription className="text-slate-400">Choose your preferred export format</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {(["pdf", "csv", "excel"] as const).map((format) => (
              <button
                key={format}
                onClick={() => setExportFormat(format)}
                className={`p-4 rounded-lg border-2 transition-all text-left ${
                  exportFormat === format
                    ? "bg-blue-900/30 border-blue-500"
                    : "bg-slate-700/30 border-slate-600 hover:border-slate-500"
                }`}
              >
                <p className="font-semibold text-white capitalize">{format}</p>
                <p className="text-xs text-slate-400 mt-1">{getFormatDescription(format)}</p>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Staff Selection */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-green-400" />
            Staff Selection
          </CardTitle>
          <CardDescription className="text-slate-400">Choose which staff to include</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <button
              onClick={() => setStaffSelection("all")}
              className={`flex-1 px-4 py-2 rounded-lg border-2 transition-all font-medium ${
                staffSelection === "all"
                  ? "bg-green-900/30 border-green-500 text-green-300"
                  : "bg-slate-700/30 border-slate-600 text-slate-300 hover:border-slate-500"
              }`}
            >
              All Staff
            </button>
            <button
              onClick={() => setStaffSelection("single")}
              className={`flex-1 px-4 py-2 rounded-lg border-2 transition-all font-medium ${
                staffSelection === "single"
                  ? "bg-green-900/30 border-green-500 text-green-300"
                  : "bg-slate-700/30 border-slate-600 text-slate-300 hover:border-slate-500"
              }`}
            >
              Single Staff
            </button>
          </div>

          {staffSelection === "single" && (
            <Select value={selectedStaffId} onValueChange={setSelectedStaffId}>
              <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white">
                <SelectValue placeholder="Select a staff member" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                {staffList.map((staff) => (
                  <SelectItem key={staff.id} value={staff.id.toString()} className="text-white">
                    {staff.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </CardContent>
      </Card>

      {/* Date Range Selection */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-purple-400" />
            Date Range
          </CardTitle>
          <CardDescription className="text-slate-400">Select the period to export</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-300 block mb-2">Start Date</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-slate-700/50 border-slate-600 text-white"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-300 block mb-2">End Date</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-slate-700/50 border-slate-600 text-white"
              />
            </div>
          </div>

          {/* Quick Date Range Buttons */}
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const today = new Date();
                const lastMonth = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
                setStartDate(lastMonth.toISOString().split("T")[0]);
                setEndDate(today.toISOString().split("T")[0]);
              }}
              className="text-xs"
            >
              Last 30 Days
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const today = new Date();
                const lastQuarter = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000);
                setStartDate(lastQuarter.toISOString().split("T")[0]);
                setEndDate(today.toISOString().split("T")[0]);
              }}
              className="text-xs"
            >
              Last 90 Days
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const today = new Date();
                const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
                setStartDate(startOfMonth.toISOString().split("T")[0]);
                setEndDate(today.toISOString().split("T")[0]);
              }}
              className="text-xs"
            >
              This Month
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Export Summary & Button */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="bg-slate-700/30 rounded-lg p-4 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Format:</span>
                <Badge className="bg-blue-600">{exportFormat.toUpperCase()}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Staff:</span>
                <Badge className="bg-green-600">
                  {staffSelection === "all"
                    ? "All Staff"
                    : staffList.find((s) => s.id.toString() === selectedStaffId)?.name || "Select staff"}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Period:</span>
                <Badge className="bg-purple-600">
                  {startDate} to {endDate}
                </Badge>
              </div>
            </div>

            <Button
              onClick={handleExport}
              disabled={isExporting}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2"
            >
              <Download className="w-4 h-4 mr-2" />
              {isExporting ? "Exporting..." : `Export as ${exportFormat.toUpperCase()}`}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Format Information */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white text-sm">Export Information</CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-slate-400 space-y-2">
          <p>
            <strong>PDF:</strong> Professional formatted report with headers, footers, and page breaks. Best for printing and sharing.
          </p>
          <p>
            <strong>CSV:</strong> Plain text format compatible with all spreadsheet applications. Easy to import into other systems.
          </p>
          <p>
            <strong>Excel:</strong> Native Excel format with formulas, formatting, and multiple sheets for detailed analysis.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
