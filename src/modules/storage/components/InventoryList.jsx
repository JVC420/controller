import React, { useMemo, useState } from 'react';
import { AlertCircle, Package, Search, Pencil, ArrowRightLeft, Eye, X } from 'lucide-react';

const CATEGORY_OPTIONS = ['Medicamento', 'Dispositivo', 'Reactivo', 'Gas'];
const STATUS_OPTIONS = [
  { value: 'available', label: 'Disponible' },
  { value: 'low', label: 'Bajo stock' },
  { value: 'out', label: 'Agotado' },
];

function getStatusValue(stock, min) {
  if (stock <= 0) return 'out';
  if (stock <= min) return 'low';
  return 'available';
}

function getStockColor(current, min) {
  if (current <= 0) return 'bg-red-500/15 text-red-400 border border-red-500/20';
  if (current <= min) return 'bg-amber-500/15 text-amber-400 border border-amber-500/20';
  return 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20';
}

function StatusBadge({ stock, min }) {
  if (stock <= 0) {
    return (
      <span className="flex items-center gap-1 text-red-400 text-xs">
        <AlertCircle className="w-3.5 h-3.5" /> Agotado
      </span>
    );
  }
  if (stock <= min) return <span className="text-amber-400 text-xs">Bajo stock</span>;
  return <span className="text-emerald-400 text-xs">Disponible</span>;
}

export default function InventoryList({ products = [], loading = false, error = '', onEdit, onAdjust, onViewDetail }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const availableCategories = useMemo(() => {
    const set = new Set();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    CATEGORY_OPTIONS.forEach((c) => set.add(c));
    return Array.from(set).sort();
  }, [products]);

  const filteredProducts = useMemo(() => {
    const query = searchTerm.toLowerCase();
    return products.filter((p) => {
      const matchesQuery =
        (p.name || '').toLowerCase().includes(query) ||
        (p.code || '').toLowerCase().includes(query);
      if (!matchesQuery) return false;

      if (categoryFilter !== 'all') {
        const productCategory = p.category || 'Medicamento';
        if (productCategory !== categoryFilter) return false;
      }

      if (statusFilter !== 'all') {
        const status = getStatusValue(p.stockCurrent, p.minStock);
        if (status !== statusFilter) return false;
      }

      return true;
    });
  }, [products, searchTerm, statusFilter, categoryFilter]);

  const hasActiveFilters = statusFilter !== 'all' || categoryFilter !== 'all' || searchTerm.length > 0;
  const clearFilters = () => {
    setStatusFilter('all');
    setCategoryFilter('all');
    setSearchTerm('');
  };

  if (loading) {
    return (
      <div className="p-8 flex flex-col items-center justify-center text-gray-500 gap-3">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <span>Cargando inventario...</span>
      </div>
    );
  }

  return (
    <div className="bg-dark-800 border border-slate-700 rounded-xl overflow-hidden">
      {error && (
        <div className="mx-4 mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="p-4 border-b border-slate-700/70 flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <h2 className="text-lg font-semibold text-gray-200 flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-400" /> Inventario general
            <span className="text-xs font-normal text-slate-400 bg-dark-900 px-2 py-0.5 rounded-full border border-slate-700">
              {filteredProducts.length}
            </span>
          </h2>
          <div className="relative w-full sm:w-72">
            <input
              type="text"
              placeholder="Buscar por nombre o codigo..."
              className="w-full bg-dark-900 border border-slate-700 rounded-lg py-2.5 pl-10 pr-3 text-sm text-white focus:outline-none focus:border-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
          <div className="flex-1 min-w-0">
            <label className="block text-xs font-medium text-slate-400 mb-1">Estado</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-dark-900 border border-slate-700 rounded-lg py-2 px-3 text-sm text-white focus:outline-none focus:border-blue-500"
            >
              <option value="all">Todos los estados</option>
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-0">
            <label className="block text-xs font-medium text-slate-400 mb-1">Categoria</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full bg-dark-900 border border-slate-700 rounded-lg py-2 px-3 text-sm text-white focus:outline-none focus:border-blue-500"
            >
              <option value="all">Todas las categorias</option>
              {availableCategories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-slate-700 bg-dark-900 text-slate-300 hover:bg-slate-700/70 hover:text-white transition-colors text-sm"
            >
              <X className="w-4 h-4" /> Limpiar
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[900px]">
          <thead>
            <tr className="bg-dark-900/50 text-slate-400 text-sm border-b border-slate-700">
              <th className="py-3 px-4 font-semibold">Codigo</th>
              <th className="py-3 px-4 font-semibold">Producto</th>
              <th className="py-3 px-4 font-semibold">Categoria</th>
              <th className="py-3 px-4 font-semibold">Presentacion</th>
              <th className="py-3 px-4 font-semibold text-center">Stock</th>
              <th className="py-3 px-4 font-semibold">Estado</th>
              <th className="py-3 px-4 font-semibold text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50">
            {filteredProducts.length > 0 ? (
              filteredProducts.map((product) => (
                <tr key={product.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-4 font-mono text-slate-400 text-xs">{product.code}</td>
                  <td className="py-3 px-4 font-medium text-gray-200">{product.name}</td>
                  <td className="py-3 px-4 text-xs">
                    <span className="px-2 py-1 rounded border border-slate-700 bg-slate-800/50 text-gray-300">
                      {product.category || 'Medicamento'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-400">{product.presentation || 'N/A'}</td>
                  <td className="py-3 px-4 text-center">
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${getStockColor(product.stockCurrent, product.minStock)}`}>
                      {product.stockCurrent}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <StatusBadge stock={product.stockCurrent} min={product.minStock} />
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => onViewDetail(product)}
                        className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-all"
                        title="Ver detalles"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onAdjust(product)}
                        className="p-2 text-blue-400/70 hover:text-blue-300 hover:bg-blue-500/10 rounded-lg transition-all"
                        title="Ajustar stock"
                      >
                        <ArrowRightLeft className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onEdit(product)}
                        className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-700 rounded-lg transition-all"
                        title="Editar producto"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" className="text-center text-slate-500 py-12">
                  <Package className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                  No se encontraron productos.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
