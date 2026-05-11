import { AlertTriangle, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface OvertimeAlertProps {
  hoursWorked: number;
  overtimeHours: number;
  isOvertime: boolean;
  staffName?: string;
  compact?: boolean;
}

export function OvertimeAlert({
  hoursWorked,
  overtimeHours,
  isOvertime,
  staffName,
  compact = false,
}: OvertimeAlertProps) {
  if (!isOvertime) {
    return null;
  }

  if (compact) {
    return (
      <div className="flex items-center gap-1">
        <AlertTriangle className="w-4 h-4 text-red-500 animate-pulse" />
        <span className="text-xs font-semibold text-red-500">+{overtimeHours}h OT</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 p-3 bg-red-950/40 border border-red-500/50 rounded-lg">
      <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 animate-pulse" />
      <div className="flex-1">
        <p className="text-sm font-semibold text-red-400">
          {staffName ? `${staffName} - Overtime Alert` : "Overtime Alert"}
        </p>
        <p className="text-xs text-red-300 mt-1">
          {hoursWorked} hours worked ({overtimeHours}h overtime)
        </p>
      </div>
      <Badge className="bg-red-600 hover:bg-red-700 text-white flex-shrink-0">
        +{overtimeHours}h
      </Badge>
    </div>
  );
}

export function OvertimeIndicator({
  hoursWorked,
  overtimeHours,
  isOvertime,
}: {
  hoursWorked: number;
  overtimeHours: number;
  isOvertime: boolean;
}) {
  if (!isOvertime) {
    return (
      <div className="flex items-center gap-1">
        <Clock className="w-4 h-4 text-green-400" />
        <span className="text-sm font-medium text-green-400">{hoursWorked}h</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1">
        <AlertTriangle className="w-4 h-4 text-red-500 animate-pulse" />
        <span className="text-sm font-bold text-red-500">{hoursWorked}h</span>
      </div>
      <Badge className="bg-red-600 hover:bg-red-700 text-white text-xs">
        +{overtimeHours}h OT
      </Badge>
    </div>
  );
}

export function OvertimeStatistics({
  totalStaffWithOvertime,
  totalOvertimeHours,
}: {
  totalStaffWithOvertime: number;
  totalOvertimeHours: number;
}) {
  if (totalStaffWithOvertime === 0) {
    return null;
  }

  return (
    <div className="p-4 bg-red-950/30 border border-red-500/40 rounded-lg">
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle className="w-5 h-5 text-red-500" />
        <h3 className="font-semibold text-red-400">Overtime Summary</h3>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-red-300">Staff with Overtime</p>
          <p className="text-2xl font-bold text-red-500">{totalStaffWithOvertime}</p>
        </div>
        <div>
          <p className="text-xs text-red-300">Total Overtime Hours</p>
          <p className="text-2xl font-bold text-red-500">{totalOvertimeHours.toFixed(2)}h</p>
        </div>
      </div>
    </div>
  );
}
