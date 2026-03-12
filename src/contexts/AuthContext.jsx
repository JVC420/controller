import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '../firebase/config';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

// Role definitions — maps claim value to allowed route paths
export const ROLES = {
  administrador_general: {
    label: 'Administrador General',
    routes: ['/', '/historial', '/metricas', '/directorio', '/personal'],
  },
  controlador: {
    label: 'Controlador',
    routes: ['/', '/historial', '/directorio'],
  },
  recurso_humano: {
    label: 'Recurso Humano',
    routes: ['/personal'],
  },
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const tokenResult = await firebaseUser.getIdTokenResult();
        setRole(tokenResult.claims.role || null);
        setUser(firebaseUser);
      } else {
        setUser(null);
        setRole(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const hasAccess = (path) => {
    if (!role || !ROLES[role]) return false;
    return ROLES[role].routes.includes(path);
  };

  const logout = () => signOut(auth);

  return (
    <AuthContext.Provider value={{ user, role, loading, logout, hasAccess }}>
      {children}
    </AuthContext.Provider>
  );
};
