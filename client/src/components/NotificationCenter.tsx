import React, { useState, useEffect } from "react";
import { Bell, X, CheckCircle, LogOut, AlertCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

export interface Notification {
  id: string;
  type: "check-in" | "check-out" | "alert";
  staffName: string;
  message: string;
  timestamp: Date;
  read: boolean;
  details?: {
    location?: string | null;
    accuracy?: string | null;
    hoursWorked?: string | null;
    distance?: string | null;
  };
}

interface NotificationCenterProps {
  notifications: Notification[];
  onClear?: (id: string) => void;
  onClearAll?: () => void;
}

export function NotificationCenter({
  notifications,
  onClear,
  onClearAll,
}: NotificationCenterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const unreadCount = notifications.filter((n) => !n.read).length;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "check-in":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "check-out":
        return <LogOut className="w-4 h-4 text-blue-500" />;
      case "alert":
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      default:
        return <Bell className="w-4 h-4 text-slate-400" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case "check-in":
        return "bg-green-500/10 border-green-500/30";
      case "check-out":
        return "bg-blue-500/10 border-blue-500/30";
      case "alert":
        return "bg-yellow-500/10 border-yellow-500/30";
      default:
        return "bg-slate-700/50 border-slate-600/50";
    }
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = Math.floor((now.getTime() - new Date(date).getTime()) / 1000);

    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return new Date(date).toLocaleDateString();
  };

  return (
    <div className="relative">
      {/* Notification Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-300 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-12 w-96 z-50">
          <Card className="bg-slate-800 border-slate-700 shadow-2xl">
            <CardHeader className="pb-3 border-b border-slate-700">
              <div className="flex items-center justify-between">
                <CardTitle className="text-white flex items-center gap-2">
                  <Bell className="w-5 h-5 text-blue-400" />
                  Notifications
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              {unreadCount > 0 && (
                <CardDescription className="text-blue-400 text-xs">
                  {unreadCount} unread notification{unreadCount !== 1 ? "s" : ""}
                </CardDescription>
              )}
            </CardHeader>

            <CardContent className="p-0">
              {notifications.length === 0 ? (
                <div className="p-6 text-center text-slate-400">
                  <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No notifications yet</p>
                </div>
              ) : (
                <>
                  <ScrollArea className="h-96">
                    <div className="space-y-2 p-3">
                      {notifications.map((notification) => (
                        <div
                          key={notification.id}
                          className={`p-3 rounded-lg border ${getNotificationColor(
                            notification.type
                          )} transition-colors hover:opacity-80 ${
                            !notification.read ? "ring-2 ring-blue-500/50" : ""
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-2 flex-1">
                              {getNotificationIcon(notification.type)}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-white truncate">
                                  {notification.staffName}
                                </p>
                                <p className="text-xs text-slate-300 mt-1">
                                  {notification.message}
                                </p>
                                {notification.details && (
                                  <div className="text-xs text-slate-400 mt-2 space-y-1">
                                    {notification.details.location && (
                                      <p>📍 {notification.details.location}</p>
                                    )}
                                    {notification.details.accuracy && (
                                      <p>📊 Accuracy: {notification.details.accuracy}</p>
                                    )}
                                    {notification.details.hoursWorked && (
                                      <p>⏱️ Hours: {notification.details.hoursWorked}</p>
                                    )}
                                    {notification.details.distance && (
                                      <p>📏 Distance: {notification.details.distance}</p>
                                    )}
                                  </div>
                                )}
                                <p className="text-xs text-slate-500 mt-2">
                                  {formatTime(notification.timestamp)}
                                </p>
                              </div>
                            </div>
                            {onClear && (
                              <button
                                onClick={() => onClear(notification.id)}
                                className="text-slate-400 hover:text-white transition-colors flex-shrink-0"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>

                  {notifications.length > 0 && onClearAll && (
                    <div className="border-t border-slate-700 p-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={onClearAll}
                        className="w-full text-slate-300 border-slate-600 hover:bg-slate-700"
                      >
                        Clear All
                      </Button>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
