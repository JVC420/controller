import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase/config';
import { logEvent } from './auditService';

// Maps Cloud Function error codes / messages to user-friendly text.
const ERROR_MESSAGES = {
  'token-not-found': 'Código inválido o no encontrado.',
  'token-expired': 'Este código ya expiró. Pide al líder generar uno nuevo.',
  'token-inactive': 'Este código ya no está activo.',
  'wrong-provider': 'Debes iniciar sesión con Google.',
  'not-tripulante': 'Tu cuenta no está autorizada para registrar ingreso.',
  'employee-not-found': 'No encontramos tu registro de empleado. Contacta a Recursos Humanos.',
  'no-shift-today': 'No tienes un turno programado en este móvil hoy.',
  'shift-already-checked-in': 'Ya registraste ingreso para este turno.',
  'leader-cannot-check-in': 'El líder no puede registrarse a sí mismo con su propio código.',
  'mobile-mismatch': 'El código no corresponde a este móvil.',
  'out-of-range': 'Estás demasiado lejos del móvil para registrar ingreso.',
  'invalid-location': 'No pudimos validar tu ubicación.',
};

export const validateAndCheckIn = async ({ tokenId, location }) => {
  const callable = httpsCallable(functions, 'validateAndCheckIn');
  try {
    const result = await callable({ tokenId, location });
    await logEvent({
      action: 'business',
      entity: 'check_in',
      entityId: result?.data?.turnoId || tokenId,
      metadata: {
        event: 'check_in_success',
        tokenId,
        mobileId: result?.data?.mobileId || null,
      },
    });
    return result.data; // { ok: true, turnoId, mobileId, checkInAtMs, userName }
  } catch (err) {
    const detailsCode = err?.details?.code;
    const dynamicCodes = new Set(['out-of-range']);
    const friendly = dynamicCodes.has(detailsCode) && err?.message
      ? err.message
      : (ERROR_MESSAGES[detailsCode] || err?.message || 'No pudimos registrar tu ingreso.');
    await logEvent({
      action: 'business',
      entity: 'check_in',
      entityId: tokenId,
      success: false,
      errorMessage: detailsCode || err?.code || 'unknown',
      metadata: { event: 'check_in_failure', tokenId },
    });
    const wrapped = new Error(friendly);
    wrapped.code = detailsCode || err?.code || 'unknown';
    throw wrapped;
  }
};
