// Cloud Function: validateAndCheckIn
// ----------------------------------------------------------------------------
// Llamada desde el frontend (httpsCallable). Valida que el QR sea legítimo,
// encuentra el turno programado del tripulante para el día/móvil, y marca el
// inicio real con la hora del servidor — todo dentro de una transacción.
//
// Consume estos campos del token (claims) NO del payload:
//   - request.auth.uid
//   - request.auth.token.email
//   - request.auth.token.role  (debe ser 'tripulante')
//   - request.auth.token.firebase.sign_in_provider (debe ser 'google.com')
//
// El cliente solo manda { tokenId, location: { latitude, longitude, accuracy, capturedAt } }.
//
// Despliegue:
//   cd functions && npm install
//   firebase deploy --only functions:validateAndCheckIn
//
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';

initializeApp();
const db = getFirestore();

const todayStrInTimezone = (tz = 'America/Bogota') => {
  // YYYY-MM-DD in Colombia timezone — matches `turnos.fecha` format.
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
  });
  return fmt.format(new Date());
};

const fail = (code, message) => {
  // Use HttpsError so the SDK propagates `details.code` to the client.
  throw new HttpsError('failed-precondition', message, { code });
};

const isValidLocation = (loc) => {
  if (!loc || typeof loc !== 'object') return false;
  const { latitude, longitude } = loc;
  return Number.isFinite(latitude) && Number.isFinite(longitude)
      && latitude >= -90 && latitude <= 90
      && longitude >= -180 && longitude <= 180;
};

export const validateAndCheckIn = onCall({ region: 'us-central1', cors: true }, async (req) => {
  const auth = req.auth;
  if (!auth) throw new HttpsError('unauthenticated', 'Sesión requerida.');

  const provider = auth.token.firebase?.sign_in_provider;
  if (provider !== 'google.com') fail('wrong-provider', 'Debes iniciar sesión con Google.');

  if (auth.token.role !== 'tripulante') fail('not-tripulante', 'Tu cuenta no está autorizada.');

  const { tokenId, location } = req.data || {};
  if (!tokenId || typeof tokenId !== 'string') fail('token-not-found', 'Token inválido.');
  if (!isValidLocation(location)) fail('invalid-location', 'Ubicación inválida.');

  const userEmail = (auth.token.email || '').toLowerCase();
  if (!userEmail) fail('employee-not-found', 'Tu cuenta no tiene email.');

  // Find empleado by email (whitelist enforced by user via custom claim + employee email).
  const empSnap = await db.collection('empleados')
    .where('email', '==', userEmail).limit(1).get();
  if (empSnap.empty) fail('employee-not-found', 'No encontramos tu registro de empleado.');

  const empleadoDoc = empSnap.docs[0];
  const empleadoId = empleadoDoc.id;
  const empleadoData = empleadoDoc.data();

  const qrRef = db.collection('qr_activos').doc(tokenId);
  const checkInTs = Timestamp.now();

  const result = await db.runTransaction(async (tx) => {
    const qrSnap = await tx.get(qrRef);
    if (!qrSnap.exists) fail('token-not-found', 'Código no encontrado.');
    const qr = qrSnap.data();

    if (qr.status !== 'active') fail('token-inactive', 'Código inactivo.');
    if (!qr.expiresAt || qr.expiresAt.toMillis() < Date.now()) {
      fail('token-expired', 'Código expirado.');
    }
    if (qr.purpose !== 'shift_check_in') fail('token-not-found', 'Código no válido para este flujo.');

    if (qr.leaderUid === auth.uid) {
      fail('leader-cannot-check-in', 'El líder no puede registrarse con su propio código.');
    }

    const mobileId = qr.mobileId;
    const fecha = todayStrInTimezone('America/Bogota');

    // Buscar turno del empleado para hoy en este móvil.
    // Usamos transacción.get sobre la query para mantener consistencia.
    const shiftsQuery = db.collection('turnos')
      .where('empleadoId', '==', empleadoId)
      .where('movil', '==', mobileId)
      .where('fecha', '==', fecha)
      .limit(2);

    const shiftsSnap = await tx.get(shiftsQuery);
    if (shiftsSnap.empty) fail('no-shift-today', 'No tienes turno programado en este móvil hoy.');

    // Si hay varios, elegimos el primero sin inicioReal; si todos lo tienen, falla.
    const candidate = shiftsSnap.docs.find(d => !d.data().inicioReal);
    if (!candidate) fail('shift-already-checked-in', 'Ya registraste ingreso para este turno.');

    tx.update(candidate.ref, {
      inicioReal: checkInTs,
      checkInLocation: {
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy ?? null,
        capturedAt: location.capturedAt ? Timestamp.fromMillis(location.capturedAt) : checkInTs,
      },
      checkInSource: 'ephemeral_qr',
      qrTokenId: tokenId,
      checkInBy: {
        uid: auth.uid,
        email: userEmail,
        empleadoId,
      },
      actualizadoAt: FieldValue.serverTimestamp(),
    });

    return {
      turnoId: candidate.id,
      mobileId,
      checkInAtMs: checkInTs.toMillis(),
      userName: empleadoData.nombre || empleadoData.nombres || auth.token.name || userEmail,
    };
  });

  return { ok: true, ...result };
});
