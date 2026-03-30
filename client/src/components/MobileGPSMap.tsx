import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Navigation, Loader2, AlertCircle, Maximize2, Minimize2 } from "lucide-react";

interface GPSLocation {
  id: number;
  userId: number;
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: Date;
  staffName: string;
}

export function MobileGPSMap() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [currentLocation, setCurrentLocation] = useState<GPSLocation | null>(null);
  const [staffLocations, setStaffLocations] = useState<GPSLocation[]>([]);

  // Simulate GPS tracking
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
      // Mock data
      setStaffLocations([
        {
          id: 1,
          userId: 1,
          latitude: -0.3031,
          longitude: 36.7250,
          accuracy: 10,
          timestamp: new Date(),
          staffName: "John Doe",
        },
        {
          id: 2,
          userId: 2,
          latitude: -0.3050,
          longitude: 36.7260,
          accuracy: 15,
          timestamp: new Date(),
          staffName: "Jane Smith",
        },
      ]);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  const handleRefresh = () => {
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 1000);
  };

  const handleGetCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentLocation({
            id: 0,
            userId: 0,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: new Date(),
            staffName: "You",
          });
          setGpsError(null);
        },
        (error) => {
          setGpsError(error.message);
        }
      );
    }
  };

  const containerClass = isFullscreen
    ? "fixed inset-0 z-50 flex flex-col"
    : "relative h-96 rounded-lg border border-border overflow-hidden";

  return (
    <div className={containerClass}>
      {/* Map Container */}
      <div
        ref={mapContainer}
        className="flex-1 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-slate-900 dark:to-slate-800"
      >
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Loading map...</p>
            </div>
          </div>
        ) : (
          <div className="relative h-full w-full">
            {/* Map placeholder with staff markers */}
            <div className="flex h-full items-center justify-center">
              <div className="space-y-2 text-center">
                <MapPin className="mx-auto h-12 w-12 text-primary opacity-50" />
                <p className="text-sm text-muted-foreground">
                  {staffLocations.length} staff members active
                </p>
              </div>
            </div>

            {/* Staff Location Markers */}
            {staffLocations.map((location) => (
              <div
                key={location.id}
                className="absolute flex flex-col items-center gap-1"
                style={{
                  left: `${(location.longitude + 0.001) * 100000}px`,
                  top: `${(location.latitude + 0.001) * 100000}px`,
                }}
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500 shadow-lg">
                  <MapPin className="h-4 w-4 text-white" />
                </div>
                <div className="rounded-md bg-white px-2 py-1 shadow-md">
                  <p className="text-xs font-medium">{location.staffName}</p>
                  <p className="text-xs text-muted-foreground">
                    ±{Math.round(location.accuracy)}m
                  </p>
                </div>
              </div>
            ))}

            {/* Current Location Marker */}
            {currentLocation && (
              <div
                className="absolute flex flex-col items-center gap-1"
                style={{
                  left: `${(currentLocation.longitude + 0.001) * 100000}px`,
                  top: `${(currentLocation.latitude + 0.001) * 100000}px`,
                }}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500 shadow-lg">
                  <Navigation className="h-5 w-5 text-white" />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="border-t border-border bg-background p-3 space-y-3">
        {gpsError && (
          <div className="flex items-center gap-2 rounded-lg bg-red-50 p-2 dark:bg-red-900/20">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <p className="text-xs text-red-600">{gpsError}</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleGetCurrentLocation}
            className="text-xs"
          >
            <Navigation className="mr-1 h-3 w-3" />
            My Location
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleRefresh}
            disabled={isLoading}
            className="text-xs"
          >
            Refresh
          </Button>
        </div>

        <Button
          size="sm"
          variant="ghost"
          onClick={() => setIsFullscreen(!isFullscreen)}
          className="w-full text-xs"
        >
          {isFullscreen ? (
            <>
              <Minimize2 className="mr-1 h-3 w-3" />
              Exit Fullscreen
            </>
          ) : (
            <>
              <Maximize2 className="mr-1 h-3 w-3" />
              Fullscreen
            </>
          )}
        </Button>
      </div>

      {/* Staff List */}
      {!isFullscreen && (
        <div className="border-t border-border bg-background p-3">
          <p className="mb-2 text-xs font-semibold">Active Staff</p>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {staffLocations.map((location) => (
              <div
                key={location.id}
                className="flex items-center justify-between rounded-lg bg-card p-2"
              >
                <div className="flex-1">
                  <p className="text-xs font-medium">{location.staffName}</p>
                  <p className="text-xs text-muted-foreground">
                    ±{Math.round(location.accuracy)}m accuracy
                  </p>
                </div>
                <Badge variant="outline" className="text-xs">
                  Active
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
