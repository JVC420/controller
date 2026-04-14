import {
  collection,
  doc,
  runTransaction,
  serverTimestamp,
  getDocs,
  query,
  orderBy,
  addDoc,
  where,
  limit,
  updateDoc,
  getCountFromServer,
} from 'firebase/firestore';
import { db } from '../../../firebase/config';

export const InventoryService = {
  getCategoryCodeMeta(category) {
    const normalized = String(category || '').trim().toLowerCase();

    if (normalized === 'dispositivo') {
      return { prefix: 'DIS', counterDocId: 'products_dispositivo' };
    }
    if (normalized === 'reactivo') {
      return { prefix: 'REACT', counterDocId: 'products_reactivo' };
    }
    if (normalized === 'gas') {
      return { prefix: 'GAS', counterDocId: 'products_gas' };
    }

    return { prefix: 'MED', counterDocId: 'products_medicamento' };
  },

  async getProducts() {
    const q = query(collection(db, 'products'), orderBy('name'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
  },

  async getDashboardStats() {
    const coll = collection(db, 'products');
    const snapshot = await getCountFromServer(coll);
    const totalProducts = snapshot.data().count;

    const allDocs = await getDocs(query(coll));

    let lowStock = 0;
    let expired = 0;
    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(now.getDate() + 30);

    allDocs.forEach((item) => {
      const data = item.data();
      if (data.stockCurrent <= (data.minStock || 0)) lowStock += 1;
      if (data.expirationDate) {
        const expDate = data.expirationDate.toDate ? data.expirationDate.toDate() : new Date(data.expirationDate);
        if (expDate <= thirtyDaysFromNow) expired += 1;
      }
    });

    return { totalProducts, lowStock, expiringSoon: expired };
  },

  async getMovements(limitCount = 50) {
    const q = query(collection(db, 'movements'), orderBy('timestamp', 'desc'), limit(limitCount));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
  },

  async generateNextCode(category) {
    const { prefix, counterDocId } = this.getCategoryCodeMeta(category);
    const counterRef = doc(db, 'counters', counterDocId);

    try {
      const newCode = await runTransaction(db, async (transaction) => {
        const counterDoc = await transaction.get(counterRef);
        let newCount = 1;

        if (counterDoc.exists()) {
          newCount = (counterDoc.data().current || 0) + 1;
        }

        transaction.set(counterRef, { current: newCount }, { merge: true });
        return newCount;
      });

      return `${prefix}-${String(newCode).padStart(4, '0')}`;
    } catch (error) {
      console.error('Error generating code:', error);
      return `${prefix}-${Math.floor(Math.random() * 10000)}`;
    }
  },

  async assertCodeAvailable(code, excludeProductId = null) {
    const normalizedCode = String(code || '').trim();
    if (!normalizedCode) {
      throw new Error('El codigo del producto es obligatorio.');
    }

    const productsRef = collection(db, 'products');
    const duplicateCodeQuery = query(productsRef, where('code', '==', normalizedCode));
    const querySnapshot = await getDocs(duplicateCodeQuery);

    const hasConflict = querySnapshot.docs.some((item) => item.id !== excludeProductId);
    if (hasConflict) {
      throw new Error(`El codigo del producto ${normalizedCode} ya existe.`);
    }
  },

  async createProduct(productData) {
    const productsRef = collection(db, 'products');
    await this.assertCodeAvailable(productData.code);

    const newProduct = {
      ...productData,
      code: String(productData.code || '').trim(),
      stockCurrent: Number(productData.stockCurrent) || 0,
      minStock: Number(productData.minStock) || 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const docRef = await addDoc(productsRef, newProduct);
    return { id: docRef.id, ...newProduct };
  },

  async updateProduct(productId, updates) {
    await this.assertCodeAvailable(updates.code, productId);

    const productRef = doc(db, 'products', productId);
    await updateDoc(productRef, {
      ...updates,
      code: String(updates.code || '').trim(),
      updatedAt: serverTimestamp(),
    });
  },

  async registerMovement(productId, type, quantity, reason, userId, extraData = null) {
    if (quantity <= 0) throw new Error('La cantidad debe ser mayor a 0.');

    const productRef = doc(db, 'products', productId);
    const movementsRef = collection(db, 'movements');

    await runTransaction(db, async (transaction) => {
      const productDoc = await transaction.get(productRef);

      if (!productDoc.exists()) throw new Error('El producto no existe.');

      const currentStock = productDoc.data().stockCurrent || 0;
      const productName = productDoc.data().name;
      let newStock = currentStock;

      if (type === 'OUT') {
        if (currentStock < quantity) {
          throw new Error(`Stock insuficiente. Disponible: ${currentStock}, Solicitado: ${quantity}`);
        }
        newStock = currentStock - quantity;
      } else if (type === 'IN') {
        newStock = currentStock + quantity;
      } else {
        throw new Error("Tipo de movimiento no valido. Use 'IN' o 'OUT'.");
      }

      transaction.update(productRef, {
        stockCurrent: newStock,
        updatedAt: serverTimestamp(),
      });

      const newMovementRef = doc(movementsRef);
      const payload = {
        productId,
        productName,
        type,
        quantity,
        reason,
        performedBy: userId,
        timestamp: serverTimestamp(),
        stockSnapshot: newStock,
      };

      if (extraData && typeof extraData === 'object') {
        Object.assign(payload, extraData);
      }

      transaction.set(newMovementRef, payload);
    });

    return { success: true, message: 'Inventario actualizado correctamente.' };
  },
};
