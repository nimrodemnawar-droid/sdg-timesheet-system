import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { formatGeolocationError } from './geolocation';

describe('Geolocation Utilities', () => {
  describe('formatGeolocationError', () => {
    it('should format TIMEOUT error correctly', () => {
      const error = new GeolocationPositionError();
      error.code = error.TIMEOUT;
      
      const message = formatGeolocationError(error);
      expect(message).toContain('GPS timeout');
      expect(message).toContain('high accuracy mode');
    });

    it('should format PERMISSION_DENIED error correctly', () => {
      const error = new GeolocationPositionError();
      error.code = error.PERMISSION_DENIED;
      
      const message = formatGeolocationError(error);
      expect(message).toContain('Location permission denied');
      expect(message).toContain('browser settings');
    });

    it('should format POSITION_UNAVAILABLE error correctly', () => {
      const error = new GeolocationPositionError();
      error.code = error.POSITION_UNAVAILABLE;
      
      const message = formatGeolocationError(error);
      expect(message).toContain('Location unavailable');
      expect(message).toContain('GPS signal');
    });

    it('should format generic Error correctly', () => {
      const error = new Error('Test error message');
      
      const message = formatGeolocationError(error);
      expect(message).toBe('Test error message');
    });

    it('should handle Error with no message', () => {
      const error = new Error();
      
      const message = formatGeolocationError(error);
      expect(message).toBe('Failed to acquire location');
    });
  });
});
