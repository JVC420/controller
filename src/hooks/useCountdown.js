import { useEffect, useRef, useState } from 'react';

// Counts down to `targetMs` (epoch ms). Tick interval defaults to 250ms for smooth bars.
// Cleans up the interval on unmount and when target changes.
export const useCountdown = (targetMs, { tickMs = 250 } = {}) => {
  const [now, setNow] = useState(() => Date.now());
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!targetMs) return undefined;
    setNow(Date.now());
    intervalRef.current = setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (current >= targetMs && intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }, tickMs);
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [targetMs, tickMs]);

  const remainingMs = Math.max(0, (targetMs ?? 0) - now);
  return {
    remainingMs,
    remainingSeconds: Math.ceil(remainingMs / 1000),
    isExpired: targetMs != null && remainingMs <= 0,
  };
};
