import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { getLocationWithFallback, formatGeolocationError } from "@/lib/geolocation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapView } from "@/components/Map";
import {
  MapPin,
  Navigation,
  Clock,
  Zap,
  Trash2,
  Eye,
  AlertCircle,
  Loader2,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

interface WaypointData {
  id: number;
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: Date;
  cumulativeDistance: number;
  altitude?: number;
  address?: string;
}

interface WaypointTrackerProps {
  attendanceId: number;
  isCheckedIn: boolean;
  isCheckedOut: boolean;
}

export function WaypointTracker({ attendanceId, isCheckedIn, isCheckedOut }: WaypointTrackerProps) {
  const { user } = useAuth();
  const [waypoints, setWaypoints] = useState<WaypointData[]>([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const [selectedWaypoint, setSelectedWaypoint] = useState<WaypointData | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [totalDistance, setTotalDistance] = useState(0);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<Map<number, google.maps.marker.AdvancedMarkerElement>>(new Map());
  const polylineRef = useRef<google.maps.Polyline | null>(null);

  // Queries
  const { data: waypointsList, refetch: refetchWaypoints } = trpc.attendance.getWaypoints.useQuery(
    { attendanceId },
    { enabled: !!attendanceId, refetchInterval: 5000 }
  );

  // Mutations
  const addWaypointMutation = trpc.attendance.addWaypoint.useMutation();

  // Update waypoints when data changes
  useEffect(() => {
    if (waypointsList) {
      const formattedWaypoints = waypointsList.map((wp: any) => ({
        id: wp.id,
        latitude: parseFloat(wp.latitude),
        longitude: parseFloat(wp.longitude),
        accuracy: parseFloat(wp.accuracy || 0),
        timestamp: new Date(wp.timestamp),
        cumulativeDistance: parseFloat(wp.cumulativeDistance || 0),
        altitude: wp.altitude ? parseFloat(wp.altitude) : undefined,
      }));
      setWaypoints(formattedWaypoints);

      // Calculate total distance
      if (formattedWaypoints.length > 0) {
        const lastWaypoint = formattedWaypoints[formattedWaypoints.length - 1];
        setTotalDistance(lastWaypoint.cumulativeDistance);
      }
    }
  }, [waypointsList]);

  // Capture current location as waypoint
  const handleCaptureWaypoint = async () => {
    if (!isCheckedIn || isCheckedOut) {
      toast.error("You must be checked in to add waypoints");
      return;
    }

    setIsCapturing(true);
    try {
      // Show info toast while acquiring location
      toast.loading("Acquiring location (GPS with IP fallback)...", { id: "location-acquiring" });

      try {
        // Use GPS with IP fallback
        const location = await getLocationWithFallback(30000);

        try {
          await addWaypointMutation.mutateAsync({
            attendanceId,
            latitude: location.latitude,
            longitude: location.longitude,
            accuracy: location.accuracy,
            timestamp: location.timestamp,
          });

          const sourceLabel = location.source === 'gps' ? 'GPS' : location.source === 'ip' ? 'IP-based' : 'Fallback';
          toast.success(`Waypoint captured successfully (${sourceLabel})`);
          setLastUpdateTime(new Date());
          await refetchWaypoints();
          toast.dismiss("location-acquiring");

          // Invalidate cache for real-time updates
          await trpc.useUtils().attendance.getWaypoints.invalidate({ attendanceId });
        } catch (error) {
          toast.dismiss("location-acquiring");
          toast.error("Failed to save waypoint");
          console.error(error);
        } finally {
          setIsCapturing(false);
        }
      } catch (locationError) {
        toast.dismiss("location-acquiring");
        const errorMessage = locationError instanceof Error 
          ? formatGeolocationError(locationError)
          : "Failed to acquire location";
        toast.error(errorMessage);
        setIsCapturing(false);
      }
    } catch (error) {
      toast.dismiss("location-acquiring");
      toast.error("Failed to capture waypoint");
      console.error(error);
      setIsCapturing(false);
    }
  };

  // Handle map ready
  const handleMapReady = (map: google.maps.Map) => {
    mapRef.current = map;

    if (waypoints.length === 0) return;

    // Clear existing markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current.clear();

    // Add waypoint markers
    waypoints.forEach((waypoint, index) => {
      const marker = new google.maps.marker.AdvancedMarkerElement({
        map,
        position: { lat: waypoint.latitude, lng: waypoint.longitude },
        title: `Waypoint ${index + 1}`,
        content: createMarkerContent(index + 1, waypoint),
      });

      marker.addEventListener("click", () => {
        setSelectedWaypoint(waypoint);
      });

      markersRef.current.set(waypoint.id, marker);
    });

    // Draw polyline connecting waypoints
    if (polylineRef.current) {
      polylineRef.current.setMap(null);
    }

    const path = waypoints.map((wp) => ({
      lat: wp.latitude,
      lng: wp.longitude,
    }));

    polylineRef.current = new google.maps.Polyline({
      path,
      geodesic: true,
      strokeColor: "#3b82f6",
      strokeOpacity: 0.7,
      strokeWeight: 3,
      map,
    });

    // Fit bounds to show all waypoints
    if (waypoints.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      waypoints.forEach((wp) => {
        bounds.extend({ lat: wp.latitude, lng: wp.longitude });
      });
      map.fitBounds(bounds, 100);
    }
  };

  const createMarkerContent = (index: number, waypoint: WaypointData) => {
    const div = document.createElement("div");
    div.className = "flex items-center justify-center w-8 h-8 bg-blue-500 rounded-full border-2 border-white shadow-lg cursor-pointer";
    div.innerHTML = `<span class="text-white text-xs font-bold">${index}</span>`;
    return div;
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const formatDistance = (km: number) => {
    if (km < 1) {
      return `${(km * 1000).toFixed(0)}m`;
    }
    return `${km.toFixed(2)}km`;
  };

  const calculateTimeDifference = (current: Date, previous: Date) => {
    const diff = new Date(current).getTime() - new Date(previous).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    return `${minutes}m`;
  };

  return (
    <div className="space-y-4">
      {/* Capture Button */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Navigation className="w-5 h-5 text-blue-600" />
                Waypoint Tracking
              </CardTitle>
              <CardDescription>Log your intermediate locations during the day</CardDescription>
            </div>
            <Button
              onClick={handleCaptureWaypoint}
              disabled={!isCheckedIn || isCheckedOut || isCapturing}
              className="gap-2"
            >
              {isCapturing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Capturing...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  Capture Location
                </>
              )}
            </Button>
          </div>
        </CardHeader>

        {!isCheckedIn && (
          <CardContent>
            <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-100 p-3 rounded-md">
              <AlertCircle className="w-4 h-4" />
              Check in first to start tracking waypoints
            </div>
          </CardContent>
        )}

        {isCheckedOut && (
          <CardContent>
            <div className="flex items-center gap-2 text-sm text-red-700 bg-red-100 p-3 rounded-md">
              <XCircle className="w-4 h-4" />
              You have checked out. No more waypoints can be added.
            </div>
          </CardContent>
        )}
      </Card>

      {/* Statistics */}
      {waypoints.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">{waypoints.length}</div>
                <div className="text-sm text-gray-600 mt-1">Waypoints Logged</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">{formatDistance(totalDistance)}</div>
                <div className="text-sm text-gray-600 mt-1">Total Distance</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600">
                  {waypoints.length > 0 ? formatDistance(totalDistance / waypoints.length) : "0m"}
                </div>
                <div className="text-sm text-gray-600 mt-1">Avg Distance/Waypoint</div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Map View Toggle */}
      {waypoints.length > 0 && (
        <div className="flex gap-2">
          <Button
            variant={showMap ? "default" : "outline"}
            onClick={() => setShowMap(!showMap)}
            className="gap-2"
          >
            <Eye className="w-4 h-4" />
            {showMap ? "Hide Map" : "View Map"}
          </Button>
        </div>
      )}

      {/* Map */}
      {showMap && waypoints.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Waypoint Route Map</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-96 rounded-lg overflow-hidden border border-gray-200">
              <MapView
                onMapReady={handleMapReady}
                initialCenter={{
                  lat: waypoints[0]?.latitude || 0,
                  lng: waypoints[0]?.longitude || 0,
                }}
                initialZoom={15}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Waypoint Details */}
      {selectedWaypoint && (
        <Card className="border-blue-300 bg-blue-50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Waypoint Details</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedWaypoint(null)}
              >
                ✕
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-600">Time</div>
                <div className="font-semibold">{formatTime(selectedWaypoint.timestamp)}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Accuracy</div>
                <div className="font-semibold">{selectedWaypoint.accuracy.toFixed(1)}m</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Latitude</div>
                <div className="font-mono text-sm">{selectedWaypoint.latitude.toFixed(8)}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Longitude</div>
                <div className="font-mono text-sm">{selectedWaypoint.longitude.toFixed(8)}</div>
              </div>
              {selectedWaypoint.altitude && (
                <div>
                  <div className="text-sm text-gray-600">Altitude</div>
                  <div className="font-semibold">{selectedWaypoint.altitude.toFixed(1)}m</div>
                </div>
              )}
              <div>
                <div className="text-sm text-gray-600">Distance</div>
                <div className="font-semibold">{formatDistance(selectedWaypoint.cumulativeDistance)}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Waypoints List */}
      {waypoints.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Waypoint History</CardTitle>
            <CardDescription>{waypoints.length} waypoints logged today</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {waypoints.map((waypoint, index) => {
                const previousWaypoint = index > 0 ? waypoints[index - 1] : null;
                const timeDiff = previousWaypoint
                  ? calculateTimeDifference(waypoint.timestamp, previousWaypoint.timestamp)
                  : null;

                return (
                  <div
                    key={waypoint.id}
                    onClick={() => setSelectedWaypoint(waypoint)}
                    className="p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="flex items-center justify-center w-8 h-8 bg-blue-500 text-white rounded-full font-bold text-sm">
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-gray-500" />
                            <span className="font-semibold">{formatTime(waypoint.timestamp)}</span>
                            {timeDiff && (
                              <Badge variant="outline" className="text-xs">
                                +{timeDiff}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                            <MapPin className="w-4 h-4" />
                            <span>
                              {waypoint.latitude.toFixed(6)}, {waypoint.longitude.toFixed(6)}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            Distance: {formatDistance(waypoint.cumulativeDistance)} • Accuracy: {waypoint.accuracy.toFixed(1)}m
                          </div>
                        </div>
                      </div>
                      <Badge className="bg-blue-100 text-blue-700">
                        <Eye className="w-3 h-3 mr-1" />
                        View
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {waypoints.length === 0 && isCheckedIn && !isCheckedOut && (
        <Card className="border-dashed">
          <CardContent className="pt-12 pb-12 text-center">
            <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">No waypoints logged yet</p>
            <p className="text-sm text-gray-500">
              Click "Capture Location" to start logging your intermediate locations
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
