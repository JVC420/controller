import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase/config';

const ERROR_MESSAGES = {
  'token-not-found': 'Código inválido o no encontrado.',
  'token-expired': 'Este código ya expiró. Pide al líder generar uno nuevo.',
  'token-inactive': 'Este código ya no está activo.',
  'wrong-provider': 'Debes iniciar sesión con Google.',
  'not-tripulante': 'Tu cuenta no está autorizada para registrar salida.',
  'employee-not-found': 'No encontramos tu registro de empleado. Contacta a Recursos Humanos.',
  'no-shift-today': 'No tienes un turno programado en este móvil hoy.',
  'not-checked-in': 'Debes registrar tu ingreso primero.',
  'already-checked-out': 'Ya registraste tu salida en este turno.',
  'leader-cannot-check-in': 'El líder no puede registrar salida con su propio código.',
  'mobile-mismatch': 'El código no corresponde a este móvil.',
  'invalid-location': 'No pudimos validar tu ubicación.',
};

export const validateAndCheckOut = async ({ tokenId, location }) => {
  const callable = httpsCallable(functions, 'validateAndCheckOut');
  try {
    const result = await callable({ tokenId, location });
    return result.data;
  } catch (err) {
    const detailsCode = err?.details?.code;
    const dynamicCodes = new Set(['out-of-range']);
    const friendly = dynamicCodes.has(detailsCode) && err?.message
      ? err.message
      : (ERROR_MESSAGES[detailsCode] || err?.message || 'No pudimos registrar tu salida.');
    const wrapped = new Error(friendly);
    wrapped.code = detailsCode || err?.code || 'unknown';
    throw wrapped;
  }
};
