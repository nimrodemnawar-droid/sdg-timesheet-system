import React, { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { AlertCircle, CheckCircle, XCircle, Bell, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Notification {
  id: number;
  userId: number;
  title: string;
  content: string;
  eventType: string;
  eventEntityId?: number;
  channels: {
    inApp?: boolean;
    email?: boolean;
    push?: boolean;
  };
  deliveryStatus: string;
  read: boolean;
  readAt?: string;
  createdAt: string;
  updatedAt: string;
}

export function NotificationBanner() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [displayedNotifications, setDisplayedNotifications] = useState<Set<number>>(new Set());
  const [showAll, setShowAll] = useState(false);

  // Fetch notification history
  const { data: notificationHistory, refetch } = trpc.notificationPreferences.getHistory.useQuery(
    {
      limit: 10,
      offset: 0,
      eventType: "LEAVE_APPROVAL",
    },
    { enabled: !!user, refetchInterval: 3000 }
  );

  useEffect(() => {
    if (!notificationHistory) return;

    const newNotifications = Array.isArray(notificationHistory)
      ? notificationHistory.filter((n: any) => !displayedNotifications.has(n.id))
      : [];

    if (newNotifications.length > 0) {
      setNotifications((prev) => [...newNotifications, ...prev].slice(0, 10));
      setDisplayedNotifications((prev) => {
        const newSet = new Set(prev);
        newNotifications.forEach((n: any) => newSet.add(n.id));
        return newSet;
      });
    }
  }, [notificationHistory, displayedNotifications]);

  const dismissNotification = (id: number) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const getNotificationIcon = (eventType: string) => {
    if (eventType === "LEAVE_APPROVAL") {
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    } else if (eventType === "LEAVE_REJECTED") {
      return <XCircle className="w-5 h-5 text-red-500" />;
    }
    return <Bell className="w-5 h-5 text-blue-500" />;
  };

  const getNotificationColor = (eventType: string) => {
    if (eventType === "LEAVE_APPROVAL") {
      return "bg-green-900/20 border-green-700/50";
    } else if (eventType === "LEAVE_REJECTED") {
      return "bg-red-900/20 border-red-700/50";
    }
    return "bg-blue-900/20 border-blue-700/50";
  };

  if (notifications.length === 0 && !showAll) {
    return null;
  }

  const displayCount = showAll ? notifications.length : Math.min(notifications.length, 3);
  const visibleNotifications = notifications.slice(0, displayCount);

  return (
    <div className="space-y-2">
      {visibleNotifications.map((notification) => (
        <div
          key={notification.id}
          className={`p-4 rounded-lg border ${getNotificationColor(notification.eventType)} flex items-start gap-3 animate-in fade-in slide-in-from-top-2`}
        >
          <div className="flex-shrink-0 mt-0.5">{getNotificationIcon(notification.eventType)}</div>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-white text-sm">{notification.title}</h4>
            <p className="text-sm text-slate-300 mt-1 line-clamp-2">{notification.content}</p>
            <p className="text-xs text-slate-400 mt-2">
              {new Date(notification.createdAt).toLocaleString()}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => dismissNotification(notification.id)}
            className="flex-shrink-0 hover:bg-slate-700/50"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      ))}

      {notifications.length > 3 && !showAll && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAll(true)}
          className="w-full border-slate-600 text-slate-300 hover:bg-slate-700"
        >
          Show {notifications.length - 3} more notifications
        </Button>
      )}

      {showAll && notifications.length > 3 && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAll(false)}
          className="w-full border-slate-600 text-slate-300 hover:bg-slate-700"
        >
          Show less
        </Button>
      )}
    </div>
  );
}
