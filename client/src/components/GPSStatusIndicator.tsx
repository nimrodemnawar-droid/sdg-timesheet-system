import { Signal, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface GPSStatusIndicatorProps {
  accuracy: number | null;
  latitude: number | null;
  longitude: number | null;
  lastUpdated: Date | null;
  isSearching?: boolean;
}

export function GPSStatusIndicator({
  accuracy,
  latitude,
  longitude,
  lastUpdated,
  isSearching = false,
}: GPSStatusIndicatorProps) {
  // Determine GPS signal strength based on accuracy
  // Lower accuracy (meters) = better signal
  const getSignalStrength = () => {
    if (!accuracy) return "unknown";
    if (accuracy <= 10) return "excellent";
    if (accuracy <= 25) return "good";
    if (accuracy <= 50) return "fair";
    return "poor";
  };

  // Get signal strength color and icon
  const getStatusDisplay = () => {
    const strength = getSignalStrength();
    
    switch (strength) {
      case "excellent":
        return {
          color: "text-green-600",
          bgColor: "bg-green-50",
          label: "Excellent",
          icon: <Signal className="w-5 h-5 text-green-600" />,
        };
      case "good":
        return {
          color: "text-blue-600",
          bgColor: "bg-blue-50",
          label: "Good",
          icon: <Signal className="w-5 h-5 text-blue-600" />,
        };
      case "fair":
        return {
          color: "text-yellow-600",
          bgColor: "bg-yellow-50",
          label: "Fair",
          icon: <AlertTriangle className="w-5 h-5 text-yellow-600" />,
        };
      case "poor":
        return {
          color: "text-red-600",
          bgColor: "bg-red-50",
          label: "Poor",
          icon: <AlertTriangle className="w-5 h-5 text-red-600" />,
        };
      default:
        return {
          color: "text-gray-600",
          bgColor: "bg-gray-50",
          label: "Searching...",
          icon: <Clock className="w-5 h-5 text-gray-600 animate-spin" />,
        };
    }
  };

  const status = getStatusDisplay();
  const timeAgo = lastUpdated
    ? Math.floor((Date.now() - lastUpdated.getTime()) / 1000)
    : null;

  return (
    <Card className={status.bgColor}>
      <CardContent className="pt-4">
        <div className="space-y-3">
          {/* Signal Strength Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {status.icon}
              <span className={`font-semibold ${status.color}`}>
                {isSearching ? "Searching for GPS..." : `Signal: ${status.label}`}
              </span>
            </div>
            {!isSearching && accuracy && (
              <Badge variant="outline" className={status.color}>
                ±{accuracy.toFixed(1)}m
              </Badge>
            )}
          </div>

          {/* Coordinates Display */}
          {latitude && longitude && (
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="bg-white/50 p-2 rounded">
                <p className="text-gray-600">Latitude</p>
                <p className="font-mono font-semibold">{latitude.toFixed(8)}</p>
              </div>
              <div className="bg-white/50 p-2 rounded">
                <p className="text-gray-600">Longitude</p>
                <p className="font-mono font-semibold">{longitude.toFixed(8)}</p>
              </div>
            </div>
          )}

          {/* Last Updated */}
          {timeAgo !== null && (
            <div className="text-xs text-gray-600 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Updated {timeAgo < 60 ? `${timeAgo}s ago` : `${Math.floor(timeAgo / 60)}m ago`}
            </div>
          )}

          {/* Status Message */}
          {!isSearching && accuracy && accuracy > 50 && (
            <div className="bg-yellow-100 border border-yellow-300 rounded p-2 text-xs text-yellow-800">
              ⚠️ GPS accuracy is low ({accuracy.toFixed(1)}m). Move to an open area for better signal.
            </div>
          )}

          {isSearching && (
            <div className="bg-blue-100 border border-blue-300 rounded p-2 text-xs text-blue-800">
              🔍 Acquiring GPS signal. Please wait...
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
