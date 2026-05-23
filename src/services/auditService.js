import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase/config';

const AUDIT_COLLECTION = 'audit_logs';

let currentRole = null;
export const setAuditRole = (role) => { currentRole = role || null; };

const sanitize = (value) => {
  if (value === undefined) return null;
  if (value === null) return null;
  if (typeof value === 'function') return undefined;
  if (value && typeof value.toDate === 'function') {
    try { return value.toDate().toISOString(); } catch { return null; }
  }
  if (Array.isArray(value)) return value.map(sanitize).filter((v) => v !== undefined);
  if (typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      const s = sanitize(v);
      if (s !== undefined) out[k] = s;
    }
    return out;
  }
  return value;
};

const diff = (before, after) => {
  const b = before && typeof before === 'object' ? before : {};
  const a = after && typeof after === 'object' ? after : {};
  const keys = new Set([...Object.keys(b), ...Object.keys(a)]);
  const changedFields = [];
  const beforeOut = {};
  const afterOut = {};
  for (const key of keys) {
    const bv = sanitize(b[key]);
    const av = sanitize(a[key]);
    if (JSON.stringify(bv) !== JSON.stringify(av)) {
      changedFields.push(key);
      if (bv !== undefined) beforeOut[key] = bv;
      if (av !== undefined) afterOut[key] = av;
    }
  }
  return { changedFields, beforeOut, afterOut };
};

/**
 * Registra un evento de auditoría en Firestore.
 * No lanza: si el log falla, no debe romper el flujo de negocio.
 */
export const logEvent = async ({
  action,
  entity,
  entityId = null,
  before = null,
  after = null,
  changes = null,
  metadata = null,
  success = true,
  errorMessage = null,
  redactPayload = false,
} = {}) => {
  try {
    const user = auth.currentUser;
    const doc = {
      timestamp: serverTimestamp(),
      clientTimestamp: new Date().toISOString(),
      action: action || 'unknown',
      entity: entity || 'unknown',
      entityId,
      userId: user?.uid || null,
      userEmail: user?.email || null,
      userRole: currentRole,
      success,
      errorMessage: errorMessage || null,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
      path: typeof window !== 'undefined' ? window.location?.pathname : null,
    };

    if (redactPayload) {
      const computed = diff(before, after);
      doc.changes = changes || computed.changedFields;
    } else if (before || after) {
      const computed = diff(before, after);
      doc.changes = changes || computed.changedFields;
      if (Object.keys(computed.beforeOut).length) doc.before = computed.beforeOut;
      if (Object.keys(computed.afterOut).length) doc.after = computed.afterOut;
    } else if (changes) {
      doc.changes = changes;
    }

    if (metadata) {
      const s = sanitize(metadata);
      if (s && Object.keys(s).length) doc.metadata = s;
    }

    await addDoc(collection(db, AUDIT_COLLECTION), doc);
  } catch (err) {
    // No relanzar: el logging nunca debe romper la app.
    if (typeof console !== 'undefined') console.warn('[audit] failed to log event', err);
  }
};

/** Helper para envolver una operación: la ejecuta y registra el resultado (incluyendo fallos). */
export const withAudit = async (fn, eventBase) => {
  try {
    const result = await fn();
    await logEvent({ ...eventBase, success: true });
    return result;
  } catch (err) {
    await logEvent({
      ...eventBase,
      success: false,
      errorMessage: err?.message || String(err),
    });
    throw err;
  }
};
