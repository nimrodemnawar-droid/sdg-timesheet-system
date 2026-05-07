/**
 * Geolocation utilities for GPS and IP-based location acquisition
 */

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
  accuracy: number;
  source: 'gps' | 'ip' | 'fallback';
  timestamp: string;
}

/**
 * Get location from browser's Geolocation API (GPS)
 */
export function getGPSLocation(timeout: number = 30000): Promise<LocationCoordinates> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        resolve({
          latitude,
          longitude,
          accuracy,
          source: 'gps',
          timestamp: new Date().toISOString(),
        });
      },
      (error) => {
        reject(error);
      },
      { enableHighAccuracy: true, timeout, maximumAge: 0 }
    );
  });
}

/**
 * Get location from IP address using free geolocation API
 * Uses ip-api.com free tier (45 requests per minute)
 */
export async function getIPLocation(): Promise<LocationCoordinates> {
  try {
    // Using ip-api.com free API (no API key required for basic usage)
    const response = await fetch('https://ip-api.com/json/?fields=lat,lon,accuracy,status', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`IP geolocation API error: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.status !== 'success') {
      throw new Error(`IP geolocation failed: ${data.message || 'Unknown error'}`);
    }

    return {
      latitude: data.lat,
      longitude: data.lon,
      accuracy: data.accuracy || 5000, // IP-based accuracy is typically 5km
      source: 'ip',
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    throw new Error(`Failed to get IP location: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get location with GPS fallback to IP-based geolocation
 * First tries GPS, then falls back to IP geolocation if GPS fails
 */
export async function getLocationWithFallback(
  gpsTimeout: number = 30000
): Promise<LocationCoordinates> {
  try {
    // Try GPS first
    return await getGPSLocation(gpsTimeout);
  } catch (gpsError) {
    console.warn('GPS acquisition failed, attempting IP-based fallback:', gpsError);

    try {
      // Fall back to IP-based geolocation
      return await getIPLocation();
    } catch (ipError) {
      console.error('Both GPS and IP geolocation failed:', ipError);
      throw new Error(
        'Unable to acquire location. Please enable GPS or check your internet connection.'
      );
    }
  }
}

/**
 * Format geolocation error message for user display
 */
export function formatGeolocationError(error: GeolocationPositionError | Error): string {
  if (error instanceof GeolocationPositionError) {
    switch (error.code) {
      case error.TIMEOUT:
        return 'GPS timeout - please try again or enable high accuracy mode';
      case error.PERMISSION_DENIED:
        return 'Location permission denied - please enable location access in browser settings';
      case error.POSITION_UNAVAILABLE:
        return 'Location unavailable - please try again or check your GPS signal';
      default:
        return 'Location error - please try again';
    }
  }

  return error.message || 'Failed to acquire location';
}
