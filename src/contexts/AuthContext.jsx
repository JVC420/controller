import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '../firebase/config';
import { logEvent, setAuditRole } from '../services/auditService';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

// Role definitions — maps claim value to allowed route paths.
// `tripulante` and `lider_movil` are kiosk-style roles authenticated via Google.
// They use a minimal layout (no sidebar) and live on dedicated routes.
export const ROLES = {
  administrador_general: {
    label: 'Administrador General',
    routes: ['/', '/historial', '/metricas', '/directorio', '/personal', '/almacen'],
  },
  controlador: {
    label: 'Controlador',
    routes: ['/', '/historial', '/directorio'],
  },
  recurso_humano: {
    label: 'Recurso Humano',
    routes: ['/personal'],
  },
  almacen: {
    label: 'Almacen',
    routes: ['/almacen'],
  },
  tripulante: {
    label: 'Tripulante',
    routes: ['/checkin', '/ingreso', '/salida'],
  },
  lider_movil: {
    label: 'Líder de Móvil',
    routes: ['/lider', '/lider/inventario'],
  },
};

export const KIOSK_ROLES = new Set(['tripulante', 'lider_movil']);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [mobileId, setMobileId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const tokenResult = await firebaseUser.getIdTokenResult();
        const nextRole = tokenResult.claims.role || null;
        setRole(nextRole);
        setAuditRole(nextRole);
        setMobileId(tokenResult.claims.mobileId || null);
        setUser(firebaseUser);
      } else {
        setUser(null);
        setRole(null);
        setAuditRole(null);
        setMobileId(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const hasAccess = (path) => {
    if (!role || !ROLES[role]) return false;
    return ROLES[role].routes.includes(path);
  };

  const logout = async () => {
    await logEvent({
      action: 'logout',
      entity: 'session',
      metadata: { email: auth.currentUser?.email || null },
    });
    return signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, role, mobileId, loading, logout, hasAccess }}>
      {children}
    </AuthContext.Provider>
  );
};
