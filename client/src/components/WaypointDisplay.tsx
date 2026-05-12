import React from 'react';
import { MapPin, Navigation, Clock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface WaypointData {
  checkInTime: Date;
  checkInLat: number;
  checkInLng: number;
  checkInAccuracy: number;
  checkOutTime?: Date;
  checkOutLat?: number;
  checkOutLng?: number;
  checkOutAccuracy?: number;
  distanceTraveled?: number;
  durationMinutes?: number;
}

interface WaypointDisplayProps {
  waypoint: WaypointData;
  staffName: string;
  staffNumber: string;
}

export const WaypointDisplay: React.FC<WaypointDisplayProps> = ({
  waypoint,
  staffName,
  staffNumber,
}) => {
  const formatCoordinates = (lat: number, lng: number) => {
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  };

  const formatTime = (date: Date | undefined) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  };

  const formatDistance = (meters: number | undefined) => {
    if (!meters) return '0 m';
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(2)} km`;
    }
    return `${Math.round(meters)} m`;
  };

  const formatDuration = (minutes: number | undefined) => {
    if (!minutes) return '0h 0m';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  return (
    <Card className="w-full border-l-4 border-l-blue-500">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">{staffName}</CardTitle>
            <CardDescription>Staff #{staffNumber}</CardDescription>
          </div>
          <Badge variant="outline" className="bg-blue-50">
            Waypoint Data
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Check-In Location */}
        <div className="space-y-2 p-3 bg-green-50 rounded-lg border border-green-200">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-green-600" />
            <h4 className="font-semibold text-green-900">Check-In Location</h4>
          </div>
          <div className="space-y-1 text-sm ml-6">
            <p className="text-gray-700">
              <span className="font-medium">Time:</span> {formatTime(waypoint.checkInTime)}
            </p>
            <p className="text-gray-700">
              <span className="font-medium">Coordinates:</span>{' '}
              <code className="bg-white px-2 py-1 rounded text-xs">
                {formatCoordinates(waypoint.checkInLat, waypoint.checkInLng)}
              </code>
            </p>
            <p className="text-gray-700">
              <span className="font-medium">Accuracy:</span> ±{waypoint.checkInAccuracy.toFixed(1)}m
            </p>
          </div>
        </div>

        {/* Check-Out Location */}
        {waypoint.checkOutTime && waypoint.checkOutLat && waypoint.checkOutLng ? (
          <div className="space-y-2 p-3 bg-red-50 rounded-lg border border-red-200">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-red-600" />
              <h4 className="font-semibold text-red-900">Check-Out Location</h4>
            </div>
            <div className="space-y-1 text-sm ml-6">
              <p className="text-gray-700">
                <span className="font-medium">Time:</span> {formatTime(waypoint.checkOutTime)}
              </p>
              <p className="text-gray-700">
                <span className="font-medium">Coordinates:</span>{' '}
                <code className="bg-white px-2 py-1 rounded text-xs">
                  {formatCoordinates(waypoint.checkOutLat, waypoint.checkOutLng)}
                </code>
              </p>
              <p className="text-gray-700">
                <span className="font-medium">Accuracy:</span> ±
                {waypoint.checkOutAccuracy?.toFixed(1) || 'N/A'}m
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-2 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-yellow-600" />
              <h4 className="font-semibold text-yellow-900">Still Checked In</h4>
            </div>
            <p className="text-sm text-gray-700 ml-6">No check-out recorded yet</p>
          </div>
        )}

        {/* Distance & Duration Summary */}
        {waypoint.checkOutTime && (
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2 mb-1">
                <Navigation className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-medium text-blue-900">Distance</span>
              </div>
              <p className="text-lg font-semibold text-blue-900">
                {formatDistance((waypoint.distanceTraveled || 0) * 1000)}
              </p>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-4 h-4 text-purple-600" />
                <span className="text-xs font-medium text-purple-900">Duration</span>
              </div>
              <p className="text-lg font-semibold text-purple-900">
                {formatDuration(waypoint.durationMinutes)}
              </p>
            </div>
          </div>
        )}

        {/* Map Link */}
        <div className="pt-2 border-t">
          <a
            href={`https://maps.google.com/?q=${waypoint.checkInLat},${waypoint.checkInLng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-2"
          >
            <MapPin className="w-4 h-4" />
            View on Google Maps
          </a>
        </div>
      </CardContent>
    </Card>
  );
};
