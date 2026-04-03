import React, { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface LeaveEvent {
  id: number;
  startDate: Date;
  endDate: Date;
  leaveType: string;
  status: "approved" | "pending" | "rejected";
  reason?: string;
}

interface LeaveCalendarProps {
  leaveRequests: LeaveEvent[];
  isLoading?: boolean;
}

const LEAVE_TYPE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  annual: { bg: "bg-blue-900/30", text: "text-blue-300", border: "border-blue-500/50" },
  sick: { bg: "bg-green-900/30", text: "text-green-300", border: "border-green-500/50" },
  unpaid: { bg: "bg-yellow-900/30", text: "text-yellow-300", border: "border-yellow-500/50" },
  maternity: { bg: "bg-pink-900/30", text: "text-pink-300", border: "border-pink-500/50" },
  other: { bg: "bg-purple-900/30", text: "text-purple-300", border: "border-purple-500/50" },
};

const STATUS_COLORS: Record<string, string> = {
  approved: "bg-green-500/20 border-green-500/50",
  pending: "bg-yellow-500/20 border-yellow-500/50",
  rejected: "bg-red-500/20 border-red-500/50",
};

const STATUS_BADGES: Record<string, { label: string; color: string }> = {
  approved: { label: "Approved", color: "bg-green-500/20 text-green-300" },
  pending: { label: "Pending", color: "bg-yellow-500/20 text-yellow-300" },
  rejected: { label: "Rejected", color: "bg-red-500/20 text-red-300" },
};

export function LeaveCalendar({ leaveRequests = [], isLoading = false }: LeaveCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  // Get days in month
  const daysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

  // Get leave events for each day
  const getLeaveForDay = (day: number): LeaveEvent[] => {
    const checkDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    return leaveRequests.filter((leave) => {
      const startDate = new Date(leave.startDate);
      const endDate = new Date(leave.endDate);
      return checkDate >= startDate && checkDate <= endDate;
    });
  };

  // Get all leave events for current month
  const monthLeaveEvents = useMemo(() => {
    const events: Record<number, LeaveEvent[]> = {};
    for (let day = 1; day <= daysInMonth(currentDate); day++) {
      events[day] = getLeaveForDay(day);
    }
    return events;
  }, [currentDate, leaveRequests]);

  // Navigation handlers
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Generate calendar days
  const calendarDays = [];
  const totalCells = firstDayOfMonth(currentDate) + daysInMonth(currentDate);
  const totalRows = Math.ceil(totalCells / 7);

  for (let i = 0; i < totalRows * 7; i++) {
    const day = i - firstDayOfMonth(currentDate) + 1;
    if (day > 0 && day <= daysInMonth(currentDate)) {
      calendarDays.push(day);
    } else {
      calendarDays.push(null);
    }
  }

  const monthName = currentDate.toLocaleString("default", { month: "long", year: "numeric" });
  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Get summary stats
  const approvedDays = leaveRequests
    .filter((l) => l.status === "approved")
    .reduce((sum, leave) => {
      const days = Math.ceil((new Date(leave.endDate).getTime() - new Date(leave.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1;
      return sum + days;
    }, 0);

  const pendingDays = leaveRequests
    .filter((l) => l.status === "pending")
    .reduce((sum, leave) => {
      const days = Math.ceil((new Date(leave.endDate).getTime() - new Date(leave.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1;
      return sum + days;
    }, 0);

  return (
    <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700 shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-400" />
              Leave Calendar
            </CardTitle>
            <CardDescription className="text-slate-400">View your leave history and plan future time off</CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <p className="text-slate-400">Loading leave calendar...</p>
          </div>
        ) : (
          <>
            {/* Calendar Navigation */}
            <div className="flex items-center justify-between">
              <Button variant="outline" size="sm" onClick={goToPreviousMonth} className="border-slate-600 text-slate-300 hover:bg-slate-700">
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div className="text-center">
                <h3 className="text-lg font-semibold text-white">{monthName}</h3>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={goToToday} className="border-slate-600 text-slate-300 hover:bg-slate-700 text-xs">
                  Today
                </Button>
                <Button variant="outline" size="sm" onClick={goToNextMonth} className="border-slate-600 text-slate-300 hover:bg-slate-700">
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-green-900/20 border border-green-500/50 rounded-lg p-3 text-center">
                <p className="text-slate-400 text-xs font-medium mb-1">Approved</p>
                <p className="text-2xl font-bold text-green-400">{approvedDays}</p>
                <p className="text-xs text-slate-500">days</p>
              </div>
              <div className="bg-yellow-900/20 border border-yellow-500/50 rounded-lg p-3 text-center">
                <p className="text-slate-400 text-xs font-medium mb-1">Pending</p>
                <p className="text-2xl font-bold text-yellow-400">{pendingDays}</p>
                <p className="text-xs text-slate-500">days</p>
              </div>
              <div className="bg-blue-900/20 border border-blue-500/50 rounded-lg p-3 text-center">
                <p className="text-slate-400 text-xs font-medium mb-1">Total</p>
                <p className="text-2xl font-bold text-blue-400">{approvedDays + pendingDays}</p>
                <p className="text-xs text-slate-500">days</p>
              </div>
            </div>

            {/* Calendar Grid */}
            <div className="bg-slate-700/30 rounded-lg p-4 border border-slate-600">
              {/* Week day headers */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {weekDays.map((day) => (
                  <div key={day} className="text-center text-slate-400 text-xs font-semibold py-2">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar days */}
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((day, index) => {
                  const dayLeaves = day ? monthLeaveEvents[day] || [] : [];
                  const isToday = day && new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toDateString() === new Date().toDateString();
                  const isWeekend = index % 7 === 0 || index % 7 === 6;

                  return (
                    <div
                      key={index}
                      className={`min-h-20 p-1 rounded border text-xs ${
                        day
                          ? `${isToday ? "border-blue-500 bg-blue-900/20" : "border-slate-600 bg-slate-700/20"} ${isWeekend ? "bg-slate-800/30" : ""}`
                          : "border-transparent bg-transparent"
                      }`}
                    >
                      {day && (
                        <div className="space-y-1">
                          <div className={`font-semibold ${isToday ? "text-blue-400" : "text-slate-300"}`}>{day}</div>
                          <div className="space-y-0.5">
                            {dayLeaves.map((leave) => {
                              const colors = LEAVE_TYPE_COLORS[leave.leaveType] || LEAVE_TYPE_COLORS.other;
                              const statusColor = STATUS_COLORS[leave.status];
                              return (
                                <div
                                  key={leave.id}
                                  className={`text-xs px-1 py-0.5 rounded border truncate ${statusColor} ${colors.text} font-medium cursor-pointer hover:opacity-80 transition-opacity`}
                                  title={`${leave.leaveType} - ${leave.status}`}
                                >
                                  {leave.leaveType.charAt(0).toUpperCase()}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Legend */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              {Object.entries(LEAVE_TYPE_COLORS).map(([type, colors]) => (
                <div key={type} className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded ${colors.bg} border ${colors.border}`}></div>
                  <span className="text-xs text-slate-400 capitalize">{type}</span>
                </div>
              ))}
            </div>

            {/* Status Legend */}
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-600">
              {Object.entries(STATUS_BADGES).map(([status, badge]) => (
                <div key={status} className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${badge.color}`}></div>
                  <span className="text-xs text-slate-400 capitalize">{badge.label}</span>
                </div>
              ))}
            </div>

            {/* Leave Details List */}
            {leaveRequests.length > 0 && (
              <div className="pt-4 border-t border-slate-600 space-y-2">
                <h4 className="text-sm font-semibold text-white">Recent Leave Requests</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {leaveRequests.slice(0, 5).map((leave) => {
                    const startDate = new Date(leave.startDate).toLocaleDateString();
                    const endDate = new Date(leave.endDate).toLocaleDateString();
                    const days = Math.ceil((new Date(leave.endDate).getTime() - new Date(leave.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1;
                    const statusBadge = STATUS_BADGES[leave.status];
                    const colors = LEAVE_TYPE_COLORS[leave.leaveType] || LEAVE_TYPE_COLORS.other;

                    return (
                      <div key={leave.id} className="bg-slate-700/30 border border-slate-600 rounded-lg p-3 text-sm">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${statusBadge.color}`}></div>
                            <span className="font-medium text-slate-300 capitalize">{leave.leaveType}</span>
                          </div>
                          <Badge className={statusBadge.color}>{statusBadge.label}</Badge>
                        </div>
                        <p className="text-slate-400 text-xs mb-1">
                          {startDate} to {endDate} ({days} days)
                        </p>
                        {leave.reason && <p className="text-slate-500 text-xs italic">{leave.reason}</p>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {leaveRequests.length === 0 && (
              <div className="text-center py-8">
                <Calendar className="w-12 h-12 text-slate-600 mx-auto mb-2 opacity-50" />
                <p className="text-slate-400">No leave requests yet. Plan your time off!</p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
