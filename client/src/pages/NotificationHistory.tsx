import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Bell,
  CheckCircle,
  AlertCircle,
  Clock,
  Archive,
  Trash2,
  Search,
  Filter,
} from "lucide-react";
import { toast } from "sonner";

interface NotificationItem {
  id: number;
  title: string;
  content: string;
  eventType: string;
  deliveryStatus: string;
  channels: { inApp: boolean; email: boolean; push: boolean };
  readAt?: string;
  archivedAt?: string;
  createdAt: string;
}

export default function NotificationHistory() {
  const [searchTerm, setSearchTerm] = useState("");
  const [eventTypeFilter, setEventTypeFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState("newest");

  // Fetch notification history
  const { data: notificationsData = [], isLoading } = trpc.notificationPreferences.getHistory.useQuery(
    undefined,
    { refetchInterval: 5000 }
  );
  // TODO: Implement filtering for eventType and deliveryStatus on the client side

  const notifications = Array.isArray(notificationsData) ? notificationsData : [];

  // Filter and search
  const filteredNotifications = notifications
    .filter((n: NotificationItem) =>
      n.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      n.content.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a: NotificationItem, b: NotificationItem) => {
      if (sortBy === "newest") {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      } else if (sortBy === "oldest") {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      return 0;
    });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "DELIVERED":
        return "bg-green-500/20 text-green-400 border-green-500/30";
      case "SENT":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "PENDING":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      case "FAILED":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      default:
        return "bg-slate-500/20 text-slate-400 border-slate-500/30";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "DELIVERED":
        return <CheckCircle className="w-4 h-4" />;
      case "SENT":
        return <Bell className="w-4 h-4" />;
      case "PENDING":
        return <Clock className="w-4 h-4" />;
      case "FAILED":
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <Bell className="w-4 h-4" />;
    }
  };

  const getEventTypeColor = (eventType: string) => {
    switch (eventType) {
      case "CHECK_IN":
        return "bg-green-500/20 text-green-400";
      case "CHECK_OUT":
        return "bg-blue-500/20 text-blue-400";
      case "LEAVE_APPROVAL":
        return "bg-purple-500/20 text-purple-400";
      case "OVERTIME_ALERT":
        return "bg-orange-500/20 text-orange-400";
      case "SYSTEM":
        return "bg-slate-500/20 text-slate-400";
      default:
        return "bg-slate-500/20 text-slate-400";
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const stats = {
    total: notifications.length,
    delivered: notifications.filter((n: NotificationItem) => n.deliveryStatus === "DELIVERED").length,
    failed: notifications.filter((n: NotificationItem) => n.deliveryStatus === "FAILED").length,
    pending: notifications.filter((n: NotificationItem) => n.deliveryStatus === "PENDING").length,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <Bell className="w-8 h-8 text-blue-400" />
            <h1 className="text-4xl font-bold text-white">Notification History</h1>
          </div>
          <p className="text-slate-300">View all sent notifications and their delivery status</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-slate-400 text-sm mb-2">Total Notifications</p>
                <p className="text-3xl font-bold text-white">{stats.total}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-green-900/30 border-green-700/50">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-green-300 text-sm mb-2">Delivered</p>
                <p className="text-3xl font-bold text-green-400">{stats.delivered}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-yellow-900/30 border-yellow-700/50">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-yellow-300 text-sm mb-2">Pending</p>
                <p className="text-3xl font-bold text-yellow-400">{stats.pending}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-red-900/30 border-red-700/50">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-red-300 text-sm mb-2">Failed</p>
                <p className="text-3xl font-bold text-red-400">{stats.failed}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white text-lg flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filters & Search
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search notifications..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-slate-700 border-slate-600 text-white placeholder-slate-400"
                />
              </div>

              <Select value={eventTypeFilter || ""} onValueChange={(value) => setEventTypeFilter(value || null)}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue placeholder="All Event Types" />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600">
                  <SelectItem value="">All Event Types</SelectItem>
                  <SelectItem value="CHECK_IN">Check-In</SelectItem>
                  <SelectItem value="CHECK_OUT">Check-Out</SelectItem>
                  <SelectItem value="LEAVE_APPROVAL">Leave Approval</SelectItem>
                  <SelectItem value="OVERTIME_ALERT">Overtime Alert</SelectItem>
                  <SelectItem value="SYSTEM">System</SelectItem>
                </SelectContent>
              </Select>

              <Select value={statusFilter || ""} onValueChange={(value) => setStatusFilter(value || null)}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600">
                  <SelectItem value="">All Statuses</SelectItem>
                  <SelectItem value="DELIVERED">Delivered</SelectItem>
                  <SelectItem value="SENT">Sent</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="FAILED">Failed</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600">
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="oldest">Oldest First</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Notifications List */}
        <div className="space-y-3">
          {isLoading ? (
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="pt-6">
                <p className="text-slate-400 text-center">Loading notifications...</p>
              </CardContent>
            </Card>
          ) : filteredNotifications.length === 0 ? (
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="pt-6">
                <p className="text-slate-400 text-center">No notifications found</p>
              </CardContent>
            </Card>
          ) : (
            filteredNotifications.map((notification: NotificationItem) => (
              <Card
                key={notification.id}
                className={`bg-slate-800 border-slate-700 hover:border-slate-600 transition-all ${
                  notification.readAt ? "opacity-75" : "border-blue-500/50"
                }`}
              >
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <Badge className={getEventTypeColor(notification.eventType)}>
                          {notification.eventType.replace(/_/g, " ")}
                        </Badge>
                        <Badge className={`${getStatusColor(notification.deliveryStatus)} flex items-center gap-1`}>
                          {getStatusIcon(notification.deliveryStatus)}
                          {notification.deliveryStatus}
                        </Badge>
                      </div>

                      <h3 className="text-white font-semibold text-lg mb-1">{notification.title}</h3>
                      <p className="text-slate-300 text-sm mb-3 line-clamp-2">{notification.content}</p>

                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
                        <span>{formatDate(notification.createdAt)}</span>
                        <div className="flex items-center gap-2">
                          {notification.channels.inApp && (
                            <Badge variant="outline" className="text-blue-300 border-blue-500/30">
                              In-App
                            </Badge>
                          )}
                          {notification.channels.email && (
                            <Badge variant="outline" className="text-green-300 border-green-500/30">
                              Email
                            </Badge>
                          )}
                          {notification.channels.push && (
                            <Badge variant="outline" className="text-purple-300 border-purple-500/30">
                              Push
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-slate-400 hover:text-slate-200"
                        onClick={() => toast.info("Archive functionality coming soon")}
                      >
                        <Archive className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
