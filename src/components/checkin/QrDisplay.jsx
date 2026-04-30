import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Loader2, RefreshCw, AlertTriangle } from 'lucide-react';
import { useCountdown } from '../../hooks/useCountdown';
import { QR_TTL_SECONDS, buildQrUrl } from '../../services/qrService';

const QrDisplay = ({ tokenId, expiresAtMs, status, error, onRegenerate }) => {
  const { remainingMs, remainingSeconds, isExpired } = useCountdown(expiresAtMs);
  const ttlMs = QR_TTL_SECONDS * 1000;
  const ratio = expiresAtMs ? Math.min(1, Math.max(0, remainingMs / ttlMs)) : 0;
  const qrValue = tokenId ? buildQrUrl(tokenId) : '';

  const showQr = status === 'ready' && tokenId && !isExpired;

  return (
    <div className="bg-dark-800 border border-slate-700 rounded-3xl p-6 md:p-10 w-full max-w-xl shadow-2xl shadow-black/40">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-white">Código de Ingreso</h2>
        {status === 'ready' && !isExpired && (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
            Activo
          </span>
        )}
        {status === 'ready' && isExpired && (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-300 border border-amber-500/30">
            Expirado
          </span>
        )}
        {status === 'generating' && (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-blue-500/15 text-blue-300 border border-blue-500/30">
            Generando
          </span>
        )}
        {status === 'error' && (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-red-500/15 text-red-300 border border-red-500/30">
            Error
          </span>
        )}
      </div>

      <div className="flex items-center justify-center min-h-[280px] md:min-h-[340px]">
        {showQr ? (
          <div className="bg-white p-5 rounded-2xl shadow-xl">
            <QRCodeSVG value={qrValue} size={280} level="M" includeMargin={false} />
          </div>
        ) : status === 'generating' ? (
          <div className="text-slate-400 flex flex-col items-center gap-3">
            <Loader2 size={36} className="animate-spin" />
            <span className="text-sm">Generando código…</span>
          </div>
        ) : status === 'error' ? (
          <div className="text-red-300 flex flex-col items-center gap-3 text-center px-4">
            <AlertTriangle size={36} />
            <span className="text-sm">{error || 'No se pudo generar el código.'}</span>
          </div>
        ) : (
          <div className="text-slate-500 flex flex-col items-center gap-3 text-center">
            <AlertTriangle size={32} className="text-amber-400" />
            <span className="text-sm">Código expirado. Genera uno nuevo.</span>
          </div>
        )}
      </div>

      {status === 'ready' && !isExpired && (
        <div className="mt-6">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Este código vence en</span>
            <span className="font-mono text-white font-semibold">{remainingSeconds}s</span>
          </div>
          <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-[width] duration-200 ease-linear ${
                ratio > 0.4 ? 'bg-emerald-500' : ratio > 0.15 ? 'bg-amber-400' : 'bg-red-500'
              }`}
              style={{ width: `${ratio * 100}%` }}
            />
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={onRegenerate}
        disabled={status === 'generating'}
        className="mt-6 w-full inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-700/50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors shadow-lg shadow-blue-900/30"
      >
        <RefreshCw size={18} className={status === 'generating' ? 'animate-spin' : ''} />
        {isExpired || status === 'error' ? 'Generar nuevo código' : 'Regenerar código'}
      </button>
    </div>
  );
};

export default QrDisplay;
