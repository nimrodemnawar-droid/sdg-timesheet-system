import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Trash2, Edit2, Clock, Mail, Calendar } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function ReportSchedulingManager() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    reportType: "attendance" as const,
    frequency: "daily" as "daily" | "weekly",
    dayOfWeek: "monday",
    timeOfDay: "09:00",
    timezone: "UTC",
    emailRecipients: "",
  });

  const schedules = trpc.reportScheduling.getAll.useQuery();
  // TODO: Implement create, update, and delete mutations for report scheduling
  const createSchedule = { mutateAsync: async () => {} } as any;
  const updateSchedule = { mutateAsync: async () => {} } as any;
  const deleteSchedule = { mutateAsync: async () => {} } as any;

  const resetForm = () => {
    setFormData({
      reportType: "attendance",
      frequency: "daily",
      dayOfWeek: "monday",
      timeOfDay: "09:00",
      timezone: "UTC",
      emailRecipients: "",
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const emails = formData.emailRecipients
      .split(",")
      .map((e) => e.trim())
      .filter((e) => e);

    if (emails.length === 0) {
      toast.error("Please add at least one email recipient");
      return;
    }

    if (editingId) {
      updateSchedule.mutate({
        id: editingId,
        timeOfDay: formData.timeOfDay,
        emailRecipients: emails,
      });
    } else {
      createSchedule.mutate({
        reportType: formData.reportType,
        frequency: formData.frequency,
        dayOfWeek: formData.frequency === "weekly" ? formData.dayOfWeek : undefined,
        timeOfDay: formData.timeOfDay,
        timezone: formData.timezone,
        emailRecipients: emails,
      });
    }
  };

  const handleEdit = (schedule: any) => {
    setEditingId(schedule.id);
    setFormData({
      reportType: schedule.reportType,
      frequency: schedule.frequency,
      dayOfWeek: schedule.dayOfWeek || "monday",
      timeOfDay: schedule.timeOfDay,
      timezone: schedule.timezone,
      emailRecipients: schedule.emailRecipients.join(", "),
    });
    setIsDialogOpen(true);
  };

  const getReportTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      attendance: "Attendance",
      overtime: "Overtime",
      leave: "Leave",
      gps_activity: "GPS Activity",
      all: "All Reports",
    };
    return labels[type] || type;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-white">Scheduled Reports</h3>
          <p className="text-sm text-slate-400">Manage automated report delivery to your email</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={() => {
                setEditingId(null);
                resetForm();
              }}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Schedule
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-slate-800 border-slate-700 text-white">
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit Schedule" : "Create New Schedule"}</DialogTitle>
              <DialogDescription className="text-slate-400">
                {editingId
                  ? "Update the report schedule settings"
                  : "Set up automated report generation and email delivery"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label className="text-slate-300">Report Type</Label>
                <Select
                  value={formData.reportType}
                  onValueChange={(value: any) =>
                    setFormData({ ...formData, reportType: value })
                  }
                  disabled={!!editingId}
                >
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-700 border-slate-600">
                    <SelectItem value="attendance">Attendance Report</SelectItem>
                    <SelectItem value="overtime">Overtime Report</SelectItem>
                    <SelectItem value="leave">Leave Report</SelectItem>
                    <SelectItem value="gps_activity">GPS Activity Report</SelectItem>
                    <SelectItem value="all">All Reports</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-300">Frequency</Label>
                  <Select
                    value={formData.frequency}
                    onValueChange={(value: "daily" | "weekly") =>
                      setFormData({ ...formData, frequency: value })
                    }
                    disabled={!!editingId}
                  >
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-700 border-slate-600">
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {(formData.frequency as string) === "weekly" && (
                  <div>
                    <Label className="text-slate-300">Day of Week</Label>
                    <Select
                      value={formData.dayOfWeek}
                      onValueChange={(value) =>
                        setFormData({ ...formData, dayOfWeek: value })
                      }
                      disabled={!!editingId}
                    >
                      <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-700 border-slate-600">
                        <SelectItem value="monday">Monday</SelectItem>
                        <SelectItem value="tuesday">Tuesday</SelectItem>
                        <SelectItem value="wednesday">Wednesday</SelectItem>
                        <SelectItem value="thursday">Thursday</SelectItem>
                        <SelectItem value="friday">Friday</SelectItem>
                        <SelectItem value="saturday">Saturday</SelectItem>
                        <SelectItem value="sunday">Sunday</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-300">Time of Day</Label>
                  <Input
                    type="time"
                    value={formData.timeOfDay}
                    onChange={(e) =>
                      setFormData({ ...formData, timeOfDay: e.target.value })
                    }
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
                <div>
                  <Label className="text-slate-300">Timezone</Label>
                  <Select
                    value={formData.timezone}
                    onValueChange={(value) =>
                      setFormData({ ...formData, timezone: value })
                    }
                    disabled={!!editingId}
                  >
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-700 border-slate-600">
                      <SelectItem value="UTC">UTC</SelectItem>
                      <SelectItem value="Africa/Nairobi">Africa/Nairobi (EAT)</SelectItem>
                      <SelectItem value="Africa/Lagos">Africa/Lagos (WAT)</SelectItem>
                      <SelectItem value="Africa/Johannesburg">Africa/Johannesburg (SAST)</SelectItem>
                      <SelectItem value="Europe/London">Europe/London (GMT/BST)</SelectItem>
                      <SelectItem value="America/New_York">America/New_York (EST/EDT)</SelectItem>
                      <SelectItem value="Asia/Dubai">Asia/Dubai (GST)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label className="text-slate-300">Email Recipients</Label>
                <Input
                  type="text"
                  placeholder="email1@example.com, email2@example.com"
                  value={formData.emailRecipients}
                  onChange={(e) =>
                    setFormData({ ...formData, emailRecipients: e.target.value })
                  }
                  className="bg-slate-700 border-slate-600 text-white placeholder-slate-500"
                />
                <p className="text-xs text-slate-400 mt-1">
                  Separate multiple emails with commas
                </p>
              </div>

              <div className="flex gap-2 justify-end pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsDialogOpen(false);
                    setEditingId(null);
                  }}
                  className="border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createSchedule.isPending || updateSchedule.isPending}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {editingId ? "Update Schedule" : "Create Schedule"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {schedules.isLoading ? (
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="pt-6">
              <p className="text-slate-400">Loading schedules...</p>
            </CardContent>
          </Card>
        ) : schedules.data && schedules.data.length > 0 ? (
          schedules.data.map((schedule: any) => (
            <Card
              key={schedule.id}
              className="bg-slate-800/50 border-slate-700 hover:border-slate-600 transition-colors"
            >
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-3 flex-1">
                    <div className="flex items-center gap-3">
                      <Badge className="bg-blue-600/20 text-blue-300 border-blue-600/30">
                        {getReportTypeLabel(schedule.reportType)}
                      </Badge>
                      <Badge
                        className={
                          schedule.isActive
                            ? "bg-green-600/20 text-green-300 border-green-600/30"
                            : "bg-slate-600/20 text-slate-300 border-slate-600/30"
                        }
                      >
                        {schedule.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-2 text-slate-300">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        <span>
                          {schedule.frequency === "daily"
                            ? "Daily"
                            : `Weekly on ${schedule.dayOfWeek}`}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-300">
                        <Clock className="w-4 h-4 text-slate-400" />
                        <span>{schedule.timeOfDay}</span>
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <Mail className="w-4 h-4 text-slate-400 mt-1" />
                      <div className="text-sm text-slate-300">
                        <p className="font-medium">Recipients:</p>
                        <p className="text-slate-400">
                          {schedule.emailRecipients.join(", ")}
                        </p>
                      </div>
                    </div>

                    {schedule.lastSentAt && (
                      <p className="text-xs text-slate-400">
                        Last sent: {new Date(schedule.lastSentAt).toLocaleString()}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(schedule)}
                      className="border-slate-600 text-slate-300 hover:bg-slate-700"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => deleteSchedule.mutate({ id: schedule.id })}
                      disabled={deleteSchedule.isPending}
                      className="border-red-600/30 text-red-400 hover:bg-red-600/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="pt-6">
              <p className="text-slate-400 text-center">
                No report schedules configured yet. Click "New Schedule" to create one.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
