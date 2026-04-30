import { useCallback, useEffect, useRef, useState } from 'react';

const DEFAULT_OPTIONS = {
  enableHighAccuracy: true,
  timeout: 15000,
  maximumAge: 0,
};

// Single-shot geolocation hook. Call requestLocation() to trigger.
// State machine: idle → requesting → success | error.
export const useGeolocation = ({ minAccuracyMeters = 200, options = DEFAULT_OPTIONS } = {}) => {
  const [status, setStatus] = useState('idle'); // idle | requesting | success | error
  const [coords, setCoords] = useState(null);
  const [error, setError] = useState(null);
  const cancelledRef = useRef(false);

  useEffect(() => {
    // Reset on (re)mount — important for React 19 StrictMode dev cycle, where
    // the cleanup runs between mounts and would otherwise leave cancelled=true.
    cancelledRef.current = false;
    return () => { cancelledRef.current = true; };
  }, []);

  const requestLocation = useCallback(() => {
    console.log('[useGeolocation] requestLocation called');
    if (!('geolocation' in navigator)) {
      console.warn('[useGeolocation] geolocation API not available');
      setStatus('error');
      setError({ code: 'unsupported', message: 'Tu navegador no soporta geolocalización.' });
      return;
    }
    console.log('[useGeolocation] calling getCurrentPosition with', options);
    setStatus('requesting');
    setError(null);
    const t0 = Date.now();
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const elapsed = Date.now() - t0;
        console.log('[useGeolocation] success in', elapsed, 'ms', pos.coords);
        if (cancelledRef.current) {
          console.warn('[useGeolocation] cancelled before applying coords — aborting');
          return;
        }
        const { latitude, longitude, accuracy } = pos.coords;
        if (accuracy && accuracy > minAccuracyMeters) {
          console.warn('[useGeolocation] accuracy too low:', accuracy, '>', minAccuracyMeters);
          setStatus('error');
          setError({ code: 'low-accuracy', message: `Precisión insuficiente (${Math.round(accuracy)}m). Sal a un área abierta.` });
          return;
        }
        const payload = {
          latitude,
          longitude,
          accuracy,
          capturedAt: pos.timestamp || Date.now(),
        };
        setCoords(payload);
        setStatus('success');
      },
      (err) => {
        const elapsed = Date.now() - t0;
        console.error('[useGeolocation] error after', elapsed, 'ms', { code: err.code, message: err.message });
        if (cancelledRef.current) return;
        const map = {
          1: 'Permiso de ubicación denegado.',
          2: 'GPS no disponible. Verifica que esté activado.',
          3: 'No pudimos obtener tu ubicación a tiempo. Intenta de nuevo.',
        };
        setStatus('error');
        setError({ code: err.code, message: map[err.code] || 'Error de geolocalización.' });
      },
      options
    );
  }, [minAccuracyMeters, options]);

  return { status, coords, error, requestLocation };
};
