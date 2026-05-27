/* eslint-env node */
/**
 * Cloud Functions del demo HOSPEDADO.
 * Usa Firebase Functions v1 — mismo patrón que validateAndCheckIn /
 * validateAndCheckOut de producción. v1 es público-por-default y maneja
 * CORS automáticamente para callables, sin configuración adicional.
 *
 * - resetDemoData (callable): cualquier visitante puede invocarlo desde la app.
 * - resetDemoDataScheduled (pubsub scheduler): cada 24h a las 04:00 Bogotá.
 *
 * Seguridad: ambas validan que el projectId contenga "demo" antes de borrar.
 */

import functions from 'firebase-functions/v1';
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';

import {
  DEMO_USERS,
  DEMO_PASSWORD,
  buildSeedData,
  ROOT_COLLECTIONS_TO_WIPE,
  FLOTA_SUBCOLLECTIONS,
} from './seedData.js';

initializeApp();
const db = getFirestore();
const auth = getAuth();

const isDemoProject = () => {
  const pid = process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT || '';
  return pid.includes('demo');
};

async function deleteCollection(collectionPath, batchSize = 200) {
  const collectionRef = db.collection(collectionPath);
  let count = 0;
  while (true) {
    const snap = await collectionRef.limit(batchSize).get();
    if (snap.empty) return count;
    const batch = db.batch();
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    count += snap.size;
    if (snap.size < batchSize) return count;
  }
}

async function wipeAll() {
  const flotaSnap = await db.collection('flota').get();
  for (const doc of flotaSnap.docs) {
    for (const sub of FLOTA_SUBCOLLECTIONS) {
      await deleteCollection(`flota/${doc.id}/${sub}`);
    }
  }
  for (const col of ROOT_COLLECTIONS_TO_WIPE) {
    await deleteCollection(col);
  }
}

async function seedUsers() {
  for (const u of DEMO_USERS) {
    try { await auth.deleteUser(u.uid); } catch (_) { /* no existía */ }
    await auth.createUser({
      uid: u.uid,
      email: u.email,
      emailVerified: true,
      displayName: u.displayName,
      password: DEMO_PASSWORD,
    });
    await auth.setCustomUserClaims(u.uid, u.claims);
  }
}

async function seedFirestore() {
  const data = buildSeedData();
  const ts = FieldValue.serverTimestamp();

  const writeBatched = async (collectionName, items) => {
    const batch = db.batch();
    for (const item of items) {
      const { id, ...rest } = item;
      batch.set(db.collection(collectionName).doc(String(id)), { ...rest, createdAt: ts });
    }
    await batch.commit();
  };

  await writeBatched('clientes',    data.CLIENTES);
  await writeBatched('flota',       data.FLOTA);
  await writeBatched('empleados',   data.EMPLEADOS);
  await writeBatched('turnos',      data.TURNOS);
  await writeBatched('solicitudes', data.SOLICITUDES);
  await writeBatched('products',    data.PRODUCTS);

  for (const [mobileId, items] of Object.entries(data.MOBILE_INVENTORY)) {
    for (const item of items) {
      await db.collection('flota').doc(mobileId).collection('inventario').doc(item.productId).set({
        ...item, createdAt: ts, updatedAt: ts,
      });
      await db.collection('flota').doc(mobileId).collection('movements').add({
        productId: item.productId,
        productName: item.productName,
        type: 'IN',
        quantity: item.stockCurrent,
        reason: 'Despacho inicial',
        performedBy: 'almacen@demo.local',
        timestamp: Timestamp.fromDate(data.daysAgo(1)),
        stockSnapshot: item.stockCurrent,
      });
    }
  }

  for (const ev of data.AUDIT_EVENTS) {
    await db.collection('audit_logs').add({
      ...ev, timestamp: ts, clientTimestamp: new Date().toISOString(), success: true,
    });
  }
}

async function runReset() {
  if (!isDemoProject()) {
    throw new Error(`Refusing to reset: project "${process.env.GCLOUD_PROJECT}" no contiene "demo".`);
  }
  const t0 = Date.now();
  await wipeAll();
  await seedUsers();
  await seedFirestore();
  return { ok: true, ms: Date.now() - t0 };
}

// ─── Callable v1: público por default, CORS manejado por la lib ──────────
export const resetDemoData = functions
  .region('us-central1')
  .runWith({ timeoutSeconds: 300, memory: '512MB' })
  .https.onCall(async () => {
    try {
      const result = await runReset();
      return { ok: true, durationMs: result.ms };
    } catch (err) {
      console.error('[resetDemoData] failed:', err);
      throw new functions.https.HttpsError('internal', err.message || 'Reset falló');
    }
  });

// ─── Scheduled v1: cada día a las 04:00 hora Bogotá ──────────────────────
export const resetDemoDataScheduled = functions
  .region('us-central1')
  .runWith({ timeoutSeconds: 540, memory: '512MB' })
  .pubsub.schedule('0 4 * * *')
  .timeZone('America/Bogota')
  .onRun(async () => {
    try {
      const result = await runReset();
      console.log(`[scheduled reset] OK in ${result.ms}ms`);
    } catch (err) {
      console.error('[scheduled reset] failed:', err);
    }
  });
