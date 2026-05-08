import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface Waypoint {
  id: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: string;
  staffName?: string;
  staffId?: number;
}

interface WaypointVisualizationProps {
  waypoints: Waypoint[];
  isLoading?: boolean;
  staffName?: string;
}

// Custom marker icons
const createMarkerIcon = (color: string) => {
  return L.divIcon({
    html: `<div style="background-color: ${color}; width: 30px; height: 30px; border-radius: 50%; border: 2px solid white; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 12px;">📍</div>`,
    iconSize: [30, 30],
    className: 'custom-marker',
  });
};

export const WaypointVisualization: React.FC<WaypointVisualizationProps> = ({
  waypoints,
  isLoading = false,
  staffName = 'Staff Member',
}) => {
  const [mapCenter, setMapCenter] = useState<[number, number]>([-1.2921, 36.8219]); // Default to Nairobi
  const [sortedWaypoints, setSortedWaypoints] = useState<Waypoint[]>([]);

  useEffect(() => {
    if (waypoints && waypoints.length > 0) {
      // Sort waypoints by timestamp
      const sorted = [...waypoints].sort((a, b) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
      setSortedWaypoints(sorted);

      // Set map center to first waypoint
      if (sorted[0]) {
        setMapCenter([sorted[0].latitude, sorted[0].longitude]);
      }
    }
  }, [waypoints]);

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>GPS Movement Pattern</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </CardContent>
      </Card>
    );
  }

  if (!waypoints || waypoints.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>GPS Movement Pattern</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-96 text-gray-500">
          <div className="text-center">
            <p className="mb-2">No waypoint data available</p>
            <p className="text-sm">Staff member has not recorded any GPS locations yet</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Create polyline coordinates from waypoints
  const polylineCoordinates: [number, number][] = sortedWaypoints.map(wp => [
    wp.latitude,
    wp.longitude,
  ]);

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>GPS Movement Pattern</CardTitle>
            <p className="text-sm text-gray-500 mt-1">
              {staffName} - {sortedWaypoints.length} waypoints recorded
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">
              {sortedWaypoints[0] && new Date(sortedWaypoints[0].timestamp).toLocaleDateString()}
            </p>
            <p className="text-xs text-gray-500">
              {sortedWaypoints[0] && new Date(sortedWaypoints[0].timestamp).toLocaleTimeString()} - {sortedWaypoints[sortedWaypoints.length - 1] && new Date(sortedWaypoints[sortedWaypoints.length - 1].timestamp).toLocaleTimeString()}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg overflow-hidden border border-gray-200 h-96">
          <MapContainer
            center={mapCenter}
            zoom={13}
            style={{ width: '100%', height: '100%' }}
            className="z-0"
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; OpenStreetMap contributors'
            />

            {/* Draw polyline connecting all waypoints */}
            {polylineCoordinates.length > 1 && (
              <Polyline
                positions={polylineCoordinates}
                color="blue"
                weight={3}
                opacity={0.7}
                dashArray="5, 5"
              />
            )}

            {/* Mark start point */}
            {sortedWaypoints[0] && (
              <Marker
                position={[sortedWaypoints[0].latitude, sortedWaypoints[0].longitude]}
                icon={createMarkerIcon('#22c55e')}
              >
                <Popup>
                  <div className="text-sm">
                    <p className="font-semibold">Start</p>
                    <p className="text-xs text-gray-600">
                      {new Date(sortedWaypoints[0].timestamp).toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-600">
                      Accuracy: {sortedWaypoints[0].accuracy.toFixed(1)}m
                    </p>
                  </div>
                </Popup>
              </Marker>
            )}

            {/* Mark end point */}
            {sortedWaypoints[sortedWaypoints.length - 1] && (
              <Marker
                position={[
                  sortedWaypoints[sortedWaypoints.length - 1].latitude,
                  sortedWaypoints[sortedWaypoints.length - 1].longitude,
                ]}
                icon={createMarkerIcon('#ef4444')}
              >
                <Popup>
                  <div className="text-sm">
                    <p className="font-semibold">End</p>
                    <p className="text-xs text-gray-600">
                      {new Date(sortedWaypoints[sortedWaypoints.length - 1].timestamp).toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-600">
                      Accuracy: {sortedWaypoints[sortedWaypoints.length - 1].accuracy.toFixed(1)}m
                    </p>
                  </div>
                </Popup>
              </Marker>
            )}

            {/* Mark intermediate waypoints */}
            {sortedWaypoints.slice(1, -1).map((waypoint, index) => (
              <Marker
                key={waypoint.id}
                position={[waypoint.latitude, waypoint.longitude]}
                icon={createMarkerIcon('#3b82f6')}
              >
                <Popup>
                  <div className="text-sm">
                    <p className="font-semibold">Waypoint {index + 1}</p>
                    <p className="text-xs text-gray-600">
                      {new Date(waypoint.timestamp).toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-600">
                      Accuracy: {waypoint.accuracy.toFixed(1)}m
                    </p>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>

        {/* Waypoint details */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 p-3 rounded-lg">
            <p className="text-xs text-gray-600">Total Distance</p>
            <p className="text-lg font-semibold text-blue-600">
              {calculateTotalDistance(sortedWaypoints).toFixed(2)} km
            </p>
          </div>
          <div className="bg-green-50 p-3 rounded-lg">
            <p className="text-xs text-gray-600">Duration</p>
            <p className="text-lg font-semibold text-green-600">
              {calculateDuration(sortedWaypoints)}
            </p>
          </div>
          <div className="bg-purple-50 p-3 rounded-lg">
            <p className="text-xs text-gray-600">Avg Accuracy</p>
            <p className="text-lg font-semibold text-purple-600">
              {calculateAverageAccuracy(sortedWaypoints).toFixed(1)} m
            </p>
          </div>
        </div>

        {/* Waypoint list */}
        <div className="mt-4">
          <h3 className="text-sm font-semibold mb-2">Waypoint Timeline</h3>
          <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg">
            {sortedWaypoints.map((waypoint, index) => (
              <div
                key={waypoint.id}
                className="p-2 border-b border-gray-100 text-xs hover:bg-gray-50"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold">
                      {index === 0 ? 'Start' : index === sortedWaypoints.length - 1 ? 'End' : `Waypoint ${index}`}
                    </p>
                    <p className="text-gray-600">
                      {new Date(waypoint.timestamp).toLocaleString()}
                    </p>
                    <p className="text-gray-500">
                      {waypoint.latitude.toFixed(4)}, {waypoint.longitude.toFixed(4)}
                    </p>
                  </div>
                  <div className="text-right text-gray-600">
                    <p>Accuracy: {waypoint.accuracy.toFixed(1)}m</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Helper functions
function calculateTotalDistance(waypoints: Waypoint[]): number {
  if (waypoints.length < 2) return 0;

  let totalDistance = 0;
  for (let i = 0; i < waypoints.length - 1; i++) {
    const from = waypoints[i];
    const to = waypoints[i + 1];
    const distance = getDistanceFromLatLonInKm(
      from.latitude,
      from.longitude,
      to.latitude,
      to.longitude
    );
    totalDistance += distance;
  }
  return totalDistance;
}

function calculateDuration(waypoints: Waypoint[]): string {
  if (waypoints.length < 2) return '0h 0m';

  const start = new Date(waypoints[0].timestamp);
  const end = new Date(waypoints[waypoints.length - 1].timestamp);
  const durationMs = end.getTime() - start.getTime();
  const hours = Math.floor(durationMs / (1000 * 60 * 60));
  const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));

  return `${hours}h ${minutes}m`;
}

function calculateAverageAccuracy(waypoints: Waypoint[]): number {
  if (waypoints.length === 0) return 0;
  const sum = waypoints.reduce((acc, wp) => acc + wp.accuracy, 0);
  return sum / waypoints.length;
}

function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;
  return d;
}
