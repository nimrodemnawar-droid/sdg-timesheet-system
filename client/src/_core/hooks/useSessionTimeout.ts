import { useEffect, useRef, useState, useCallback } from 'react';

const SESSION_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes
const WARNING_TIME_MS = 2 * 60 * 1000; // 2 minutes before timeout
const REMEMBER_ME_KEY = 'timesheet-remember-me';
const LAST_ACTIVITY_KEY = 'timesheet-last-activity';

export function useSessionTimeout(onTimeout: () => void) {
  const [showWarning, setShowWarning] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const warningTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const warningIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const resetSessionTimer = useCallback(() => {
    // Clear existing timers
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
    if (warningIntervalRef.current) clearInterval(warningIntervalRef.current);

    // Hide warning if showing
    setShowWarning(false);

    // Update last activity time
    localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());

    // Set warning timeout (triggers 2 minutes before session expires)
    warningTimeoutRef.current = setTimeout(() => {
      setShowWarning(true);
      setTimeRemaining(WARNING_TIME_MS / 1000);

      // Update countdown every second
      warningIntervalRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            if (warningIntervalRef.current) clearInterval(warningIntervalRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }, SESSION_TIMEOUT_MS - WARNING_TIME_MS);

    // Set logout timeout
    timeoutRef.current = setTimeout(() => {
      setShowWarning(false);
      onTimeout();
    }, SESSION_TIMEOUT_MS);
  }, [onTimeout]);

  const extendSession = useCallback(() => {
    setShowWarning(false);
    resetSessionTimer();
  }, [resetSessionTimer]);

  // Track user activity
  useEffect(() => {
    const handleActivity = () => {
      if (!showWarning) {
        resetSessionTimer();
      }
    };

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    events.forEach((event) => {
      window.addEventListener(event, handleActivity);
    });

    // Initialize timer on mount
    resetSessionTimer();

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
      if (warningIntervalRef.current) clearInterval(warningIntervalRef.current);
    };
  }, [resetSessionTimer, showWarning]);

  return {
    showWarning,
    timeRemaining,
    extendSession,
  };
}

export function setRememberMe(remember: boolean) {
  if (remember) {
    localStorage.setItem(REMEMBER_ME_KEY, 'true');
  } else {
    localStorage.removeItem(REMEMBER_ME_KEY);
  }
}

export function getRememberMe(): boolean {
  return localStorage.getItem(REMEMBER_ME_KEY) === 'true';
}

export function clearRememberMe() {
  localStorage.removeItem(REMEMBER_ME_KEY);
}
