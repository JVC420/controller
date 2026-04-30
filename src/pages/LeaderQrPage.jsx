import React, { useCallback, useEffect, useState } from 'react';
import { LogOut, Truck, AlertTriangle, RefreshCw } from 'lucide-react';
import { auth } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import { generateQrToken } from '../services/qrService';
import QrDisplay from '../components/checkin/QrDisplay';

// Kiosk view rendered on the tablet inside the ambulance.
// Auto-regenerates QR shortly before expiration so it is always fresh.
const LeaderQrPage = () => {
  const { user, mobileId, logout } = useAuth();
  const [tokenId, setTokenId] = useState(null);
  const [expiresAtMs, setExpiresAtMs] = useState(null);
  const [status, setStatus] = useState('generating');
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [debugClaims, setDebugClaims] = useState(null);

  const regenerate = useCallback(async () => {
    if (!user || !mobileId) return; // Guarded by the missing-claim UI below.
    setStatus('generating');
    setError(null);
    try {
      const { tokenId: id, expiresAtMs: exp } = await generateQrToken({
        leaderUid: user.uid,
        leaderName: user.displayName || user.email || null,
        mobileId,
      });
      setTokenId(id);
      setExpiresAtMs(exp);
      setStatus('ready');
    } catch (err) {
      console.error(err);
      setStatus('error');
      setError(err?.message || 'No se pudo generar el código.');
    }
  }, [user, mobileId]);

  useEffect(() => {
    regenerate();
  }, [regenerate]);

  // Auto-refresh: schedule a new QR 2s before current expires.
  useEffect(() => {
    if (status !== 'ready' || !expiresAtMs) return undefined;
    const ms = Math.max(0, expiresAtMs - Date.now() - 2000);
    const t = setTimeout(() => regenerate(), ms);
    return () => clearTimeout(t);
  }, [status, expiresAtMs, regenerate]);

  // Forces a fresh ID token, useful right after the admin assigns custom claims.
  // Shows what claims actually arrived so we can diagnose mismatches.
  const forceTokenRefresh = async () => {
    setRefreshing(true);
    try {
      const result = await auth.currentUser?.getIdTokenResult(true);
      setDebugClaims(result?.claims || {});
      if (result?.claims?.mobileId) {
        window.location.reload();
      }
    } catch (err) {
      setDebugClaims({ error: err?.message || String(err) });
    } finally {
      setRefreshing(false);
    }
  };

  if (!mobileId) {
    return (
      <div className="min-h-screen bg-dark-900 flex flex-col items-center justify-center p-6 gap-4 text-center">
        <div className="w-16 h-16 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-300">
          <AlertTriangle size={32} />
        </div>
        <h1 className="text-xl font-bold text-white">Tablet sin móvil asignado</h1>
        <p className="text-slate-400 text-sm max-w-sm">
          Esta tablet no tiene un móvil asignado en sus credenciales. Si el administrador acaba
          de asignarlo, refresca el token; de lo contrario contacta al administrador.
        </p>
        <div className="flex gap-2 mt-2">
          <button
            type="button"
            onClick={forceTokenRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            Refrescar token
          </button>
          <button
            type="button"
            onClick={logout}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 text-sm"
          >
            <LogOut size={16} />
            Cerrar sesión
          </button>
        </div>

        {debugClaims && (
          <div className="mt-6 w-full max-w-lg bg-dark-800 border border-slate-700 rounded-xl p-4 text-left">
            <p className="text-[11px] uppercase tracking-wider text-slate-500 mb-2">
              Claims recibidos en el ID token
            </p>
            <pre className="text-[11px] text-slate-300 whitespace-pre-wrap break-all font-mono">
{JSON.stringify(debugClaims, null, 2)}
            </pre>
            <p className="text-[11px] text-slate-500 mt-3">
              UID actual: <span className="font-mono text-slate-300">{user?.uid}</span>
            </p>
            <p className="text-[11px] text-slate-500">
              Email: <span className="font-mono text-slate-300">{user?.email}</span>
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-900 flex flex-col">
      <header className="flex items-center justify-between p-4 md:p-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center text-white shadow-lg shadow-red-900/40">
            <Truck size={22} />
          </div>
          <div>
            <p className="text-[11px] text-slate-500 uppercase tracking-wider">Bienvenido móvil</p>
            <p className="text-lg md:text-xl font-bold text-white">{mobileId}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={logout}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 text-sm"
        >
          <LogOut size={16} />
          Cerrar sesión
        </button>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-4 md:p-8 gap-6">
        <p className="text-slate-400 text-sm md:text-base text-center max-w-md">
          La tripulación debe escanear este código con la app para registrar su ingreso al turno.
        </p>
        <QrDisplay
          tokenId={tokenId}
          expiresAtMs={expiresAtMs}
          status={status}
          error={error}
          onRegenerate={regenerate}
        />
        <p className="text-slate-600 text-xs text-center">
          El código se renueva automáticamente cada 90 segundos.
        </p>
      </main>
    </div>
  );
};

export default LeaderQrPage;
