import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Save, AlertCircle, ArrowUpRight, ArrowDownLeft, Truck } from 'lucide-react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { useAuth } from '../../../contexts/AuthContext';
import { InventoryService } from '../services/inventory.service';
import { MobileInventoryService } from '../services/mobileInventory.service';

const OUT_REASONS = ['Vencimiento', 'Perdida / Robo', 'Averia', 'Ajuste de inventario', 'Consumo interno'];
const IN_REASONS = ['Compra / Reabastecimiento', 'Devolucion', 'Ajuste de inventario', 'Donacion'];
const DISPATCH_REASONS = ['Reposición de móvil', 'Despacho inicial', 'Solicitud del líder', 'Ajuste por turno'];

export default function StockAdjustmentModal({ product, onClose, onAdjustmentComplete }) {
  const { user } = useAuth();
  const [mode, setMode] = useState('IN'); // 'IN' | 'OUT' | 'DISPATCH'
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState(IN_REASONS[0]);
  const [destinationMobileId, setDestinationMobileId] = useState('');
  const [fleet, setFleet] = useState([]);
  const [fleetLoading, setFleetLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const loadFleet = async () => {
      setFleetLoading(true);
      try {
        const snap = await getDocs(query(collection(db, 'flota'), orderBy('placa')));
        if (!cancelled) {
          setFleet(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        }
      } catch {
        // ignore — el modo dispatch simplemente quedará sin móviles disponibles
      } finally {
        if (!cancelled) setFleetLoading(false);
      }
    };
    loadFleet();
    return () => { cancelled = true; };
  }, []);

  const selectMode = (next) => {
    setMode(next);
    if (next === 'IN') setReason(IN_REASONS[0]);
    else if (next === 'OUT') setReason(OUT_REASONS[0]);
    else setReason(DISPATCH_REASONS[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const qty = parseInt(quantity, 10);
    if (!Number.isFinite(qty) || qty <= 0) {
      setError('Cantidad inválida.');
      setLoading(false);
      return;
    }

    try {
      if (mode === 'DISPATCH') {
        if (!destinationMobileId) throw new Error('Selecciona el móvil destino.');
        await MobileInventoryService.dispatchFromWarehouseToMobile({
          productId: product.id,
          mobileId: destinationMobileId,
          quantity: qty,
          reason,
          dispatchedBy: user?.email || user?.uid || 'almacen',
        });
      } else {
        await InventoryService.registerMovement(
          product.id,
          mode,
          qty,
          reason,
          user?.uid || 'admin'
        );
      }
      onAdjustmentComplete();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const reasons = mode === 'IN' ? IN_REASONS : mode === 'OUT' ? OUT_REASONS : DISPATCH_REASONS;
  const submitColor = mode === 'IN'
    ? 'bg-emerald-600 hover:bg-emerald-500'
    : mode === 'OUT'
      ? 'bg-red-600 hover:bg-red-500'
      : 'bg-blue-600 hover:bg-blue-500';
  const submitLabel = mode === 'DISPATCH' ? 'Despachar a móvil' : 'Guardar ajuste';

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

          <div className="grid grid-cols-3 gap-2 p-1 bg-dark-900 rounded-xl border border-slate-700/50">
            <button
              type="button"
              onClick={() => selectMode('IN')}
              className={`py-2.5 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
                mode === 'IN'
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ArrowDownLeft className="w-4 h-4" /> Entrada
            </button>
            <button
              type="button"
              onClick={() => selectMode('OUT')}
              className={`py-2.5 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
                mode === 'OUT'
                  ? 'bg-red-500/15 text-red-400 border border-red-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ArrowUpRight className="w-4 h-4" /> Salida
            </button>
            <button
              type="button"
              onClick={() => selectMode('DISPATCH')}
              className={`py-2.5 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
                mode === 'DISPATCH'
                  ? 'bg-blue-500/15 text-blue-400 border border-blue-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Truck className="w-4 h-4" /> A móvil
            </button>
          </div>

          {mode === 'DISPATCH' && (
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1.5">Móvil destino</label>
              <select
                value={destinationMobileId}
                onChange={(e) => setDestinationMobileId(e.target.value)}
                required
                className="w-full bg-dark-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-blue-500"
              >
                <option value="">{fleetLoading ? 'Cargando móviles...' : 'Selecciona un móvil'}</option>
                {fleet.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.placa || f.id} — {f.tipo || 'Ambulancia'}
                  </option>
                ))}
              </select>
            </div>
          )}

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
              className={`px-5 py-2.5 text-white rounded-lg flex items-center gap-2 font-medium transition-all disabled:opacity-50 ${submitColor}`}
            >
              <Save className="w-4 h-4" /> {loading ? 'Procesando...' : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
