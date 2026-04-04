import { AlertTriangle, Clock, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface StaffMetric {
  id: number;
  name: string;
  email: string;
  hoursWorked: number;
  overtimeHours: number;
  daysWorked: number;
  averageHoursPerDay: number;
}

interface StaffThresholdIndicatorProps {
  staffMetrics: StaffMetric[];
  thresholdHours?: number; // Default 8 hours per day
}

export function StaffThresholdIndicator({
  staffMetrics,
  thresholdHours = 8,
}: StaffThresholdIndicatorProps) {
  // Filter staff exceeding threshold
  const staffExceedingThreshold = staffMetrics.filter(
    (staff) => staff.averageHoursPerDay > thresholdHours
  );

  // Calculate statistics
  const totalOvertimeHours = staffExceedingThreshold.reduce(
    (sum, staff) => sum + staff.overtimeHours,
    0
  );
  const averageOvertime =
    staffExceedingThreshold.length > 0
      ? totalOvertimeHours / staffExceedingThreshold.length
      : 0;

  return (
    <div className="space-y-4">
      {/* Summary Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <p className="text-sm text-gray-600">Staff Above Threshold</p>
              <p className="text-3xl font-bold text-orange-600">
                {staffExceedingThreshold.length}
              </p>
              <p className="text-xs text-gray-500">
                of {staffMetrics.length} total staff
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-gray-600">Total Overtime</p>
              <p className="text-3xl font-bold text-red-600">
                {totalOvertimeHours.toFixed(1)}h
              </p>
              <p className="text-xs text-gray-500">
                Avg: {averageOvertime.toFixed(1)}h per person
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Staff List */}
      {staffExceedingThreshold.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-6">
            <h3 className="font-semibold text-orange-900 mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Staff Exceeding {thresholdHours}h/day Threshold
            </h3>
            <div className="space-y-3">
              {staffExceedingThreshold.map((staff) => (
                <div
                  key={staff.id}
                  className="bg-white rounded-lg p-3 border border-orange-200"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-medium text-gray-900">{staff.name}</p>
                      <p className="text-xs text-gray-600">{staff.email}</p>
                    </div>
                    <Badge
                      variant="destructive"
                      className="bg-red-600 hover:bg-red-700"
                    >
                      <TrendingUp className="w-3 h-3 mr-1" />
                      {staff.overtimeHours.toFixed(1)}h OT
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="bg-orange-100 p-2 rounded">
                      <p className="text-gray-600">Avg/Day</p>
                      <p className="font-semibold text-orange-900">
                        {staff.averageHoursPerDay.toFixed(1)}h
                      </p>
                    </div>
                    <div className="bg-orange-100 p-2 rounded">
                      <p className="text-gray-600">Total Hours</p>
                      <p className="font-semibold text-orange-900">
                        {staff.hoursWorked.toFixed(1)}h
                      </p>
                    </div>
                    <div className="bg-orange-100 p-2 rounded">
                      <p className="text-gray-600">Days Worked</p>
                      <p className="font-semibold text-orange-900">
                        {staff.daysWorked}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {staffExceedingThreshold.length === 0 && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6 text-center">
            <Clock className="w-8 h-8 text-green-600 mx-auto mb-2" />
            <p className="text-green-900 font-medium">
              All staff within threshold
            </p>
            <p className="text-sm text-green-700">
              No staff members are exceeding {thresholdHours}h/day
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
