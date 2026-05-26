import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import StorageDashboardPage from '../../modules/storage/pages/StorageDashboardPage';
import StorageInventoryPage from '../../modules/storage/pages/StorageInventoryPage';
import StorageCrewConsumptionPage from '../../modules/storage/pages/StorageCrewConsumptionPage';
import StorageMovementHistoryPage from '../../modules/storage/pages/StorageMovementHistoryPage';
import MobileInventoryOverviewPage from '../../modules/storage/pages/MobileInventoryOverviewPage';
import { StorageDataProvider } from '../../modules/storage/context/StorageDataContext';

export default function StorageModulePage() {
  return (
    <StorageDataProvider>
      <Routes>
        <Route index element={<StorageDashboardPage />} />
        <Route path="inventario" element={<StorageInventoryPage />} />
        <Route path="consumo" element={<StorageCrewConsumptionPage />} />
        <Route path="historial" element={<StorageMovementHistoryPage />} />
        <Route path="moviles" element={<MobileInventoryOverviewPage />} />
        <Route path="*" element={<Navigate to="/almacen" replace />} />
      </Routes>
    </StorageDataProvider>
  );
}
