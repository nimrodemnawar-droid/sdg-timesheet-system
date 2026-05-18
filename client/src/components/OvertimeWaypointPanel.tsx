import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, MapPin, Navigation, AlertTriangle } from "lucide-react";

interface Waypoint {
  id: number;
  latitude: number | string;
  longitude: number | string;
  timestamp: Date | string;
  cumulativeDistance: number | string | null;
  accuracy?: number | string | null;
}

interface OvertimeWaypointPanelProps {
  hoursWorked?: number;
  overtimeHours?: number;
  waypoints?: Waypoint[] | null;
  totalDistance?: number | string | null;
  checkInTime?: Date | string | null;
  checkOutTime?: Date | string | null;
}

export function OvertimeWaypointPanel({
  hoursWorked = 0,
  overtimeHours = 0,
  waypoints = [],
  totalDistance = 0,
  checkInTime,
  checkOutTime,
}: OvertimeWaypointPanelProps) {
  const isOvertime = overtimeHours > 0;
  const waypointCount = waypoints?.length || 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Overtime Card */}
      <Card className={`bg-gradient-to-br transition-all duration-300 shadow-lg ${
        isOvertime
          ? 'from-red-900/40 to-red-800/20 border-red-500/50 hover:border-red-400'
          : 'from-slate-800 to-slate-900 border-slate-700/50 hover:border-slate-600'
      }`}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2">
              <Clock className={`w-5 h-5 ${isOvertime ? 'text-red-400' : 'text-slate-400'}`} />
              Overtime Summary
            </CardTitle>
            {isOvertime && (
              <AlertTriangle className="w-5 h-5 text-red-400 animate-pulse" />
            )}
          </div>
          <CardDescription className="text-slate-400">
            {checkInTime && checkOutTime
              ? `${new Date(checkInTime).toLocaleTimeString()} - ${new Date(checkOutTime).toLocaleTimeString()}`
              : 'No check-out yet'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Hours Worked */}
          <div className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg">
            <span className="text-slate-300 font-medium">Hours Worked</span>
            <span className={`text-xl font-bold ${
              hoursWorked > 8 ? 'text-red-400' : 'text-yellow-300'
            }`}>
              {hoursWorked.toFixed(2)} h
            </span>
          </div>

          {/* Overtime Hours */}
          <div className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg">
            <span className="text-slate-300 font-medium">Overtime</span>
            <div className="flex items-center gap-2">
              <span className={`text-xl font-bold ${
                isOvertime ? 'text-red-400' : 'text-slate-400'
              }`}>
                {overtimeHours.toFixed(2)} h
              </span>
              {isOvertime && (
                <Badge className="bg-red-600 text-white animate-pulse">
                  Active
                </Badge>
              )}
            </div>
          </div>

          {/* Status */}
          {isOvertime && (
            <div className="p-3 bg-red-900/30 border border-red-500/50 rounded-lg">
              <p className="text-red-300 text-sm font-medium">
                ⚠️ You have {overtimeHours.toFixed(2)} hours of overtime today
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Waypoints Card */}
      <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-blue-500/30 hover:border-blue-400 transition-all duration-300 shadow-lg">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Navigation className="w-5 h-5 text-blue-400" />
            GPS Waypoints
          </CardTitle>
          <CardDescription className="text-slate-400">
            Real-time location tracking
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Waypoint Count */}
          <div className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg">
            <span className="text-slate-300 font-medium">Waypoints Captured</span>
            <span className="text-xl font-bold text-blue-400">
              {waypointCount}
            </span>
          </div>

          {/* Total Distance */}
          <div className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg">
            <span className="text-slate-300 font-medium">Distance Traveled</span>
            <span className="text-xl font-bold text-green-400">
              {(((typeof totalDistance === 'string' ? parseFloat(totalDistance) : totalDistance) || 0) / 1000).toFixed(2)} km
            </span>
          </div>

          {/* Waypoint List */}
          {waypointCount > 0 && (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              <p className="text-xs text-slate-400 font-semibold uppercase">Recent Waypoints</p>
              {waypoints?.slice(-5).reverse().map((wp, idx) => (
                <div
                  key={wp.id}
                  className="p-2 bg-slate-700/20 border border-slate-600/30 rounded text-xs"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-blue-300 font-semibold">
                      #{waypointCount - idx}
                    </span>
                    <span className="text-slate-400">
                      {new Date(wp.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="text-slate-400 flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {typeof wp.latitude === 'string' ? parseFloat(wp.latitude).toFixed(6) : (wp.latitude as number).toFixed(6)}, {typeof wp.longitude === 'string' ? parseFloat(wp.longitude).toFixed(6) : (wp.longitude as number).toFixed(6)}
                  </div>
                  {wp.cumulativeDistance && (
                    <div className="text-slate-500 mt-1">
                      Distance: {(((typeof wp.cumulativeDistance === 'string' ? parseFloat(wp.cumulativeDistance) : wp.cumulativeDistance) || 0) / 1000).toFixed(2)} km
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {waypointCount === 0 && (
            <div className="p-3 bg-slate-700/20 border border-slate-600/30 rounded text-center">
              <p className="text-slate-400 text-sm">
                No waypoints captured yet. Start tracking after check-in.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
