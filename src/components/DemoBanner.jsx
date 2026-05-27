import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Sparkles, HelpCircle, RefreshCw, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { DEMO_MODE, USE_EMULATORS } from '../firebase/config';
import { hasTourFor, resetAllTours, runTourFor } from '../services/demoTour';
import { triggerDemoReset } from '../services/demoReset';

export default function DemoBanner() {
  const { logout } = useAuth();
  const { pathname } = useLocation();
  const [resetting, setResetting] = useState(false);

  if (!DEMO_MODE) return null;

  const showTourBtn = hasTourFor(pathname);
  // El botón de reset solo aplica al demo HOSPEDADO (no a emulators locales).
  const showResetBtn = !USE_EMULATORS;

  const handleReset = async () => {
    const ok = window.confirm(
      '¿Reiniciar los datos del demo? Se borrarán todos los cambios actuales y se restaurarán los datos originales. Esto toma ~10 segundos.'
    );
    if (!ok) return;
    setResetting(true);
    try {
      await triggerDemoReset();
      resetAllTours();
      // Forzamos reload para que listeners y AuthContext recojan los datos frescos.
      window.location.reload();
    } catch (err) {
      console.error(err);
      window.alert(`No se pudo reiniciar el demo: ${err?.message || err}`);
      setResetting(false);
    }
  };

  return (
    <div className="fixed top-2 left-1/2 -translate-x-1/2 z-[100] pointer-events-none">
      <div className="pointer-events-auto inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/20 border border-amber-400/40 backdrop-blur-md shadow-lg shadow-amber-900/20">
        <Sparkles size={13} className="text-amber-300" />
        <span className="text-[11px] font-bold uppercase tracking-widest text-amber-200">
          Modo Demo · Datos ficticios
        </span>
        {showTourBtn && (
          <button
            type="button"
            onClick={() => runTourFor(pathname, { force: true })}
            className="inline-flex items-center gap-1 text-[11px] text-amber-200/80 hover:text-white"
            title="Volver a mostrar el tour de esta vista"
          >
            <HelpCircle size={12} /> tour
          </button>
        )}
        {showResetBtn && (
          <button
            type="button"
            onClick={handleReset}
            disabled={resetting}
            className="inline-flex items-center gap-1 text-[11px] text-amber-200/80 hover:text-white disabled:opacity-60"
            title="Borrar todos los cambios y restaurar datos originales"
          >
            {resetting
              ? <><Loader2 size={12} className="animate-spin" /> reiniciando…</>
              : <><RefreshCw size={12} /> reiniciar datos</>
            }
          </button>
        )}
        <button
          type="button"
          onClick={() => { resetAllTours(); logout?.(); }}
          className="text-[11px] text-amber-200/70 hover:text-white underline underline-offset-2"
          title="Cerrar sesión y volver al selector de rol"
        >
          cambiar rol
        </button>
      </div>
    </div>
  );
}
