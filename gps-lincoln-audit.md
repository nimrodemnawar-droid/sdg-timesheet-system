# GPS Acquisition Audit

The Staff Dashboard uses `watchPosition` with `enableHighAccuracy: true`, `timeout: 30000`, and `maximumAge: 0`. It currently stops immediately only when accuracy is below 50 metres. If the browser emits a transient geolocation error, the error handler clears the watch and discards any best position collected so far. This can force the staff member to press Acquire GPS repeatedly. The 30-second fallback accepts the best position only if the watch survives until the timeout.

The fix should retain the best position through transient errors, use a practical acquisition threshold rather than waiting for sub-50-metre accuracy, and keep the existing retry guidance for accuracy above 1000 metres. Check-in must continue to require actual coordinates; no location validation should be bypassed.
