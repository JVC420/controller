import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { signInWithEmailAndPassword, signInWithPopup, signOut } from 'firebase/auth';
import { collection, getDocs, limit, query, where } from 'firebase/firestore';
import { auth, db, googleProvider } from '../firebase/config';
import { useAuth, ROLES } from '../contexts/AuthContext';
import { logEvent } from '../services/auditService';
import { Activity, Mail, Lock, AlertCircle, Loader2 } from 'lucide-react';

const GoogleIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34.5 6.1 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.4-.4-3.5z"/>
    <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 16 19 12 24 12c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34.5 6.1 29.5 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
    <path fill="#4CAF50" d="M24 44c5.4 0 10.3-2 14-5.3l-6.5-5.4C29.5 35 26.9 36 24 36c-5.3 0-9.7-3.4-11.3-8L6 32.5C9.4 39.6 16.1 44 24 44z"/>
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.2 5.7l6.5 5.4C41.4 35.7 44 30.3 44 24c0-1.2-.1-2.4-.4-3.5z"/>
  </svg>
);

const LoginPage = () => {
  const { user, role } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  if (user && role) {
    const landingRoute = ROLES[role]?.routes[0] || '/';
    return <Navigate to={landingRoute} replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      await logEvent({ action: 'login', entity: 'session', metadata: { method: 'password', email } });
    } catch (err) {
      await logEvent({
        action: 'login',
        entity: 'session',
        success: false,
        errorMessage: err?.code || err?.message || 'unknown',
        metadata: { method: 'password', email },
      });
      switch (err.code) {
        case 'auth/invalid-credential':
          setError('Correo o contraseña incorrectos.');
          break;
        case 'auth/too-many-requests':
          setError('Demasiados intentos. Intenta más tarde.');
          break;
        default:
          setError('Error al iniciar sesión. Intenta de nuevo.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Google sign-in is reserved for tripulantes and líderes-móvil.
  // Whitelist enforcement: must have role claim AND (for tripulante) a matching empleado doc.
  const handleGoogleSignIn = async () => {
    setError('');
    setGoogleLoading(true);
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      const tokenResult = await cred.user.getIdTokenResult(true);
      const claimRole = tokenResult.claims.role;
      const userEmail = (cred.user.email || '').toLowerCase();

      if (claimRole !== 'tripulante' && claimRole !== 'lider_movil') {
        await logEvent({
          action: 'login',
          entity: 'session',
          success: false,
          errorMessage: 'unauthorized_role',
          metadata: { method: 'google', email: userEmail, claimRole: claimRole || null },
        });
        await signOut(auth);
        setError('Esta cuenta de Google no está autorizada. Contacta al administrador.');
        return;
      }

      if (claimRole === 'tripulante') {
        const snap = await getDocs(
          query(collection(db, 'empleados'), where('email', '==', userEmail), limit(1))
        );
        if (snap.empty) {
          await logEvent({
            action: 'login',
            entity: 'session',
            success: false,
            errorMessage: 'no_empleado_record',
            metadata: { method: 'google', email: userEmail, claimRole },
          });
          await signOut(auth);
          setError('No encontramos tu registro de empleado. Contacta a Recursos Humanos.');
          return;
        }
      }

      await logEvent({
        action: 'login',
        entity: 'session',
        metadata: { method: 'google', email: userEmail, claimRole },
      });

      // Para lider_movil sin mobileId NO hacemos signOut: dejamos pasar al /lider,
      // donde se muestra una pantalla de diagnóstico con los claims actuales y un
      // botón para refrescar el token. Las reglas de Firestore impiden cualquier
      // escritura indebida si el claim falta.
      // Auth context will pick up the new user and redirect.
    } catch (err) {
      if (err?.code === 'auth/popup-closed-by-user' || err?.code === 'auth/cancelled-popup-request') {
        // user dismissed — silent
      } else {
        console.error(err);
        setError('No se pudo iniciar sesión con Google. Intenta de nuevo.');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-900 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-600/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-red-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-red-900/50 mb-4">
            <Activity size={36} />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Pulso</h1>
          <p className="text-slate-400 text-sm mt-1">Centro de operaciones ambulancias</p>
        </div>

        <div className="bg-dark-800 border border-slate-700 rounded-2xl p-8 shadow-2xl shadow-black/30">
          <h2 className="text-xl font-semibold text-white mb-6">Iniciar Sesión</h2>

          {error && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg p-3 mb-5">
              <AlertCircle size={16} className="flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Correo electrónico</label>
              <div className="relative">
                <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="usuario@lma.com"
                  className="w-full bg-dark-900 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Contraseña</label>
              <div className="relative">
                <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full bg-dark-900 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || googleLoading}
              className="w-full bg-red-600 hover:bg-red-500 disabled:bg-red-600/50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg shadow-red-900/30"
            >
              {loading ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Ingresando...
                </>
              ) : (
                'Ingresar'
              )}
            </button>
          </form>

          <div className="my-6 flex items-center gap-3">
            <div className="flex-1 h-px bg-slate-700" />
            <span className="text-xs text-slate-500 uppercase tracking-wider">Tripulación</span>
            <div className="flex-1 h-px bg-slate-700" />
          </div>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading || googleLoading}
            className="w-full bg-white hover:bg-slate-50 disabled:bg-slate-200 disabled:cursor-not-allowed text-slate-800 font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-3 shadow"
          >
            {googleLoading ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                Verificando...
              </>
            ) : (
              <>
                <GoogleIcon />
                Continuar con Google
              </>
            )}
          </button>
          <p className="text-[11px] text-slate-500 text-center mt-2">
            Solo para tripulantes y tablets de móvil autorizadas.
          </p>
        </div>

        <p className="text-center text-slate-600 text-xs mt-6">
          © {new Date().getFullYear()} Pulso — Centro de operaciones de flota médica
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
