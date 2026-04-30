import React from 'react';
import { CheckCircle2, AlertTriangle, Loader2, MapPin, ShieldCheck, Clock } from 'lucide-react';

const STEP_META = {
  auth: { label: 'Validando usuario', Icon: ShieldCheck },
  geo: { label: 'Solicitando ubicación', Icon: MapPin },
  register: { label: 'Registrando ingreso', Icon: Clock },
};

const Step = ({ step, current, error }) => {
  const meta = STEP_META[step];
  if (!meta) return null;
  const isActive = current === step;
  const order = ['auth', 'geo', 'register'];
  const isDone = order.indexOf(current) > order.indexOf(step);
  const isErrored = isActive && !!error;

  const color = isErrored
    ? 'text-red-400 border-red-500/30 bg-red-500/10'
    : isDone
    ? 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10'
    : isActive
    ? 'text-blue-300 border-blue-500/30 bg-blue-500/10'
    : 'text-slate-500 border-slate-700 bg-slate-800/40';

  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl border ${color}`}>
      {isActive && !error ? (
        <Loader2 size={18} className="animate-spin" />
      ) : isDone ? (
        <CheckCircle2 size={18} />
      ) : isErrored ? (
        <AlertTriangle size={18} />
      ) : (
        <meta.Icon size={18} />
      )}
      <span className="text-sm font-medium">{meta.label}</span>
    </div>
  );
};

const CheckInStatusCard = ({ stage, error, success }) => {
  return (
    <div className="bg-dark-800 border border-slate-700 rounded-2xl p-6 w-full max-w-lg shadow-xl">
      {success ? (
        <div className="flex flex-col items-center text-center gap-3 py-4">
          <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
            <CheckCircle2 size={36} className="text-emerald-400" />
          </div>
          <h2 className="text-xl font-bold text-white">Ingreso registrado</h2>
          {success.userName && <p className="text-slate-300">{success.userName}</p>}
          <div className="text-sm text-slate-400 space-y-1 mt-2">
            {success.mobileId && <p>Móvil: <span className="text-white font-semibold">{success.mobileId}</span></p>}
            {success.checkInAtMs && (
              <p>
                Hora del servidor:{' '}
                <span className="text-white font-mono">
                  {new Date(success.checkInAtMs).toLocaleTimeString('es-CO')}
                </span>
              </p>
            )}
          </div>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center text-center gap-3 py-4">
          <div className="w-16 h-16 rounded-full bg-red-500/15 border border-red-500/30 flex items-center justify-center">
            <AlertTriangle size={32} className="text-red-400" />
          </div>
          <h2 className="text-lg font-bold text-white">No se pudo registrar el ingreso</h2>
          <p className="text-sm text-red-300">{error}</p>
        </div>
      ) : (
        <div className="space-y-2">
          <Step step="auth" current={stage} error={error} />
          <Step step="geo" current={stage} error={error} />
          <Step step="register" current={stage} error={error} />
        </div>
      )}
    </div>
  );
};

export default CheckInStatusCard;
