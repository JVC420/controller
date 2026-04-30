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

  useEffect(() => () => { cancelledRef.current = true; }, []);

  const requestLocation = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setStatus('error');
      setError({ code: 'unsupported', message: 'Tu navegador no soporta geolocalización.' });
      return;
    }
    setStatus('requesting');
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (cancelledRef.current) return;
        const { latitude, longitude, accuracy } = pos.coords;
        if (accuracy && accuracy > minAccuracyMeters) {
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
