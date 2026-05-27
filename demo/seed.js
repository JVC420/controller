#!/usr/bin/env node
/* eslint-env node */
/**
 * Seed local contra Firebase Emulators (npm run demo:seed).
 *
 * Para el reset del demo HOSPEDADO, ver functions/index.js (Cloud Function).
 */

process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST || '127.0.0.1:9099';

import admin from 'firebase-admin';
import { DEMO_USERS, DEMO_PASSWORD, buildSeedData } from '../functions/seedData.js';

const PROJECT_ID = 'demo-lma';

admin.initializeApp({ projectId: PROJECT_ID });

const auth = admin.auth();
const db = admin.firestore();

const log = (...args) => console.log('[seed]', ...args);

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
    log(`user ${u.email} (${u.claims.role})`);
  }
}

async function commitInBatches(ref, items, idKey = 'id') {
  const batch = db.batch();
  for (const item of items) {
    const { [idKey]: id, ...data } = item;
    batch.set(ref.doc(String(id)), { ...data, createdAt: admin.firestore.FieldValue.serverTimestamp() });
  }
  await batch.commit();
}

async function seedFirestore() {
  const data = buildSeedData();

  await commitInBatches(db.collection('clientes'), data.CLIENTES);
  log(`${data.CLIENTES.length} clientes`);

  await commitInBatches(db.collection('flota'), data.FLOTA);
  log(`${data.FLOTA.length} móviles`);

  await commitInBatches(db.collection('empleados'), data.EMPLEADOS);
  log(`${data.EMPLEADOS.length} empleados`);

  await commitInBatches(db.collection('turnos'), data.TURNOS);
  log(`${data.TURNOS.length} turnos`);

  await commitInBatches(db.collection('solicitudes'), data.SOLICITUDES);
  log(`${data.SOLICITUDES.length} solicitudes`);

  await commitInBatches(db.collection('products'), data.PRODUCTS);
  log(`${data.PRODUCTS.length} productos almacén`);

  for (const [mobileId, items] of Object.entries(data.MOBILE_INVENTORY)) {
    const invRef = db.collection('flota').doc(mobileId).collection('inventario');
    const movRef = db.collection('flota').doc(mobileId).collection('movements');
    for (const item of items) {
      await invRef.doc(item.productId).set({
        ...item,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      await movRef.add({
        productId: item.productId,
        productName: item.productName,
        type: 'IN',
        quantity: item.stockCurrent,
        reason: 'Despacho inicial',
        performedBy: 'almacen@demo.local',
        timestamp: admin.firestore.Timestamp.fromDate(data.daysAgo(1)),
        stockSnapshot: item.stockCurrent,
        sourceWarehouseMovementId: null,
      });
    }
  }
  log('inventario por móvil');

  for (const ev of data.AUDIT_EVENTS) {
    await db.collection('audit_logs').add({
      ...ev,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      clientTimestamp: new Date().toISOString(),
      success: true,
    });
  }
  log(`${data.AUDIT_EVENTS.length} audit logs`);
}

(async () => {
  try {
    log('Iniciando seed sobre emuladores…');
    await seedUsers();
    await seedFirestore();
    log('✓ Seed completado.');
    process.exit(0);
  } catch (err) {
    console.error('[seed] ERROR:', err);
    process.exit(1);
  }
})();
