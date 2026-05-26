import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  limit,
} from 'firebase/firestore';
import { db, auth } from '../../../firebase/config';
import { logEvent } from '../../../services/auditService';

const mobileInventoryCol = (mobileId) => collection(db, 'flota', mobileId, 'inventario');
const mobileInventoryDoc = (mobileId, productId) => doc(db, 'flota', mobileId, 'inventario', productId);
const mobileMovementsCol = (mobileId) => collection(db, 'flota', mobileId, 'movements');

export const MobileInventoryService = {
  /**
   * Almacén → Móvil. Operación atómica:
   *  - Debita products/{productId}.stockCurrent
   *  - Crea movements/{...} (lado almacén, con destinationMobileId)
   *  - Suma flota/{mobileId}/inventario/{productId}.stockCurrent (upsert)
   *  - Crea flota/{mobileId}/movements/{...} type='IN'
   */
  async dispatchFromWarehouseToMobile({
    productId,
    mobileId,
    quantity,
    reason = 'Despacho a móvil',
    dispatchedBy,
  }) {
    if (!productId) throw new Error('Producto requerido.');
    if (!mobileId) throw new Error('Móvil destino requerido.');
    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty <= 0) throw new Error('Cantidad inválida.');

    const productRef = doc(db, 'products', productId);
    const mobileInvRef = mobileInventoryDoc(mobileId, productId);
    const warehouseMovementRef = doc(collection(db, 'movements'));
    const mobileMovementRef = doc(mobileMovementsCol(mobileId));

    let summary = null;

    await runTransaction(db, async (tx) => {
      const productSnap = await tx.get(productRef);
      if (!productSnap.exists()) throw new Error('El producto no existe.');

      const product = productSnap.data();
      const warehouseStock = Number(product.stockCurrent) || 0;
      if (warehouseStock < qty) {
        throw new Error(`Stock insuficiente en almacén. Disponible: ${warehouseStock}, Solicitado: ${qty}`);
      }
      const warehouseNew = warehouseStock - qty;

      const mobileInvSnap = await tx.get(mobileInvRef);
      const mobileStock = mobileInvSnap.exists() ? Number(mobileInvSnap.data().stockCurrent) || 0 : 0;
      const mobileNew = mobileStock + qty;

      tx.update(productRef, { stockCurrent: warehouseNew, updatedAt: serverTimestamp() });

      tx.set(warehouseMovementRef, {
        productId,
        productName: product.name || '',
        type: 'OUT',
        quantity: qty,
        reason,
        performedBy: dispatchedBy || auth.currentUser?.email || 'system',
        performedByUid: auth.currentUser?.uid || null,
        timestamp: serverTimestamp(),
        stockSnapshot: warehouseNew,
        destinationMobileId: mobileId,
        linkedMobileMovementId: mobileMovementRef.id,
      });

      if (mobileInvSnap.exists()) {
        tx.update(mobileInvRef, {
          stockCurrent: mobileNew,
          updatedAt: serverTimestamp(),
        });
      } else {
        tx.set(mobileInvRef, {
          productId,
          productName: product.name || '',
          code: product.code || '',
          category: product.category || '',
          minStock: Number(product.minStock) || 0,
          stockCurrent: mobileNew,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      tx.set(mobileMovementRef, {
        productId,
        productName: product.name || '',
        type: 'IN',
        quantity: qty,
        reason,
        performedBy: dispatchedBy || auth.currentUser?.email || 'system',
        performedByUid: auth.currentUser?.uid || null,
        timestamp: serverTimestamp(),
        stockSnapshot: mobileNew,
        sourceWarehouseMovementId: warehouseMovementRef.id,
      });

      summary = {
        productId,
        productName: product.name || '',
        quantity: qty,
        warehouseStockBefore: warehouseStock,
        warehouseStockAfter: warehouseNew,
        mobileStockBefore: mobileStock,
        mobileStockAfter: mobileNew,
      };
    });

    if (summary) {
      await logEvent({
        action: 'business',
        entity: 'mobile_inventory',
        entityId: `${mobileId}/${productId}`,
        metadata: { event: 'warehouse_to_mobile_dispatch', mobileId, reason, ...summary },
      });
    }

    return { success: true, summary };
  },

  /**
   * Consumo dentro de la ambulancia (móvil → paciente / uso final).
   *  - Debita flota/{mobileId}/inventario/{productId}
   *  - Crea flota/{mobileId}/movements/{...} type='OUT'
   */
  async registerConsumption({
    mobileId,
    productId,
    quantity,
    reason,
    solicitudId = null,
    performedBy,
  }) {
    if (!mobileId) throw new Error('Móvil requerido.');
    if (!productId) throw new Error('Producto requerido.');
    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty <= 0) throw new Error('Cantidad inválida.');
    if (!reason || !String(reason).trim()) throw new Error('Motivo requerido.');

    const invRef = mobileInventoryDoc(mobileId, productId);
    const movRef = doc(mobileMovementsCol(mobileId));

    let summary = null;

    await runTransaction(db, async (tx) => {
      const invSnap = await tx.get(invRef);
      if (!invSnap.exists()) throw new Error('Este producto no está en el inventario del móvil.');

      const data = invSnap.data();
      const before = Number(data.stockCurrent) || 0;
      if (before < qty) {
        throw new Error(`Stock insuficiente en móvil. Disponible: ${before}, Solicitado: ${qty}`);
      }
      const after = before - qty;

      tx.update(invRef, {
        stockCurrent: after,
        updatedAt: serverTimestamp(),
      });

      tx.set(movRef, {
        productId,
        productName: data.productName || '',
        type: 'OUT',
        quantity: qty,
        reason: String(reason).trim(),
        performedBy: performedBy || auth.currentUser?.email || null,
        performedByUid: auth.currentUser?.uid || null,
        timestamp: serverTimestamp(),
        stockSnapshot: after,
        solicitudId: solicitudId || null,
      });

      summary = {
        productId,
        productName: data.productName || '',
        quantity: qty,
        stockBefore: before,
        stockAfter: after,
        solicitudId: solicitudId || null,
      };
    });

    if (summary) {
      await logEvent({
        action: 'business',
        entity: 'mobile_inventory',
        entityId: `${mobileId}/${productId}`,
        metadata: { event: 'mobile_consumption', mobileId, reason, ...summary },
      });
    }

    return { success: true, summary };
  },

  async getMobileInventory(mobileId) {
    if (!mobileId) return [];
    const snap = await getDocs(query(mobileInventoryCol(mobileId), orderBy('productName')));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  },

  subscribeMobileInventory(mobileId, onChange, onError) {
    if (!mobileId) return () => {};
    return onSnapshot(
      query(mobileInventoryCol(mobileId), orderBy('productName')),
      (snap) => onChange(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      onError
    );
  },

  subscribeMobileMovements(mobileId, onChange, onError, max = 50) {
    if (!mobileId) return () => {};
    return onSnapshot(
      query(mobileMovementsCol(mobileId), orderBy('timestamp', 'desc'), limit(max)),
      (snap) => onChange(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      onError
    );
  },
};
