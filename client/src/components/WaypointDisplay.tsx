import React from 'react';
import { MapPin, Navigation, Clock, Mountain } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatWaypointPopupDetails } from '../../../shared/waypointUtils';

export interface WaypointData {
  id?: number;
  timestamp: Date;
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  cumulativeDistance?: number | null;
  altitude?: number | null;
}

interface WaypointDisplayProps {
  waypoint: WaypointData;
  staffName: string;
  staffNumber: string | number;
}

const formatNumber = (value: number | null | undefined, digits = 2) => (
  typeof value === 'number' && Number.isFinite(value) ? value.toFixed(digits) : '—'
);

export const WaypointDisplay: React.FC<WaypointDisplayProps> = ({ waypoint, staffName, staffNumber }) => {
  const popupDetails = formatWaypointPopupDetails({ ...waypoint, staffName, staffNumber });
  const accuracy = typeof waypoint.accuracy === 'number' ? waypoint.accuracy : null;
  const accuracyClass = accuracy === null
    ? 'bg-slate-700 text-slate-300 border-slate-600'
    : accuracy <= 100 ? 'bg-emerald-950/60 text-emerald-300 border-emerald-700'
      : accuracy <= 1000 ? 'bg-amber-950/60 text-amber-300 border-amber-700'
        : 'bg-red-950/60 text-red-300 border-red-700';

  return (
    <Card className="w-full bg-slate-900/80 border-slate-700 border-l-4 border-l-blue-500 shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="text-base text-white truncate">{popupDetails.staffName}</CardTitle>
            <CardDescription className="text-slate-400">Staff #{popupDetails.staffNumber}</CardDescription>
          </div>
          <Badge variant="outline" className="shrink-0 border-blue-700 bg-blue-950/40 text-blue-300">
            Waypoint {waypoint.id ? `#${waypoint.id}` : ''}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex items-center gap-2 text-slate-300">
          <Clock className="w-4 h-4 text-blue-400 shrink-0" />
          <span>{popupDetails.timestamp}</span>
        </div>

        <div className="rounded-lg border border-slate-700 bg-slate-800/70 p-3 space-y-2">
          <div className="flex items-center gap-2 text-slate-200">
            <MapPin className="w-4 h-4 text-rose-400 shrink-0" />
            <span className="font-medium">GPS location</span>
          </div>
          <code className="block break-all text-xs text-slate-300">
            {popupDetails.location}
          </code>
          <a
            href={`https://maps.google.com/?q=${waypoint.latitude},${waypoint.longitude}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-medium text-blue-300 hover:text-blue-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded"
          >
            <MapPin className="w-3.5 h-3.5" /> View on Google Maps
          </a>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-3">
            <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
              <Navigation className="w-3.5 h-3.5 text-cyan-400" /> Cumulative distance
            </div>
            <p className="font-semibold text-slate-100">{formatNumber(waypoint.cumulativeDistance)} km</p>
          </div>
          <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-3">
            <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
              <Mountain className="w-3.5 h-3.5 text-violet-400" /> Altitude
            </div>
            <p className="font-semibold text-slate-100">{formatNumber(waypoint.altitude)} m</p>
          </div>
        </div>

        <Badge variant="outline" className={`w-fit ${accuracyClass}`}>
          Accuracy: {accuracy === null ? 'Unavailable' : `±${accuracy.toFixed(1)} m`}
        </Badge>
      </CardContent>
    </Card>
  );
};
