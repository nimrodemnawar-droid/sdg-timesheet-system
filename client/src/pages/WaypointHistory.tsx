import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  MapPin,
  Calendar,
  Clock,
  Navigation,
  Download,
  Filter,
  ChevronDown,
  ChevronUp,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

interface WaypointRecord {
  id: number;
  attendanceId: number;
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: Date;
  cumulativeDistance: number;
  altitude?: number;
}

interface AttendanceWithWaypoints {
  id: number;
  date: Date;
  checkInTime: Date;
  checkOutTime?: Date;
  checkInAddress?: string;
  checkOutAddress?: string;
  waypoints: WaypointRecord[];
  totalDistance?: number;
}

export default function WaypointHistory() {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [expandedAttendance, setExpandedAttendance] = useState<number | null>(null);
  const [filterDistance, setFilterDistance] = useState<"all" | "short" | "medium" | "long">("all");

  // Query for attendance records with waypoints
  const { data: attendanceRecords, isLoading, refetch } = trpc.waypoints.getHistory.useQuery(
    {
      startDate: selectedDate,
      endDate: new Date(new Date(selectedDate).getTime() + 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    },
    { enabled: !!selectedDate }
  );

  const formatTime = (date: Date | string) => {
    return new Date(date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
  };

  const formatDistance = (km: number) => {
    if (km < 1) {
      return `${(km * 1000).toFixed(0)}m`;
    }
    return `${km.toFixed(2)}km`;
  };

  const calculateDuration = (startTime: Date, endTime?: Date) => {
    if (!endTime) return "In progress";
    const diff = new Date(endTime).getTime() - new Date(startTime).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  const getDistanceCategory = (distance: number) => {
    if (distance < 1) return "short";
    if (distance < 5) return "medium";
    return "long";
  };

  const filteredRecords = attendanceRecords?.filter((record: any) => {
    if (filterDistance === "all") return true;
    const category = getDistanceCategory(record.totalDistance || 0);
    return category === filterDistance;
  });

  const handleExportCSV = () => {
    if (!filteredRecords || filteredRecords.length === 0) {
      toast.error("No records to export");
      return;
    }

    let csv = "Date,Check-in Time,Check-out Time,Duration,Waypoints,Total Distance,Avg Accuracy\n";

    filteredRecords.forEach((record: any) => {
      const duration = calculateDuration(record.checkInTime, record.checkOutTime);
      const waypoints = record.waypoints?.length || 0;
      const totalDistance = formatDistance(record.totalDistance || 0);
      const avgAccuracy = record.waypoints && record.waypoints.length > 0
        ? (record.waypoints.reduce((sum: number, wp: any) => sum + parseFloat(wp.accuracy), 0) / record.waypoints.length).toFixed(2)
        : "N/A";

      csv += `"${formatDate(record.date)}","${formatTime(record.checkInTime)}","${record.checkOutTime ? formatTime(record.checkOutTime) : "N/A"}","${duration}","${waypoints}","${totalDistance}","${avgAccuracy}"\n`;

      // Add waypoint details
      if (record.waypoints && record.waypoints.length > 0) {
        record.waypoints.forEach((wp: any, index: number) => {
          csv += `,"","","Waypoint ${index + 1}","${formatTime(wp.timestamp)}","${wp.latitude.toFixed(8)}, ${wp.longitude.toFixed(8)}","${wp.accuracy.toFixed(2)}m"\n`;
        });
      }
    });

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `waypoint-history-${selectedDate}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    toast.success("CSV exported successfully");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Waypoint History</h1>
        <p className="text-gray-600 mt-2">View and analyze your logged waypoints and field locations</p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">Date</label>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">Distance Range</label>
              <Select value={filterDistance} onValueChange={(value: any) => setFilterDistance(value)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Distances</SelectItem>
                  <SelectItem value="short">Short (&lt;1km)</SelectItem>
                  <SelectItem value="medium">Medium (1-5km)</SelectItem>
                  <SelectItem value="long">Long (&gt;5km)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end gap-2">
              <Button onClick={() => refetch()} variant="outline" className="flex-1">
                <Filter className="w-4 h-4 mr-2" />
                Apply Filters
              </Button>
              <Button onClick={handleExportCSV} variant="outline" className="flex-1">
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loading State */}
      {isLoading && (
        <Card>
          <CardContent className="pt-12 pb-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-4" />
            <p className="text-gray-600">Loading waypoint records...</p>
          </CardContent>
        </Card>
      )}

      {/* Records */}
      {!isLoading && filteredRecords && filteredRecords.length > 0 && (
        <div className="space-y-4">
          {filteredRecords.map((record: any) => (
            <Card key={record.id} className="hover:shadow-lg transition-shadow">
              <div
                className="cursor-pointer p-6"
                onClick={() =>
                  setExpandedAttendance(expandedAttendance === record.id ? null : record.id)
                }
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Calendar className="w-5 h-5 text-blue-600" />
                      <h3 className="text-lg font-semibold text-gray-900">
                        {formatDate(record.date)}
                      </h3>
                      <Badge variant="outline" className="ml-auto">
                        {record.waypoints?.length || 0} waypoints
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                      <div>
                        <p className="text-sm text-gray-600">Check-in</p>
                        <p className="font-semibold text-gray-900">{formatTime(record.checkInTime)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Check-out</p>
                        <p className="font-semibold text-gray-900">
                          {record.checkOutTime ? formatTime(record.checkOutTime) : "N/A"}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Duration</p>
                        <p className="font-semibold text-gray-900">
                          {calculateDuration(record.checkInTime, record.checkOutTime)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Distance</p>
                        <p className="font-semibold text-green-600">
                          {formatDistance(record.totalDistance || 0)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="ml-4">
                    {expandedAttendance === record.id ? (
                      <ChevronUp className="w-6 h-6 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-6 h-6 text-gray-400" />
                    )}
                  </div>
                </div>
              </div>

              {/* Expanded Details */}
              {expandedAttendance === record.id && (
                <div className="border-t border-gray-200 p-6 bg-gray-50">
                  {record.waypoints && record.waypoints.length > 0 ? (
                    <div className="space-y-4">
                      <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                        <Navigation className="w-5 h-5 text-blue-600" />
                        Waypoints ({record.waypoints.length})
                      </h4>

                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {record.waypoints.map((waypoint: any, index: number) => (
                          <div
                            key={waypoint.id}
                            className="p-4 bg-white rounded-lg border border-gray-200 hover:border-blue-300 transition-colors"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <Badge className="bg-blue-100 text-blue-700 font-bold">
                                  {index + 1}
                                </Badge>
                                <Clock className="w-4 h-4 text-gray-500" />
                                <span className="font-semibold text-gray-900">
                                  {formatTime(waypoint.timestamp)}
                                </span>
                              </div>
                              <Badge variant="outline" className="text-xs">
                                {waypoint.accuracy.toFixed(1)}m accuracy
                              </Badge>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                              <div>
                                <p className="text-gray-600">Latitude</p>
                                <p className="font-mono text-xs text-gray-900">
                                  {waypoint.latitude.toFixed(8)}
                                </p>
                              </div>
                              <div>
                                <p className="text-gray-600">Longitude</p>
                                <p className="font-mono text-xs text-gray-900">
                                  {waypoint.longitude.toFixed(8)}
                                </p>
                              </div>
                              <div>
                                <p className="text-gray-600">Distance</p>
                                <p className="font-semibold text-gray-900">
                                  {formatDistance(waypoint.cumulativeDistance)}
                                </p>
                              </div>
                              {waypoint.altitude && (
                                <div>
                                  <p className="text-gray-600">Altitude</p>
                                  <p className="font-semibold text-gray-900">
                                    {waypoint.altitude.toFixed(1)}m
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-600">No waypoints logged for this day</p>
                    </div>
                  )}

                  {/* Location Information */}
                  {(record.checkInAddress || record.checkOutAddress) && (
                    <div className="mt-6 pt-6 border-t border-gray-200 space-y-3">
                      <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                        <MapPin className="w-5 h-5 text-blue-600" />
                        Location Information
                      </h4>
                      {record.checkInAddress && (
                        <div>
                          <p className="text-sm text-gray-600">Check-in Location</p>
                          <p className="text-gray-900">{record.checkInAddress}</p>
                        </div>
                      )}
                      {record.checkOutAddress && (
                        <div>
                          <p className="text-sm text-gray-600">Check-out Location</p>
                          <p className="text-gray-900">{record.checkOutAddress}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && (!filteredRecords || filteredRecords.length === 0) && (
        <Card className="border-dashed">
          <CardContent className="pt-12 pb-12 text-center">
            <Navigation className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 text-lg">No waypoint records found</p>
            <p className="text-gray-500 text-sm mt-2">
              Try adjusting your filters or select a different date
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
