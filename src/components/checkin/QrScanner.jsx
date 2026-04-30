import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeScannerState } from 'html5-qrcode';
import { Loader2, X, Camera } from 'lucide-react';

// Overlay scanner. On a successful read, calls onDetected(decodedText) once and stops.
const QrScanner = ({ onDetected, onClose }) => {
  const containerId = 'qr-scanner-container';
  const scannerRef = useRef(null);
  const [status, setStatus] = useState('starting'); // starting | scanning | error
  const [error, setError] = useState(null);
  const detectedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    const safeStop = async (inst) => {
      if (!inst) return;
      try {
        const state = inst.getState?.();
        if (state === Html5QrcodeScannerState.SCANNING || state === Html5QrcodeScannerState.PAUSED) {
          await inst.stop();
        }
      } catch { /* ignore */ }
      try { await inst.clear(); } catch { /* ignore */ }
    };

    const start = async () => {
      try {
        const html5Qr = new Html5Qrcode(containerId, /* verbose */ false);
        scannerRef.current = html5Qr;
        await html5Qr.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 240, height: 240 } },
          (decodedText) => {
            if (detectedRef.current) return;
            detectedRef.current = true;
            safeStop(html5Qr);
            onDetected(decodedText);
          },
          () => { /* per-frame decode failures — ignore */ }
        );
        if (cancelled) {
          // Component unmounted while start() was in flight — clean up immediately.
          safeStop(html5Qr);
          return;
        }
        setStatus('scanning');
      } catch (err) {
        console.error(err);
        if (cancelled) return;
        setStatus('error');
        setError(err?.message || 'No se pudo acceder a la cámara.');
      }
    };
    start();

    return () => {
      cancelled = true;
      safeStop(scannerRef.current);
    };
  }, [onDetected]);

  return (
    <div className="fixed inset-0 z-[80] bg-black/90 flex flex-col">
      <div className="flex items-center justify-between p-4 text-white">
        <div className="flex items-center gap-2">
          <Camera size={20} />
          <span className="font-semibold">Escanear código del móvil</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          aria-label="Cerrar escáner"
        >
          <X size={22} />
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center relative">
        <div id={containerId} className="w-full max-w-md aspect-square bg-black rounded-xl overflow-hidden" />
        {status === 'starting' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white gap-3 pointer-events-none">
            <Loader2 size={32} className="animate-spin" />
            <span className="text-sm">Activando cámara…</span>
          </div>
        )}
        {status === 'error' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-red-300 gap-3 px-6 text-center">
            <span className="text-sm">{error}</span>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm"
            >
              Cerrar
            </button>
          </div>
        )}
      </div>

      <p className="text-center text-slate-300 text-xs p-4">
        Apunta al QR de la tablet del móvil. La detección es automática.
      </p>
    </div>
  );
};

export default QrScanner;
