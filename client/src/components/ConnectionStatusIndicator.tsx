import React from 'react';
import { Wifi, WifiOff, AlertCircle } from 'lucide-react';
import { useConnectionStatus } from '@/hooks/useConnectionStatus';

export function ConnectionStatusIndicator() {
  const { isOnline, isConnectedToServer, failureCount, lastError } = useConnectionStatus();

  // Determine status
  const isHealthy = isOnline && isConnectedToServer;
  const isWarning = isOnline && !isConnectedToServer;
  const isOffline = !isOnline;

  if (isHealthy) {
    // Don't show indicator when everything is fine
    return null;
  }

  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
        isOffline
          ? 'bg-red-100 text-red-700 border border-red-300'
          : isWarning
          ? 'bg-yellow-100 text-yellow-700 border border-yellow-300'
          : 'bg-green-100 text-green-700 border border-green-300'
      }`}
      title={lastError || 'Connection status'}
    >
      {isOffline ? (
        <>
          <WifiOff className="w-4 h-4 animate-pulse" />
          <span>Offline</span>
        </>
      ) : isWarning ? (
        <>
          <AlertCircle className="w-4 h-4 animate-pulse" />
          <span>Server Unreachable</span>
          {failureCount > 1 && <span className="text-xs opacity-75">({failureCount} attempts)</span>}
        </>
      ) : (
        <>
          <Wifi className="w-4 h-4" />
          <span>Connected</span>
        </>
      )}
    </div>
  );
}
