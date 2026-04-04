import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Download, Calendar, BarChart3, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface WeeklyMetric {
  week: string;
  startDate: Date;
  endDate: Date;
  totalHours: number;
  totalOvertimeHours: number;
  averageHoursPerDay: number;
  daysWorked: number;
  checkInsCount: number;
  leaveHours: number;
}

interface WeeklyMetricsExportProps {
  metrics: WeeklyMetric[];
  staffName?: string;
  isLoading?: boolean;
}

export function WeeklyMetricsExport({
  metrics,
  staffName = "Staff",
  isLoading = false,
}: WeeklyMetricsExportProps) {
  const [exporting, setExporting] = useState(false);

  const generateCSV = () => {
    if (metrics.length === 0) {
      toast.error("No metrics to export");
      return;
    }

    setExporting(true);

    try {
      // CSV Header
      const headers = [
        "Week",
        "Start Date",
        "End Date",
        "Total Hours",
        "Overtime Hours",
        "Avg Hours/Day",
        "Days Worked",
        "Check-ins",
        "Leave Hours",
      ];

      // CSV Rows
      const rows = metrics.map((metric) => [
        metric.week,
        metric.startDate.toLocaleDateString(),
        metric.endDate.toLocaleDateString(),
        metric.totalHours.toFixed(2),
        metric.totalOvertimeHours.toFixed(2),
        metric.averageHoursPerDay.toFixed(2),
        metric.daysWorked,
        metric.checkInsCount,
        metric.leaveHours.toFixed(2),
      ]);

      // Summary row
      const totalHours = metrics.reduce((sum, m) => sum + m.totalHours, 0);
      const totalOvertimeHours = metrics.reduce((sum, m) => sum + m.totalOvertimeHours, 0);
      const totalLeaveHours = metrics.reduce((sum, m) => sum + m.leaveHours, 0);
      const totalDaysWorked = metrics.reduce((sum, m) => sum + m.daysWorked, 0);

      rows.push([
        "TOTAL",
        "",
        "",
        totalHours.toFixed(2),
        totalOvertimeHours.toFixed(2),
        (totalHours / totalDaysWorked).toFixed(2),
        totalDaysWorked,
        "",
        totalLeaveHours.toFixed(2),
      ]);

      // Create CSV content
      const csvContent = [
        `Weekly Metrics Report - ${staffName}`,
        `Generated: ${new Date().toLocaleString()}`,
        "",
        headers.join(","),
        ...rows.map((row) => row.join(",")),
      ].join("\n");

      // Download CSV
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);

      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `weekly-metrics-${staffName.replace(/\s+/g, "-")}-${new Date().toISOString().split("T")[0]}.csv`
      );
      link.style.visibility = "hidden";

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success("Weekly metrics exported successfully!");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export metrics");
    } finally {
      setExporting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          Weekly Metrics
        </CardTitle>
        <CardDescription>
          View and export weekly work metrics and statistics
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Export Button */}
        <Button
          onClick={generateCSV}
          disabled={metrics.length === 0 || exporting || isLoading}
          className="w-full"
          size="lg"
        >
          {exporting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Exporting...
            </>
          ) : (
            <>
              <Download className="w-4 h-4 mr-2" />
              Export as CSV
            </>
          )}
        </Button>

        {/* Metrics Summary */}
        {metrics.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900">Summary</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-xs text-gray-600">Total Weeks</p>
                <p className="text-2xl font-bold text-blue-600">{metrics.length}</p>
              </div>
              <div className="bg-green-50 p-3 rounded-lg">
                <p className="text-xs text-gray-600">Total Hours</p>
                <p className="text-2xl font-bold text-green-600">
                  {metrics.reduce((sum, m) => sum + m.totalHours, 0).toFixed(1)}h
                </p>
              </div>
              <div className="bg-orange-50 p-3 rounded-lg">
                <p className="text-xs text-gray-600">Total Overtime</p>
                <p className="text-2xl font-bold text-orange-600">
                  {metrics.reduce((sum, m) => sum + m.totalOvertimeHours, 0).toFixed(1)}h
                </p>
              </div>
              <div className="bg-purple-50 p-3 rounded-lg">
                <p className="text-xs text-gray-600">Days Worked</p>
                <p className="text-2xl font-bold text-purple-600">
                  {metrics.reduce((sum, m) => sum + m.daysWorked, 0)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Weekly Breakdown */}
        {metrics.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-semibold text-gray-900">Weekly Breakdown</h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {metrics.map((metric, index) => (
                <div
                  key={index}
                  className="bg-gray-50 p-3 rounded-lg border border-gray-200"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-600" />
                      <span className="font-medium text-gray-900">{metric.week}</span>
                    </div>
                    <Badge variant="outline">
                      {metric.startDate.toLocaleDateString()} -{" "}
                      {metric.endDate.toLocaleDateString()}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <p className="text-gray-600">Hours</p>
                      <p className="font-semibold">{metric.totalHours.toFixed(1)}h</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Overtime</p>
                      <p className="font-semibold text-orange-600">
                        {metric.totalOvertimeHours.toFixed(1)}h
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Avg/Day</p>
                      <p className="font-semibold">
                        {metric.averageHoursPerDay.toFixed(1)}h
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {metrics.length === 0 && !isLoading && (
          <div className="text-center py-6 text-gray-600">
            <BarChart3 className="w-8 h-8 mx-auto mb-2 text-gray-400" />
            <p>No weekly metrics available</p>
          </div>
        )}

        {isLoading && (
          <div className="text-center py-6">
            <Loader2 className="w-8 h-8 mx-auto mb-2 text-blue-600 animate-spin" />
            <p className="text-gray-600">Loading metrics...</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
