import React, { useState, useEffect } from "react";
import { Settings, Clock, Bell, Mail, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

interface NotificationPreferencesDialogProps {
  trigger?: React.ReactNode;
}

const TIMEZONES = [
  "UTC",
  "Africa/Nairobi",
  "Africa/Lagos",
  "Africa/Johannesburg",
  "Europe/London",
  "Europe/Paris",
  "America/New_York",
  "America/Los_Angeles",
  "Asia/Tokyo",
  "Asia/Shanghai",
];

export function NotificationPreferencesDialog({
  trigger,
}: NotificationPreferencesDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const { data: preferences, isLoading } = trpc.notificationPreferences.get.useQuery();
  const updateMutation = trpc.notificationPreferences.update.useMutation();

  const [formData, setFormData] = useState({
    enableCheckInNotifications: true,
    enableCheckOutNotifications: true,
    enableLeaveApprovalNotifications: true,
    enableOvertimeAlerts: true,
    quietHoursEnabled: false,
    quietHoursStart: "09:00",
    quietHoursEnd: "18:00",
    quietHoursTimezone: "UTC",
    notificationChannels: {
      inApp: true,
      email: false,
      push: false,
    },
  });

  useEffect(() => {
    if (preferences) {
      setFormData({
        enableCheckInNotifications: preferences.enableCheckInNotifications ?? true,
        enableCheckOutNotifications: preferences.enableCheckOutNotifications ?? true,
        enableLeaveApprovalNotifications: preferences.enableLeaveApprovalNotifications ?? true,
        enableOvertimeAlerts: preferences.enableOvertimeAlerts ?? true,
        quietHoursEnabled: preferences.quietHoursEnabled ?? false,
        quietHoursStart: preferences.quietHoursStart ?? "09:00",
        quietHoursEnd: preferences.quietHoursEnd ?? "18:00",
        quietHoursTimezone: preferences.quietHoursTimezone ?? "UTC",
        notificationChannels: (preferences.notificationChannels as any) || {
          inApp: true,
          email: false,
          push: false,
        },
      });
    }
  }, [preferences]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateMutation.mutateAsync(formData);
      toast.success("Notification preferences saved");
      setIsOpen(false);
    } catch (error) {
      toast.error("Failed to save preferences");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggle = (key: string) => {
    if (key === "quietHoursEnabled" || key === "enableCheckInNotifications" || key === "enableCheckOutNotifications" || key === "enableLeaveApprovalNotifications" || key === "enableOvertimeAlerts") {
      setFormData((prev) => ({
        ...prev,
        [key]: !(prev as any)[key],
      }));
    }
  };

  const handleChannelToggle = (channel: "inApp" | "email" | "push") => {
    setFormData((prev) => ({
      ...prev,
      notificationChannels: {
        ...prev.notificationChannels,
        [channel]: !prev.notificationChannels[channel],
      },
    }));
  };

  if (isLoading) {
    return (
      <Button variant="outline" disabled>
        <Settings className="w-4 h-4 mr-2" />
        Loading...
      </Button>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Settings className="w-4 h-4 mr-2" />
            Notification Settings
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-w-2xl bg-slate-800 border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Bell className="w-5 h-5 text-blue-400" />
            Notification Preferences
          </DialogTitle>
          <DialogDescription className="text-slate-300">
            Customize which notifications you receive and when
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="events" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-slate-700">
            <TabsTrigger value="events" className="text-slate-300">
              Events
            </TabsTrigger>
            <TabsTrigger value="quiet" className="text-slate-300">
              Quiet Hours
            </TabsTrigger>
            <TabsTrigger value="channels" className="text-slate-300">
              Channels
            </TabsTrigger>
          </TabsList>

          {/* Events Tab */}
          <TabsContent value="events" className="space-y-4 mt-4">
            <Card className="bg-slate-700 border-slate-600">
              <CardHeader>
                <CardTitle className="text-white text-sm">Event Notifications</CardTitle>
                <CardDescription className="text-slate-400">
                  Choose which events trigger notifications
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Bell className="w-4 h-4 text-green-400" />
                    <div>
                      <p className="text-white font-medium">Check-in Notifications</p>
                      <p className="text-xs text-slate-400">Notify when staff check in</p>
                    </div>
                  </div>
                  <Switch
                    checked={formData.enableCheckInNotifications}
                    onCheckedChange={() => handleToggle("enableCheckInNotifications")}
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Bell className="w-4 h-4 text-blue-400" />
                    <div>
                      <p className="text-white font-medium">Check-out Notifications</p>
                      <p className="text-xs text-slate-400">Notify when staff check out</p>
                    </div>
                  </div>
                  <Switch
                    checked={formData.enableCheckOutNotifications}
                    onCheckedChange={() => handleToggle("enableCheckOutNotifications")}
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Bell className="w-4 h-4 text-yellow-400" />
                    <div>
                      <p className="text-white font-medium">Leave Approval Notifications</p>
                      <p className="text-xs text-slate-400">Notify on leave request updates</p>
                    </div>
                  </div>
                  <Switch
                    checked={formData.enableLeaveApprovalNotifications}
                    onCheckedChange={() => handleToggle("enableLeaveApprovalNotifications")}
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Bell className="w-4 h-4 text-red-400" />
                    <div>
                      <p className="text-white font-medium">Overtime Alerts</p>
                      <p className="text-xs text-slate-400">Alert when staff works overtime</p>
                    </div>
                  </div>
                  <Switch
                    checked={formData.enableOvertimeAlerts}
                    onCheckedChange={() => handleToggle("enableOvertimeAlerts")}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Quiet Hours Tab */}
          <TabsContent value="quiet" className="space-y-4 mt-4">
            <Card className="bg-slate-700 border-slate-600">
              <CardHeader>
                <CardTitle className="text-white text-sm flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Quiet Hours
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Pause notifications during specific hours
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
                  <div>
                    <p className="text-white font-medium">Enable Quiet Hours</p>
                    <p className="text-xs text-slate-400">Disable notifications during set times</p>
                  </div>
                  <Switch
                    checked={formData.quietHoursEnabled}
                    onCheckedChange={() => handleToggle("quietHoursEnabled")}
                  />
                </div>

                {formData.quietHoursEnabled && (
                  <>
                    <div className="space-y-2">
                      <Label className="text-slate-300">Timezone</Label>
                      <Select value={formData.quietHoursTimezone} onValueChange={(value) => {
                        setFormData((prev) => ({
                          ...prev,
                          quietHoursTimezone: value,
                        }));
                      }}>
                        <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-600">
                          {TIMEZONES.map((tz) => (
                            <SelectItem key={tz} value={tz} className="text-white">
                              {tz}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-slate-300">Start Time (HH:MM)</Label>
                        <Input
                          type="time"
                          value={formData.quietHoursStart}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              quietHoursStart: e.target.value,
                            }))
                          }
                          className="bg-slate-800 border-slate-600 text-white"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-slate-300">End Time (HH:MM)</Label>
                        <Input
                          type="time"
                          value={formData.quietHoursEnd}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              quietHoursEnd: e.target.value,
                            }))
                          }
                          className="bg-slate-800 border-slate-600 text-white"
                        />
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Channels Tab */}
          <TabsContent value="channels" className="space-y-4 mt-4">
            <Card className="bg-slate-700 border-slate-600">
              <CardHeader>
                <CardTitle className="text-white text-sm">Notification Channels</CardTitle>
                <CardDescription className="text-slate-400">
                  Choose how you receive notifications
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Bell className="w-4 h-4 text-blue-400" />
                    <div>
                      <p className="text-white font-medium">In-App Notifications</p>
                      <p className="text-xs text-slate-400">Show notifications in dashboard</p>
                    </div>
                  </div>
                  <Switch
                    checked={formData.notificationChannels.inApp}
                    onCheckedChange={() => handleChannelToggle("inApp")}
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Mail className="w-4 h-4 text-green-400" />
                    <div>
                      <p className="text-white font-medium">Email Notifications</p>
                      <p className="text-xs text-slate-400">Send email alerts</p>
                    </div>
                  </div>
                  <Switch
                    checked={formData.notificationChannels.email}
                    onCheckedChange={() => handleChannelToggle("email")}
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Smartphone className="w-4 h-4 text-purple-400" />
                    <div>
                      <p className="text-white font-medium">Push Notifications</p>
                      <p className="text-xs text-slate-400">Send push notifications</p>
                    </div>
                  </div>
                  <Switch
                    checked={formData.notificationChannels.push}
                    onCheckedChange={() => handleChannelToggle("push")}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 mt-6">
          <Button
            variant="outline"
            onClick={() => setIsOpen(false)}
            className="border-slate-600 text-slate-300"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isSaving ? "Saving..." : "Save Preferences"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
