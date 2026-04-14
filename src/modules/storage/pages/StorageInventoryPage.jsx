import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Package, ArrowLeft } from 'lucide-react';
import InventoryList from '../components/InventoryList';
import ProductForm from '../components/ProductForm';
import StockAdjustmentModal from '../components/StockAdjustmentModal';
import ProductDetailModal from '../components/ProductDetailModal';

export default function StorageInventoryPage() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [adjustingProduct, setAdjustingProduct] = useState(null);
  const [viewingProduct, setViewingProduct] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <div className="flex-1 min-w-0 p-6 overflow-y-auto overflow-x-hidden bg-dark-900 h-screen">
      <div className="max-w-7xl mx-auto route-fade">
        <div className="mb-4">
          <Link
            to="/almacen"
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-700 bg-dark-800 text-slate-300 hover:bg-slate-700/70 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver al panel
          </Link>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg border border-blue-500/20">
              <Package className="w-6 h-6 text-blue-300" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Gestion de inventario</h1>
              <p className="text-sm text-slate-400">Administra insumos medicos y equipos de almacen.</p>
            </div>
          </div>
          <button onClick={() => setShowCreateModal(true)} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium">
            <Plus className="w-5 h-5" /> Nuevo producto
          </button>
        </div>

        <InventoryList
          key={refreshKey}
          onEdit={(product) => setEditingProduct(product)}
          onAdjust={(product) => setAdjustingProduct(product)}
          onViewDetail={(product) => setViewingProduct(product)}
        />

        {(showCreateModal || editingProduct) && (
          <ProductForm
            onClose={() => {
              setShowCreateModal(false);
              setEditingProduct(null);
            }}
            onProductCreated={handleRefresh}
            initialData={editingProduct}
          />
        )}

        {adjustingProduct && (
          <StockAdjustmentModal
            product={adjustingProduct}
            onClose={() => setAdjustingProduct(null)}
            onAdjustmentComplete={handleRefresh}
          />
        )}

        {viewingProduct && (
          <ProductDetailModal
            product={viewingProduct}
            onClose={() => setViewingProduct(null)}
          />
        )}
      </div>
    </div>
  );
}
