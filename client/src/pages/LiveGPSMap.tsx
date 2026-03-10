import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, RefreshCw, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface StaffLocation {
  id: number;
  name: string;
  email: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  lastUpdated: Date;
  status: "checked-in" | "checked-out";
}

export default function LiveGPSMap() {
  const { user } = useAuth();
  const [staffLocations, setStaffLocations] = useState<StaffLocation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<number | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const { data: liveLocations, refetch } = trpc.attendance.getStaffAttendance.useQuery(
    { userId: 0, startDate: new Date(), endDate: new Date() },
    { enabled: false }
  ) as any;

  // Auto-refresh every 5 seconds
  useEffect(() => {
    if (autoRefresh) {
      refreshIntervalRef.current = setInterval(() => {
        refetch();
      }, 5000);
    }

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [autoRefresh, refetch]);

  // Update staff locations when data changes
  useEffect(() => {
    if (liveLocations) {
      setStaffLocations(
        liveLocations.map((loc: any) => ({
          id: loc.userId,
          name: loc.userName,
          email: loc.userEmail,
          latitude: parseFloat(loc.latitude),
          longitude: parseFloat(loc.longitude),
          accuracy: parseFloat(loc.accuracy),
          lastUpdated: new Date(loc.checkInTime),
          status: loc.checkOutTime ? "checked-out" : "checked-in",
        }))
      );
    }
  }, [liveLocations]);

  const handleManualRefresh = async () => {
    setIsLoading(true);
    try {
      await refetch();
      toast.success("Locations updated");
    } catch (error) {
      toast.error("Failed to refresh locations");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371; // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return (R * c).toFixed(2);
  };

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy < 10) return "bg-green-100 text-green-800";
    if (accuracy < 50) return "bg-blue-100 text-blue-800";
    if (accuracy < 100) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  const getAccuracyLabel = (accuracy: number) => {
    if (accuracy < 10) return "Excellent";
    if (accuracy < 50) return "Good";
    if (accuracy < 100) return "Fair";
    return "Poor";
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const getTimeSinceUpdate = (date: Date) => {
    const now = new Date();
    const diff = Math.floor((now.getTime() - new Date(date).getTime()) / 1000);

    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-slate-900">Live GPS Tracking</h1>
          <p className="text-slate-600">Real-time staff location monitoring with 5-second auto-refresh</p>
        </div>

        {/* Controls */}
        <Card className="border-slate-200">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Map Controls</CardTitle>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={autoRefresh}
                    onChange={(e) => setAutoRefresh(e.target.checked)}
                    className="w-4 h-4 rounded"
                  />
                  Auto-refresh (5s)
                </label>
                <Button
                  onClick={handleManualRefresh}
                  disabled={isLoading}
                  variant="outline"
                  size="sm"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600">
              Showing {staffLocations.length} staff member{staffLocations.length !== 1 ? "s" : ""} currently checked in
            </p>
          </CardContent>
        </Card>

        {/* Map Placeholder - In production, integrate Google Maps or Leaflet */}
        <Card className="border-slate-200 bg-slate-100 h-96 flex items-center justify-center">
          <div className="text-center space-y-4">
            <MapPin className="w-12 h-12 text-slate-400 mx-auto" />
            <div>
              <p className="text-slate-600 font-semibold">Live Map View</p>
              <p className="text-sm text-slate-500">
                Integrate Google Maps or Leaflet to display staff locations
              </p>
            </div>
          </div>
        </Card>

        {/* Staff Locations List */}
        <Card className="border-slate-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Staff Locations</CardTitle>
            <CardDescription>Current GPS coordinates and accuracy metrics</CardDescription>
          </CardHeader>
          <CardContent>
            {staffLocations.length > 0 ? (
              <div className="space-y-3">
                {staffLocations.map((staff) => (
                  <div
                    key={staff.id}
                    onClick={() => setSelectedStaff(selectedStaff === staff.id ? null : staff.id)}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition ${
                      selectedStaff === staff.id
                        ? "border-blue-500 bg-blue-50"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-semibold text-slate-900">{staff.name}</p>
                        <p className="text-sm text-slate-600">{staff.email}</p>
                      </div>
                      <div className="text-right">
                        <Badge
                          variant="outline"
                          className={
                            staff.status === "checked-in"
                              ? "bg-green-50 text-green-700 border-green-200"
                              : "bg-red-50 text-red-700 border-red-200"
                          }
                        >
                          {staff.status === "checked-in" ? "Checked In" : "Checked Out"}
                        </Badge>
                        <p className="text-xs text-slate-500 mt-1">{getTimeSinceUpdate(staff.lastUpdated)}</p>
                      </div>
                    </div>

                    {/* Coordinates */}
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div className="p-2 bg-slate-50 rounded">
                        <p className="text-xs text-slate-600 mb-1">Latitude</p>
                        <p className="font-mono text-sm font-semibold text-slate-900">
                          {staff.latitude.toFixed(8)}
                        </p>
                      </div>
                      <div className="p-2 bg-slate-50 rounded">
                        <p className="text-xs text-slate-600 mb-1">Longitude</p>
                        <p className="font-mono text-sm font-semibold text-slate-900">
                          {staff.longitude.toFixed(8)}
                        </p>
                      </div>
                    </div>

                    {/* Accuracy */}
                    <div className="flex items-center justify-between p-2 bg-slate-50 rounded">
                      <div>
                        <p className="text-xs text-slate-600">Accuracy</p>
                        <p className="font-semibold text-slate-900">{staff.accuracy.toFixed(2)} m</p>
                      </div>
                      <Badge className={getAccuracyColor(staff.accuracy)}>
                        {getAccuracyLabel(staff.accuracy)}
                      </Badge>
                    </div>

                    {/* Expanded Details */}
                    {selectedStaff === staff.id && (
                      <div className="mt-4 pt-4 border-t border-slate-200 space-y-3">
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <p className="text-slate-600">Last Updated</p>
                            <p className="font-semibold text-slate-900">{formatTime(staff.lastUpdated)}</p>
                          </div>
                          <div>
                            <p className="text-slate-600">Time Since Update</p>
                            <p className="font-semibold text-slate-900">{getTimeSinceUpdate(staff.lastUpdated)}</p>
                          </div>
                        </div>

                        {/* Distance to first staff member */}
                        {staffLocations.length > 1 && (
                          <div>
                            <p className="text-sm text-slate-600 mb-2">Distance to other staff:</p>
                            <div className="space-y-1">
                              {staffLocations
                                .filter((s) => s.id !== staff.id)
                                .slice(0, 3)
                                .map((other) => (
                                  <p key={other.id} className="text-sm text-slate-700">
                                    {other.name}:{" "}
                                    {calculateDistance(
                                      staff.latitude,
                                      staff.longitude,
                                      other.latitude,
                                      other.longitude
                                    )}{" "}
                                    km
                                  </p>
                                ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-slate-600 py-8">No staff members currently checked in</p>
            )}
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="border-slate-200 bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-900">
                <p className="font-semibold mb-1">Real-Time Tracking</p>
                <p>
                  Staff locations update every 5 seconds when auto-refresh is enabled. All coordinates are captured
                  with 8-decimal GPS precision. Distance calculations use the Haversine formula for accuracy.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
