import React, { useState, useEffect, useRef } from "react";
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
  const [showCheckInMarkers, setShowCheckInMarkers] = useState(true);
  const [showCheckOutMarkers, setShowCheckOutMarkers] = useState(true);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch all staff
  const { data: allStaff } = trpc.users.getAll.useQuery() as any;

  // Fetch attendance for a specific user
  const fetchAttendanceForStaff = async (userId: number) => {
    try {
      const today = new Date();
      const startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
      
      // Use the trpc query to fetch attendance
      const response = await fetch(
        `/api/trpc/attendance.getStaffAttendance?input=${encodeURIComponent(
          JSON.stringify({ userId, startDate: startDate.toISOString(), endDate: endDate.toISOString() })
        )}`
      );
      
      if (!response.ok) return null;
      const data = await response.json();
      return data.result?.data || null;
    } catch (error) {
      console.error("Error fetching attendance:", error);
      return null;
    }
  };

  // Fetch all staff attendance data
  const fetchAllStaffLocations = async () => {
    if (!allStaff || allStaff.length === 0) return;

    setIsLoading(true);
    try {
      const locations: StaffLocation[] = [];

      for (const staff of allStaff) {
        const attendanceData = await fetchAttendanceForStaff(staff.id);
        
        if (attendanceData && Array.isArray(attendanceData) && attendanceData.length > 0) {
          const latest = attendanceData[attendanceData.length - 1];
          const status: "checked-in" | "checked-out" = latest.checkOutTime ? "checked-out" : "checked-in";
          
          locations.push({
            id: staff.id,
            name: staff.name || "Unknown",
            email: staff.email || "",
            latitude: parseFloat(latest.checkInLat || "-1.2921"),
            longitude: parseFloat(latest.checkInLng || "36.8219"),
            accuracy: parseFloat(latest.checkInAccuracy || "10"),
            lastUpdated: new Date(latest.checkInTime),
            status,
            checkInLat: latest.checkInLat ? parseFloat(latest.checkInLat) : undefined,
            checkInLng: latest.checkInLng ? parseFloat(latest.checkInLng) : undefined,
            checkOutLat: latest.checkOutLat ? parseFloat(latest.checkOutLat) : undefined,
            checkOutLng: latest.checkOutLng ? parseFloat(latest.checkOutLng) : undefined,
          });
        }
      }

      setStaffLocations(locations);

      // Update markers on map
      if (mapRef.current && locations.length > 0) {
        updateMapMarkers(locations);
      }
    } catch (error) {
      console.error("Error fetching staff locations:", error);
      toast.error("Failed to fetch staff locations");
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-refresh every 5 seconds
  useEffect(() => {
    if (autoRefresh) {
      // Initial fetch
      fetchAllStaffLocations();

      refreshIntervalRef.current = setInterval(() => {
        fetchAllStaffLocations();
      }, 5000);
    }

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [autoRefresh, allStaff]);

  // Update map markers
  const updateMapMarkers = (locations: StaffLocation[]) => {
    if (!mapRef.current || !window.google) return;

    // Remove old markers
    markersRef.current.forEach((marker) => {
      marker.map = null;
    });
    markersRef.current.clear();

    // Remove old polylines
    polylineRef.current.forEach((polyline) => {
      polyline.setMap(null);
    });
    polylineRef.current.clear();

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
        if (showWaypoints && selectedStaff !== staff.id) {
          fetchAndShowWaypoints(staff.id);
        }
      });

      markersRef.current.set(staff.id, marker);

      // Add check-in location marker
      addCheckInMarker(staff);

      // Add check-out location marker
      addCheckOutMarker(staff);
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
    const accuracyColor =
      staff.accuracy < 10
        ? "border-green-400"
        : staff.accuracy < 50
        ? "border-blue-400"
        : staff.accuracy < 100
        ? "border-yellow-400"
        : "border-red-400";

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

  // Add check-in location marker
  const addCheckInMarker = (staff: StaffLocation) => {
    if (!showCheckInMarkers || !mapRef.current || !window.google || !staff.checkInLat || !staff.checkInLng) return;

    const checkInPosition = { lat: staff.checkInLat, lng: staff.checkInLng };
    const checkInMarker = new window.google.maps.marker.AdvancedMarkerElement({
      map: mapRef.current,
      position: checkInPosition,
      title: `${staff.name} - Check In Location`,
      content: createCheckInMarkerContent(staff),
    });

    const infoWindow = new window.google.maps.InfoWindow({
      content: `
        <div style="background: white; padding: 12px; border-radius: 6px; max-width: 280px; font-family: Arial, sans-serif;">
          <h3 style="font-weight: bold; color: #1f2937; margin: 0 0 6px 0; font-size: 14px;">${staff.name}</h3>
          <p style="color: #4b5563; font-size: 12px; margin: 0 0 6px 0;">Check-in Location</p>
          <p style="color: #6b7280; font-size: 11px; margin: 2px 0;">Time: ${formatTime(staff.lastUpdated)}</p>
          <p style="color: #6b7280; font-size: 11px; margin: 2px 0;">Accuracy: ${staff.accuracy.toFixed(1)}m</p>
          <p style="color: #6b7280; font-size: 11px; margin: 2px 0;">Lat: ${staff.checkInLat.toFixed(8)}</p>
          <p style="color: #6b7280; font-size: 11px; margin: 2px 0;">Lng: ${staff.checkInLng.toFixed(8)}</p>
        </div>
      `,
    });

    checkInMarker.addListener("click", () => {
      infoWindow.open(mapRef.current, checkInMarker);
    });
  };

  // Create check-in marker content
  const createCheckInMarkerContent = (staff: StaffLocation) => {
    const div = document.createElement("div");
    div.innerHTML = `
      <div style="width: 32px; height: 32px; background: #3b82f6; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;">
        <svg style="width: 16px; height: 16px; color: white;" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd" />
        </svg>
      </div>
    `;
    return div;
  };

  // Add check-out location marker
  const addCheckOutMarker = (staff: StaffLocation) => {
    if (!showCheckOutMarkers || !mapRef.current || !window.google || !staff.checkOutLat || !staff.checkOutLng) return;

    const checkOutPosition = { lat: staff.checkOutLat, lng: staff.checkOutLng };
    const checkOutMarker = new window.google.maps.marker.AdvancedMarkerElement({
      map: mapRef.current,
      position: checkOutPosition,
      title: `${staff.name} - Check Out Location`,
      content: createCheckOutMarkerContent(staff),
    });

    const infoWindow = new window.google.maps.InfoWindow({
      content: `
        <div style="background: white; padding: 12px; border-radius: 6px; max-width: 280px; font-family: Arial, sans-serif;">
          <h3 style="font-weight: bold; color: #1f2937; margin: 0 0 6px 0; font-size: 14px;">${staff.name}</h3>
          <p style="color: #4b5563; font-size: 12px; margin: 0 0 6px 0;">Check-out Location</p>
          <p style="color: #6b7280; font-size: 11px; margin: 2px 0;">Time: ${formatTime(staff.lastUpdated)}</p>
          <p style="color: #6b7280; font-size: 11px; margin: 2px 0;">Accuracy: ${staff.accuracy.toFixed(1)}m</p>
          <p style="color: #6b7280; font-size: 11px; margin: 2px 0;">Lat: ${staff.checkOutLat.toFixed(8)}</p>
          <p style="color: #6b7280; font-size: 11px; margin: 2px 0;">Lng: ${staff.checkOutLng.toFixed(8)}</p>
        </div>
      `,
    });

    checkOutMarker.addListener("click", () => {
      infoWindow.open(mapRef.current, checkOutMarker);
    });
  };

  // Create check-out marker content
  const createCheckOutMarkerContent = (staff: StaffLocation) => {
    const div = document.createElement("div");
    div.innerHTML = `
      <div style="width: 32px; height: 32px; background: #ef4444; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;">
        <svg style="width: 16px; height: 16px; color: white;" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd" />
        </svg>
      </div>
    `;
    return div;
  };

  // Fetch and display waypoints for a staff member
  const fetchAndShowWaypoints = async (staffId: number) => {
    try {
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

  // Manual refresh handler
  const handleManualRefresh = async () => {
    await fetchAllStaffLocations();
    toast.success("Locations refreshed");
  };

  // Calculate distance between two coordinates
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <MapPin className="w-8 h-8 text-blue-400" />
            <h1 className="text-4xl font-bold text-white">Live GPS Tracking</h1>
          </div>
          <p className="text-slate-300">Real-time staff location monitoring with 5-second auto-refresh</p>
        </div>

        {/* Controls */}
        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <CardTitle className="text-white text-lg">Map Controls</CardTitle>
              <div className="flex items-center gap-3 flex-wrap">
                <label className="flex items-center gap-2 text-sm text-slate-300">
                  <input
                    type="checkbox"
                    checked={autoRefresh}
                    onChange={(e) => setAutoRefresh(e.target.checked)}
                    className="w-4 h-4 rounded"
                  />
                  Auto-refresh (5s)
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-300">
                  <input
                    type="checkbox"
                    checked={showWaypoints}
                    onChange={(e) => setShowWaypoints(e.target.checked)}
                    className="w-4 h-4 rounded"
                  />
                  Show Waypoints
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-300">
                  <input
                    type="checkbox"
                    checked={showRoutes}
                    onChange={(e) => setShowRoutes(e.target.checked)}
                    className="w-4 h-4 rounded"
                  />
                  Show Routes
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-300">
                  <input
                    type="checkbox"
                    checked={showCheckInMarkers}
                    onChange={(e) => setShowCheckInMarkers(e.target.checked)}
                    className="w-4 h-4 rounded"
                  />
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 bg-blue-500 rounded-full border border-white"></span>
                    Check-in
                  </span>
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-300">
                  <input
                    type="checkbox"
                    checked={showCheckOutMarkers}
                    onChange={(e) => setShowCheckOutMarkers(e.target.checked)}
                    className="w-4 h-4 rounded"
                  />
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 bg-red-500 rounded-full border border-white"></span>
                    Check-out
                  </span>
                </label>
                <Button
                  onClick={handleManualRefresh}
                  disabled={isLoading}
                  className="bg-blue-600 hover:bg-blue-700 text-white border-0"
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
            <p className="text-sm text-slate-300">
              Showing {staffLocations.length} staff member{staffLocations.length !== 1 ? "s" : ""} currently checked in
            </p>
          </CardContent>
        </Card>

        {/* Map Container */}
        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm overflow-hidden">
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
        <Card className="bg-blue-900/30 border-blue-500/30 backdrop-blur-sm">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-200">
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
        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-lg">Staff Locations</CardTitle>
            <CardDescription className="text-slate-400">Current GPS coordinates and accuracy metrics</CardDescription>
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
                        ? "border-blue-500 bg-blue-900/30"
                        : "border-slate-700 hover:border-slate-600 bg-slate-700/30"
                    }`}
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-semibold text-white">{staff.name}</p>
                        <p className="text-sm text-slate-400">{staff.email}</p>
                      </div>
                      <div className="text-right">
                        <Badge
                          className={
                            staff.status === "checked-in"
                              ? "bg-green-600 text-white"
                              : "bg-red-600 text-white"
                          }
                        >
                          {staff.status === "checked-in" ? "Checked In" : "Checked Out"}
                        </Badge>
                        <p className="text-xs text-slate-500 mt-1">{getTimeSinceUpdate(staff.lastUpdated)}</p>
                      </div>
                    </div>

                    {/* Coordinates */}
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div className="p-2 bg-slate-700/50 rounded">
                        <p className="text-xs text-slate-400 mb-1">Latitude</p>
                        <p className="font-mono text-sm font-semibold text-white">
                          {staff.latitude.toFixed(8)}
                        </p>
                      </div>
                      <div className="p-2 bg-slate-700/50 rounded">
                        <p className="text-xs text-slate-400 mb-1">Longitude</p>
                        <p className="font-mono text-sm font-semibold text-white">
                          {staff.longitude.toFixed(8)}
                        </p>
                      </div>
                    </div>

                    {/* Accuracy */}
                    <div className="flex items-center justify-between p-2 bg-slate-700/50 rounded mb-3">
                      <div>
                        <p className="text-xs text-slate-400">Accuracy</p>
                        <p className="font-semibold text-white">{staff.accuracy.toFixed(2)} m</p>
                      </div>
                      <Badge className={getAccuracyColor(staff.accuracy)}>
                        {getAccuracyLabel(staff.accuracy)}
                      </Badge>
                    </div>

                    {/* Expanded Details */}
                    {selectedStaff === staff.id && (
                      <div className="mt-4 pt-4 border-t border-slate-700 space-y-3">
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <p className="text-slate-400 flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              Last Updated
                            </p>
                            <p className="font-semibold text-white">{formatTime(staff.lastUpdated)}</p>
                          </div>
                          <div>
                            <p className="text-slate-400">Time Since Update</p>
                            <p className="font-semibold text-white">{getTimeSinceUpdate(staff.lastUpdated)}</p>
                          </div>
                        </div>

                        {/* Check-in/Check-out Info */}
                        {(staff.checkInLat || staff.checkOutLat) && (
                          <div className="space-y-2">
                            <p className="text-sm text-slate-400 font-semibold flex items-center gap-1">
                              <Navigation className="w-4 h-4" />
                              Route Information
                            </p>
                            {staff.checkInLat && staff.checkInLng && (
                              <div className="text-xs bg-green-900/30 p-2 rounded border border-green-500/30">
                                <p className="font-semibold text-green-300">Check-in Location:</p>
                                <p className="text-green-200">
                                  {staff.checkInLat.toFixed(8)}, {staff.checkInLng.toFixed(8)}
                                </p>
                              </div>
                            )}
                            {staff.checkOutLat && staff.checkOutLng && (
                              <div className="text-xs bg-red-900/30 p-2 rounded border border-red-500/30">
                                <p className="font-semibold text-red-300">Check-out Location:</p>
                                <p className="text-red-200">
                                  {staff.checkOutLat.toFixed(8)}, {staff.checkOutLng.toFixed(8)}
                                </p>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Waypoints */}
                        {waypointsByStaff.get(staff.id) && waypointsByStaff.get(staff.id)!.length > 0 && (
                          <div>
                            <p className="text-sm text-slate-400 font-semibold mb-2 flex items-center gap-1">
                              <Navigation className="w-4 h-4" />
                              Waypoints ({waypointsByStaff.get(staff.id)!.length})
                            </p>
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                              {waypointsByStaff.get(staff.id)!.map((wp, idx) => (
                                <div key={wp.id} className="text-xs bg-blue-900/30 p-2 rounded border border-blue-500/30">
                                  <p className="font-semibold text-blue-300">Waypoint {idx + 1}</p>
                                  <p className="text-blue-200">{wp.latitude.toFixed(8)}, {wp.longitude.toFixed(8)}</p>
                                  <p className="text-blue-300 text-xs mt-1">Accuracy: {wp.accuracy.toFixed(2)}m | Distance: {wp.cumulativeDistance.toFixed(3)}km</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Distance to other staff */}
                        {staffLocations.length > 1 && (
                          <div>
                            <p className="text-sm text-slate-400 font-semibold mb-2">Distance to other staff:</p>
                            <div className="space-y-1">
                              {staffLocations
                                .filter((s) => s.id !== staff.id)
                                .slice(0, 3)
                                .map((other) => (
                                  <p key={other.id} className="text-sm text-slate-300">
                                    {other.name}:{" "}
                                    <span className="font-semibold">
                                      {calculateDistance(staff.latitude, staff.longitude, other.latitude, other.longitude)} km
                                    </span>
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
              <div className="text-center py-12">
                <MapPin className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400 text-lg">No staff members checked in</p>
                <p className="text-slate-500 text-sm mt-2">Staff locations will appear here once they check in</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
