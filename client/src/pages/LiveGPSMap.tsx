import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { MapView } from "@/components/Map";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, RefreshCw, AlertCircle, Loader2, Navigation, Clock } from "lucide-react";
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
  checkInLat?: number;
  checkInLng?: number;
  checkOutLat?: number;
  checkOutLng?: number;
}

interface Waypoint {
  id: number;
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: Date;
  cumulativeDistance: number;
}

export default function LiveGPSMap() {
  const { user } = useAuth();
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<Map<number, google.maps.marker.AdvancedMarkerElement>>(new Map());
  const polylineRef = useRef<Map<number, google.maps.Polyline>>(new Map());
  const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null);

  const [staffLocations, setStaffLocations] = useState<StaffLocation[]>([]);
  const [waypointsByStaff, setWaypointsByStaff] = useState<Map<number, Waypoint[]>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<number | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [showWaypoints, setShowWaypoints] = useState(true);
  const [showRoutes, setShowRoutes] = useState(true);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch staff attendance data
  const { data: liveLocations, refetch } = trpc.attendance.getStaffAttendance.useQuery(
    { userId: 0, startDate: new Date(), endDate: new Date() },
    { enabled: false }
  ) as any;

  // Fetch waypoints for a specific staff member
  const { data: waypointsData, refetch: refetchWaypoints } = trpc.attendance.getWaypoints.useQuery(
    { attendanceId: 0 },
    { enabled: false }
  ) as any;

  // Auto-refresh every 5 seconds
  useEffect(() => {
    if (autoRefresh) {
      // Initial fetch
      refetch();
      
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
    if (liveLocations && Array.isArray(liveLocations)) {
      const locations = liveLocations.map((loc: any) => {
        const status: "checked-in" | "checked-out" = loc.checkOutTime ? "checked-out" : "checked-in";
        return {
          id: loc.userId,
          name: loc.userName,
          email: loc.userEmail,
          latitude: parseFloat(loc.latitude),
          longitude: parseFloat(loc.longitude),
          accuracy: parseFloat(loc.accuracy),
          lastUpdated: new Date(loc.checkInTime),
          status,
          checkInLat: loc.checkInLat ? parseFloat(loc.checkInLat) : undefined,
          checkInLng: loc.checkInLng ? parseFloat(loc.checkInLng) : undefined,
          checkOutLat: loc.checkOutLat ? parseFloat(loc.checkOutLat) : undefined,
          checkOutLng: loc.checkOutLng ? parseFloat(loc.checkOutLng) : undefined,
        };
      });
      setStaffLocations(locations);

      // Update markers on map
      if (mapRef.current) {
        updateMapMarkers(locations);
      }
    }
  }, [liveLocations]);

  // Update map markers
  const updateMapMarkers = (locations: StaffLocation[]) => {
    if (!mapRef.current || !window.google) return;

    // Remove old markers
    markersRef.current.forEach((marker) => {
      marker.map = null;
    });
    markersRef.current.clear();

    // Add new markers
    locations.forEach((staff) => {
      const position = { lat: staff.latitude, lng: staff.longitude };
      const marker = new window.google.maps.marker.AdvancedMarkerElement({
        map: mapRef.current,
        position,
        title: staff.name,
        content: createMarkerContent(staff),
      });

      // Add click listener to show details
      marker.addListener("click", () => {
        setSelectedStaff(selectedStaff === staff.id ? null : staff.id);
        if (showWaypoints) {
          fetchAndShowWaypoints(staff.id);
        }
      });

      markersRef.current.set(staff.id, marker);
    });

    // Center map on first staff member if available
    if (locations.length > 0) {
      const firstStaff = locations[0];
      mapRef.current.setCenter({ lat: firstStaff.latitude, lng: firstStaff.longitude });
    }
  };

  // Create custom marker content
  const createMarkerContent = (staff: StaffLocation) => {
    const div = document.createElement("div");
    div.className = "flex items-center justify-center";
    
    const statusColor = staff.status === "checked-in" ? "bg-green-500" : "bg-red-500";
    const accuracyColor = staff.accuracy < 10 ? "border-green-400" : 
                         staff.accuracy < 50 ? "border-blue-400" :
                         staff.accuracy < 100 ? "border-yellow-400" : "border-red-400";

    div.innerHTML = `
      <div class="relative">
        <div class="w-10 h-10 rounded-full ${statusColor} border-4 ${accuracyColor} flex items-center justify-center shadow-lg">
          <svg class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd" />
          </svg>
        </div>
        <div class="absolute -bottom-6 left-1/2 transform -translate-x-1/2 bg-white px-2 py-1 rounded text-xs font-semibold whitespace-nowrap shadow-md">
          ${staff.name}
        </div>
      </div>
    `;
    return div;
  };

  // Fetch and display waypoints for a staff member
  const fetchAndShowWaypoints = async (staffId: number) => {
    try {
      // In a real implementation, you would fetch waypoints for the staff member's current attendance
      // For now, we'll show a route between check-in and check-out if available
      const staff = staffLocations.find((s) => s.id === staffId);
      if (!staff || !mapRef.current) return;

      // If we have check-in and check-out coordinates, draw a route
      if (staff.checkInLat && staff.checkInLng && staff.checkOutLat && staff.checkOutLng) {
        const directionsService = new window.google.maps.DirectionsService();
        if (!directionsRendererRef.current) {
          directionsRendererRef.current = new window.google.maps.DirectionsRenderer({
            map: mapRef.current,
            suppressMarkers: false,
            polylineOptions: {
              strokeColor: "#3b82f6",
              strokeWeight: 3,
              strokeOpacity: 0.7,
            },
          });
        }

        directionsService.route(
          {
            origin: { lat: staff.checkInLat, lng: staff.checkInLng },
            destination: { lat: staff.checkOutLat, lng: staff.checkOutLng },
            travelMode: window.google.maps.TravelMode.DRIVING,
          },
          (result, status) => {
            if (status === window.google.maps.DirectionsStatus.OK && directionsRendererRef.current) {
              directionsRendererRef.current.setDirections(result);
            }
          }
        );
      }
    } catch (error) {
      console.error("Error fetching waypoints:", error);
    }
  };

  // Handle manual refresh
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

  // Calculate distance using Haversine formula
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

  // Get accuracy color and label
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

  // Format time
  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  // Get time since update
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
            <div className="flex items-center justify-between flex-wrap gap-4">
              <CardTitle className="text-lg">Map Controls</CardTitle>
              <div className="flex items-center gap-3 flex-wrap">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={autoRefresh}
                    onChange={(e) => setAutoRefresh(e.target.checked)}
                    className="w-4 h-4 rounded"
                  />
                  Auto-refresh (5s)
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={showWaypoints}
                    onChange={(e) => setShowWaypoints(e.target.checked)}
                    className="w-4 h-4 rounded"
                  />
                  Show Waypoints
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={showRoutes}
                    onChange={(e) => setShowRoutes(e.target.checked)}
                    className="w-4 h-4 rounded"
                  />
                  Show Routes
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

        {/* Map Container */}
        <Card className="border-slate-200 overflow-hidden">
          <MapView
            initialCenter={{ lat: -1.2921, lng: 36.8219 }} // Nairobi center
            initialZoom={13}
            className="h-96 md:h-[500px]"
            onMapReady={(map) => {
              mapRef.current = map;
              if (staffLocations.length > 0) {
                updateMapMarkers(staffLocations);
              }
            }}
          />
        </Card>

        {/* Info Card */}
        <Card className="border-slate-200 bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-900">
                <p className="font-semibold mb-1">Real-Time Tracking Features</p>
                <ul className="space-y-1 text-xs">
                  <li>• Color-coded markers: Green (Excellent GPS), Blue (Good), Yellow (Fair), Red (Poor accuracy)</li>
                  <li>• Click on markers to view staff details and route visualization</li>
                  <li>• Routes show travel path from check-in to check-out location</li>
                  <li>• All coordinates captured with 8-decimal GPS precision</li>
                  <li>• Locations update every 5 seconds when auto-refresh is enabled</li>
                </ul>
              </div>
            </div>
          </CardContent>
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
                    onClick={() => {
                      setSelectedStaff(selectedStaff === staff.id ? null : staff.id);
                      if (showWaypoints && selectedStaff !== staff.id) {
                        fetchAndShowWaypoints(staff.id);
                      }
                    }}
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
                    <div className="flex items-center justify-between p-2 bg-slate-50 rounded mb-3">
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
                            <p className="text-slate-600 flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              Last Updated
                            </p>
                            <p className="font-semibold text-slate-900">{formatTime(staff.lastUpdated)}</p>
                          </div>
                          <div>
                            <p className="text-slate-600">Time Since Update</p>
                            <p className="font-semibold text-slate-900">{getTimeSinceUpdate(staff.lastUpdated)}</p>
                          </div>
                        </div>

                        {/* Check-in/Check-out Info */}
                        {(staff.checkInLat || staff.checkOutLat) && (
                          <div className="space-y-2">
                            <p className="text-sm text-slate-600 font-semibold flex items-center gap-1">
                              <Navigation className="w-4 h-4" />
                              Route Information
                            </p>
                            {staff.checkInLat && staff.checkInLng && (
                              <div className="text-xs bg-green-50 p-2 rounded border border-green-200">
                                <p className="font-semibold text-green-900">Check-in Location:</p>
                                <p className="text-green-800">
                                  {staff.checkInLat.toFixed(8)}, {staff.checkInLng.toFixed(8)}
                                </p>
                              </div>
                            )}
                            {staff.checkOutLat && staff.checkOutLng && (
                              <div className="text-xs bg-red-50 p-2 rounded border border-red-200">
                                <p className="font-semibold text-red-900">Check-out Location:</p>
                                <p className="text-red-800">
                                  {staff.checkOutLat.toFixed(8)}, {staff.checkOutLng.toFixed(8)}
                                </p>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Distance to other staff */}
                        {staffLocations.length > 1 && (
                          <div>
                            <p className="text-sm text-slate-600 font-semibold mb-2">Distance to other staff:</p>
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
      </div>
    </div>
  );
}
