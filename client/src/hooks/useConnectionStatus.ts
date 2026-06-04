import { useEffect, useState, useCallback } from 'react';

interface ConnectionStatus {
  isOnline: boolean;
  isConnectedToServer: boolean;
  lastChecked: Date | null;
  failureCount: number;
  lastError: string | null;
}

const HEALTH_CHECK_INTERVAL = 30000; // 30 seconds
const HEALTH_CHECK_ENDPOINT = '/api/health';

export function useConnectionStatus() {
  const [status, setStatus] = useState<ConnectionStatus>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isConnectedToServer: true,
    lastChecked: null,
    failureCount: 0,
    lastError: null,
  });

  // Check server health
  const checkServerHealth = useCallback(async () => {
    try {
      const response = await fetch(HEALTH_CHECK_ENDPOINT, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(5000), // 5 second timeout
      });

      if (response.ok) {
        setStatus(prev => ({
          ...prev,
          isConnectedToServer: true,
          lastChecked: new Date(),
          failureCount: 0,
          lastError: null,
        }));
      } else {
        setStatus(prev => ({
          ...prev,
          isConnectedToServer: false,
          lastChecked: new Date(),
          failureCount: prev.failureCount + 1,
          lastError: `Server returned status ${response.status}`,
        }));
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setStatus(prev => ({
        ...prev,
        isConnectedToServer: false,
        lastChecked: new Date(),
        failureCount: prev.failureCount + 1,
        lastError: errorMessage,
      }));
    }
  }, []);

  // Listen to online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setStatus(prev => ({
        ...prev,
        isOnline: true,
      }));
      // Check server immediately when coming back online
      checkServerHealth();
    };

    const handleOffline = () => {
      setStatus(prev => ({
        ...prev,
        isOnline: false,
        isConnectedToServer: false,
        lastError: 'Browser is offline',
      }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [checkServerHealth]);

  // Periodic health checks
  useEffect(() => {
    // Check immediately on mount
    checkServerHealth();

    // Set up interval for periodic checks
    const interval = setInterval(checkServerHealth, HEALTH_CHECK_INTERVAL);

    return () => clearInterval(interval);
  }, [checkServerHealth]);

  return {
    ...status,
    checkNow: checkServerHealth,
  };
}
