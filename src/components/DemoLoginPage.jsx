import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { Activity, Shield, Headphones, Users, Warehouse, Truck, UserCircle2, Loader2, AlertCircle, Sparkles } from 'lucide-react';
import { auth, USE_EMULATORS } from '../firebase/config';
import { useAuth, ROLES } from '../contexts/AuthContext';
import { triggerDemoReset } from '../services/demoReset';

const DEMO_PASSWORD = 'demo1234';

const DEMO_ROLES = [
  { email: 'admin@demo.local',       roleKey: 'administrador_general', icon: Shield,      color: 'from-red-600 to-orange-600',   subtitle: 'Vista completa: flota, métricas, personal, almacén, auditoría' },
  { email: 'controlador@demo.local', roleKey: 'controlador',           icon: Headphones,  color: 'from-blue-600 to-cyan-600',    subtitle: 'Triage de solicitudes, asignación de móviles, historial' },
  { email: 'rh@demo.local',          roleKey: 'recurso_humano',        icon: Users,       color: 'from-purple-600 to-fuchsia-600', subtitle: 'Gestión de empleados y turnos' },
  { email: 'almacen@demo.local',     roleKey: 'almacen',               icon: Warehouse,   color: 'from-emerald-600 to-teal-600', subtitle: 'Inventario, consumos, despachos a móviles' },
  { email: 'lider@demo.local',       roleKey: 'lider_movil',           icon: Truck,       color: 'from-amber-600 to-yellow-600', subtitle: 'QR de check-in, inventario y consumos del móvil' },
  { email: 'tripulante@demo.local',  roleKey: 'tripulante',            icon: UserCircle2, color: 'from-slate-600 to-slate-500',  subtitle: 'Check-in / check-out con QR' },
];

// Códigos de auth que probablemente indican que el seed nunca corrió.
const MISSING_USER_CODES = new Set([
  'auth/user-not-found',
  'auth/invalid-credential',
  'auth/invalid-login-credentials',
  'auth/wrong-password',
]);

export default function DemoLoginPage() {
  const { user, role } = useAuth();
  const [loadingRole, setLoadingRole] = useState(null);
  const [error, setError] = useState(null);
  const [needsBootstrap, setNeedsBootstrap] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [seededOk, setSeededOk] = useState(false);

  if (user && role) {
    const landing = ROLES[role]?.routes[0] || '/';
    return <Navigate to={landing} replace />;
  }

  const enterAs = async (demo) => {
    setError(null);
    setLoadingRole(demo.roleKey);
    try {
      await signInWithEmailAndPassword(auth, demo.email, DEMO_PASSWORD);
    } catch (err) {
      console.error(err);
      if (MISSING_USER_CODES.has(err?.code)) {
        if (USE_EMULATORS) {
          setError('Los usuarios demo no existen. Lanza `npm run demo:seed` o reinicia con `npm run demo`.');
        } else {
          setNeedsBootstrap(true);
          setError('Los datos del demo aún no han sido sembrados. Click el botón de abajo para inicializarlos (toma ~10 segundos).');
        }
      } else {
        setError(err?.message || 'No se pudo iniciar sesión.');
      }
    } finally {
      setLoadingRole(null);
    }
  };

  const handleBootstrap = async () => {
    setSeeding(true);
    setError(null);
    try {
      await triggerDemoReset();
      setSeededOk(true);
      setNeedsBootstrap(false);
    } catch (err) {
      console.error(err);
      setError(`No se pudo sembrar el demo: ${err?.message || err}`);
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-900 p-6 flex items-center justify-center">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-600/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-4xl">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-red-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-red-900/50 mb-4">
            <Activity size={36} />
          </div>
          <span className="px-3 py-1 rounded-full bg-amber-500/15 text-amber-300 text-[11px] font-bold uppercase tracking-widest border border-amber-500/30 mb-3">
            Demo · Datos ficticios
          </span>
          <h1 className="text-3xl font-bold text-white tracking-tight">Pulso</h1>
          <p className="text-slate-400 text-sm mt-1">Selecciona un rol para entrar al demo</p>
        </div>

        {error && (
          <div className="max-w-md mx-auto mb-4 flex items-start gap-2 bg-red-500/10 border border-red-500/30 text-red-300 text-sm rounded-lg p-3">
            <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {needsBootstrap && (
          <div className="max-w-md mx-auto mb-6 bg-amber-500/5 border border-amber-500/30 rounded-xl p-4 text-center">
            <button
              type="button"
              onClick={handleBootstrap}
              disabled={seeding}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:bg-amber-700 text-amber-950 font-semibold transition-colors"
            >
              {seeding ? (
                <><Loader2 size={16} className="animate-spin" /> Sembrando datos…</>
              ) : (
                <><Sparkles size={16} /> Sembrar datos del demo</>
              )}
            </button>
            <p className="text-xs text-amber-200/70 mt-2">
              Crea los 6 usuarios demo y todos los datos de prueba.
            </p>
          </div>
        )}

        {seededOk && (
          <div className="max-w-md mx-auto mb-4 flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm rounded-lg p-3">
            <Sparkles size={16} className="flex-shrink-0" />
            <span>¡Listo! Ya puedes seleccionar un rol para entrar.</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {DEMO_ROLES.map((d) => {
            const Icon = d.icon;
            const label = ROLES[d.roleKey]?.label || d.roleKey;
            const loading = loadingRole === d.roleKey;
            return (
              <button
                key={d.roleKey}
                type="button"
                onClick={() => enterAs(d)}
                disabled={!!loadingRole || seeding}
                className={`text-left bg-dark-800 hover:bg-dark-700 border border-slate-700 hover:border-slate-500 rounded-2xl p-5 transition-all disabled:opacity-50 group shadow-xl`}
              >
                <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${d.color} flex items-center justify-center text-white shadow-lg mb-3`}>
                  {loading ? <Loader2 className="animate-spin" size={22} /> : <Icon size={22} />}
                </div>
                <p className="text-white font-bold text-base">{label}</p>
                <p className="text-xs text-slate-400 mt-1 leading-snug">{d.subtitle}</p>
                <p className="text-[10px] font-mono text-slate-600 mt-3 truncate">{d.email}</p>
              </button>
            );
          })}
        </div>

        <p className="text-center text-slate-600 text-xs mt-8">
          Esta es una versión de demostración con datos ficticios. Cero datos reales involucrados.
        </p>
      </div>
    </div>
  );
}
