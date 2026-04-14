import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { collection, limit, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '../../../firebase/config';

const StorageDataContext = createContext(null);

const CACHE_PREFIX = 'lma_storage_cache_';
const CACHE_TTL_MS = 5 * 60 * 1000;

const readCache = (key) => {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.ts || Date.now() - parsed.ts > CACHE_TTL_MS) {
      localStorage.removeItem(CACHE_PREFIX + key);
      return null;
    }
    return parsed.data;
  } catch {
    return null;
  }
};

const writeCache = (key, data) => {
  try {
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ data, ts: Date.now() }));
  } catch {
    // Ignore storage quota errors.
  }
};

export function StorageDataProvider({ children }) {
  const cachedProducts = readCache('products') || [];
  const cachedMovements = readCache('movements') || [];

  const [products, setProducts] = useState(cachedProducts);
  const [movements, setMovements] = useState(cachedMovements);
  const [loadingProducts, setLoadingProducts] = useState(cachedProducts.length === 0);
  const [loadingMovements, setLoadingMovements] = useState(cachedMovements.length === 0);
  const [errorProducts, setErrorProducts] = useState('');
  const [errorMovements, setErrorMovements] = useState('');

  useEffect(() => {
    const productsQuery = query(collection(db, 'products'), orderBy('name'));
    const movementsQuery = query(collection(db, 'movements'), orderBy('timestamp', 'desc'), limit(120));

    const unsubProducts = onSnapshot(
      productsQuery,
      (snapshot) => {
        const next = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
        setProducts(next);
        writeCache('products', next);
        setErrorProducts('');
        setLoadingProducts(false);
      },
      (error) => {
        console.error('Error listening storage products:', error);
        setErrorProducts('No se pudo sincronizar productos desde Firebase.');
        setLoadingProducts(false);
      }
    );

    const unsubMovements = onSnapshot(
      movementsQuery,
      (snapshot) => {
        const next = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
        setMovements(next);
        writeCache('movements', next);
        setErrorMovements('');
        setLoadingMovements(false);
      },
      (error) => {
        console.error('Error listening storage movements:', error);
        setErrorMovements('No se pudo sincronizar historial desde Firebase.');
        setLoadingMovements(false);
      }
    );

    return () => {
      unsubProducts();
      unsubMovements();
    };
  }, []);

  const stats = useMemo(() => {
    let lowStock = 0;
    let expiringSoon = 0;
    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(now.getDate() + 30);

    products.forEach((item) => {
      if ((item.stockCurrent || 0) <= (item.minStock || 0)) lowStock += 1;
      if (item.expirationDate) {
        const expDate = item.expirationDate.toDate ? item.expirationDate.toDate() : new Date(item.expirationDate);
        if (expDate <= thirtyDaysFromNow) expiringSoon += 1;
      }
    });

    return {
      totalProducts: products.length,
      lowStock,
      expiringSoon,
    };
  }, [products]);

  const value = useMemo(() => ({
    products,
    movements,
    stats,
    loadingProducts,
    loadingMovements,
    errorProducts,
    errorMovements,
  }), [
    products,
    movements,
    stats,
    loadingProducts,
    loadingMovements,
    errorProducts,
    errorMovements,
  ]);

  return (
    <StorageDataContext.Provider value={value}>
      {children}
    </StorageDataContext.Provider>
  );
}

export function useStorageData() {
  const ctx = useContext(StorageDataContext);
  if (!ctx) {
    throw new Error('useStorageData must be used within StorageDataProvider');
  }
  return ctx;
}
