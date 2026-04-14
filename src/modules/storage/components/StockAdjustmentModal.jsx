import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Save, AlertCircle, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { InventoryService } from '../services/inventory.service';

export default function StockAdjustmentModal({ product, onClose, onAdjustmentComplete }) {
  const { user } = useAuth();
  const [type, setType] = useState('IN');
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState('Compra / Reabastecimiento');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const reasons = type === 'IN'
    ? ['Compra / Reabastecimiento', 'Devolucion', 'Ajuste de inventario', 'Donacion']
    : ['Vencimiento', 'Perdida / Robo', 'Averia', 'Ajuste de inventario', 'Consumo interno'];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await InventoryService.registerMovement(
        product.id,
        type,
        parseInt(quantity, 10),
        reason,
        user?.uid || 'admin'
      );
      onAdjustmentComplete();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 modal-overlay-enter">
      <div className="bg-dark-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden modal-panel-enter">
        <div className="bg-dark-900/40 px-6 py-4 border-b border-slate-700/70 flex justify-between items-center">
          <h2 className="text-lg font-bold text-white">Ajuste de stock</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-200 p-1 hover:bg-slate-700 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-dark-900/60 rounded-xl p-4 border border-slate-700/50">
            <p className="text-sm text-slate-400">Producto: <span className="font-semibold text-white">{product.name}</span></p>
            <p className="text-sm text-slate-400 mt-1">Stock actual: <span className="font-bold text-blue-300">{product.stockCurrent}</span></p>
          </div>

          {error && (
            <div className="bg-red-500/10 text-red-400 border border-red-500/20 p-3 rounded-xl text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 p-1 bg-dark-900 rounded-xl border border-slate-700/50">
            <button
              type="button"
              onClick={() => {
                setType('IN');
                setReason('Compra / Reabastecimiento');
              }}
              className={`py-2.5 px-4 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all ${
                type === 'IN'
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ArrowDownLeft className="w-4 h-4" /> Entrada (+)
            </button>
            <button
              type="button"
              onClick={() => {
                setType('OUT');
                setReason('Vencimiento');
              }}
              className={`py-2.5 px-4 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all ${
                type === 'OUT'
                  ? 'bg-red-500/15 text-red-400 border border-red-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ArrowUpRight className="w-4 h-4" /> Salida (-)
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1.5">Cantidad</label>
            <input
              type="number"
              min="1"
              required
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full bg-dark-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1.5">Motivo</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full bg-dark-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-blue-500"
            >
              {reasons.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-700/60">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`px-5 py-2.5 text-white rounded-lg flex items-center gap-2 font-medium transition-all disabled:opacity-50 ${
                type === 'IN'
                  ? 'bg-emerald-600 hover:bg-emerald-500'
                  : 'bg-red-600 hover:bg-red-500'
              }`}
            >
              <Save className="w-4 h-4" /> {loading ? 'Procesando...' : 'Guardar ajuste'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
