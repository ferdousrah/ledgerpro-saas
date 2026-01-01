import { useEffect, useRef, useState } from 'react';

interface UseIdleTimeoutOptions {
  onIdle: () => void;
  idleTime?: number; // in milliseconds
  enabled?: boolean;
}

export const useIdleTimeout = ({
  onIdle,
  idleTime = 3 * 60 * 1000, // 3 minutes default
  enabled = true,
}: UseIdleTimeoutOptions) => {
  const [isIdle, setIsIdle] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  const resetTimer = () => {
    if (!enabled) return;

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setIsIdle(false);

    // Set new timeout
    timeoutRef.current = setTimeout(() => {
      setIsIdle(true);
      onIdle();
    }, idleTime);
  };

  useEffect(() => {
    if (!enabled) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      return;
    }

    // Events that indicate user activity
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];

    // Reset timer on any user activity
    const handleActivity = () => {
      resetTimer();
    };

    // Add event listeners
    events.forEach((event) => {
      document.addEventListener(event, handleActivity);
    });

    // Start the timer
    resetTimer();

    // Cleanup
    return () => {
      events.forEach((event) => {
        document.removeEventListener(event, handleActivity);
      });
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [enabled, idleTime]);

  return { isIdle, resetTimer };
};
