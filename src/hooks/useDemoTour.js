import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { DEMO_MODE } from '../firebase/config';
import { runTourFor } from '../services/demoTour';

/**
 * Dispara el tour para la ruta actual una vez (la primera vez que se visita).
 * Solo activo en modo demo. Llamar desde un componente alto (App/Layouts).
 */
export const useDemoTour = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    if (!DEMO_MODE) return;
    runTourFor(pathname);
  }, [pathname]);
};
