import React, { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, MapPin } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useGeolocation } from '../hooks/useGeolocation';
import { validateAndCheckIn } from '../services/checkInService';
import CheckInStatusCard from '../components/checkin/CheckInStatusCard';

// Stage machine: 'auth' → 'geo' → 'register' → 'done' (with success) or 'failed' (with error).
const CheckInPage = () => {
  const [searchParams] = useSearchParams();
  const tokenId = searchParams.get('token');
  const { user, role, loading: authLoading } = useAuth();
  // NOTE: 100km es laxo a propósito para permitir pruebas en escritorio
  // (geolocalización por IP suele dar accuracy ~50km). En producción móvil
  // el GPS reporta ±5–50m, así que la mayoría pasará. La validación dura
  // está en el geofence del backend, que rechaza si el tripulante no está
  // dentro del radio respecto al móvil.
  const { status: geoStatus, coords, error: geoError, requestLocation } = useGeolocation({
    minAccuracyMeters: 100000,
  });

  const [stage, setStage] = useState('auth');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const submittedRef = useRef(false);

  // 1) Auth check
  useEffect(() => {
    console.log('[CheckIn] auth-stage tick', { authLoading, hasUser: !!user, role, tokenId });
    if (authLoading) return;
    if (!user) {
      console.warn('[CheckIn] no user → fail');
      setError('Debes iniciar sesión con Google.');
      setStage('failed');
      return;
    }
    const provider = user.providerData?.[0]?.providerId;
    console.log('[CheckIn] provider:', provider);
    if (provider && provider !== 'google.com') {
      setError('Debes iniciar sesión con Google.');
      setStage('failed');
      return;
    }
    if (role !== 'tripulante') {
      console.warn('[CheckIn] wrong role:', role);
      setError('Tu cuenta no está autorizada para registrar ingreso.');
      setStage('failed');
      return;
    }
    if (!tokenId || tokenId === 'invalid') {
      console.warn('[CheckIn] invalid token:', tokenId);
      setError('Código inválido.');
      setStage('failed');
      return;
    }
    console.log('[CheckIn] auth OK → stage=geo');
    setStage('geo');
  }, [authLoading, user, role, tokenId]);

  // 2) Geo request — kicks off automatically when entering 'geo'
  useEffect(() => {
    if (stage === 'geo' && geoStatus === 'idle') {
      console.log('[CheckIn] geo: requesting location…');
      requestLocation();
    }
  }, [stage, geoStatus, requestLocation]);

  useEffect(() => {
    if (stage !== 'geo') return;
    console.log('[CheckIn] geo-status tick', { geoStatus, coords, geoError });
    if (geoStatus === 'error') {
      console.warn('[CheckIn] geo error:', geoError);
      setError(geoError?.message || 'No pudimos obtener tu ubicación.');
      setStage('failed');
    } else if (geoStatus === 'success' && coords) {
      console.log('[CheckIn] geo OK', coords);
      setStage('register');
    }
  }, [stage, geoStatus, geoError, coords]);

  // 3) Submit to backend (Cloud Function callable)
  useEffect(() => {
    if (stage !== 'register') return;
    if (submittedRef.current) return;
    submittedRef.current = true;

    (async () => {
      console.log('[CheckIn] register: calling validateAndCheckIn', { tokenId, coords });
      try {
        const result = await validateAndCheckIn({ tokenId, location: coords });
        console.log('[CheckIn] register OK', result);
        setSuccess({
          userName: result?.userName || user.displayName || user.email,
          mobileId: result?.mobileId,
          checkInAtMs: result?.checkInAtMs,
        });
        setStage('done');
      } catch (err) {
        console.error('[CheckIn] register failed', { code: err?.code, message: err?.message, raw: err });
        setError(err?.message || 'No pudimos registrar tu ingreso.');
        setStage('failed');
      }
    })();
  }, [stage, tokenId, coords, user]);

  return (
    <div className="min-h-screen bg-dark-900 flex flex-col">
      <header className="flex items-center justify-between p-4 border-b border-slate-800">
        <Link
          to="/checkin"
          className="inline-flex items-center gap-2 text-slate-300 hover:text-white text-sm"
        >
          <ArrowLeft size={16} /> Volver
        </Link>
        <div className="flex items-center gap-2 text-slate-400 text-xs">
          <MapPin size={14} />
          <span>Registro por QR</span>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-6 gap-6">
        <CheckInStatusCard stage={stage} error={stage === 'failed' ? error : null} success={stage === 'done' ? success : null} />
        {(stage === 'failed' || stage === 'done') && (
          <Link
            to="/checkin"
            className="text-blue-400 hover:text-blue-300 text-sm"
          >
            Volver al inicio
          </Link>
        )}
      </main>
    </div>
  );
};

export default CheckInPage;
