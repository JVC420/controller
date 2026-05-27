import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, Package, Plus, History, AlertTriangle, Loader2, X, Save, Search,
} from 'lucide-react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import { MobileInventoryService } from '../modules/storage/services/mobileInventory.service';

const formatTimestamp = (ts) => {
  if (!ts) return '—';
  const date = ts?.toDate ? ts.toDate() : new Date(ts);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(date);
};

const ACTIVE_SOLICITUD_STATES = ['Pendiente', 'Asignado', 'En Traslado', 'En Punto', 'En revisión'];

const ConsumptionModal = ({ mobileId, products, onClose, onDone, user }) => {
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState('');
  const [solicitudId, setSolicitudId] = useState('');
  const [activeSolicitudes, setActiveSolicitudes] = useState([]);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!mobileId) return undefined;
    const q = query(
      collection(db, 'solicitudes'),
      where('ambulanciaAsignada', '==', mobileId),
      where('estado', 'in', ACTIVE_SOLICITUD_STATES),
    );
    const unsub = onSnapshot(q, (snap) => {
      setActiveSolicitudes(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    }, () => setActiveSolicitudes([]));
    return unsub;
  }, [mobileId]);

  const selectedProduct = products.find((p) => p.productId === productId);
  const maxQty = selectedProduct?.stockCurrent || 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!productId) { setError('Selecciona un producto.'); return; }
    if (!reason.trim()) { setError('Indica el motivo del consumo.'); return; }
    const qty = parseInt(quantity, 10);
    if (!Number.isFinite(qty) || qty <= 0) { setError('Cantidad inválida.'); return; }
    if (qty > maxQty) { setError(`Stock insuficiente. Disponible: ${maxQty}.`); return; }

    setSaving(true);
    try {
      await MobileInventoryService.registerConsumption({
        mobileId,
        productId,
        quantity: qty,
        reason: reason.trim(),
        solicitudId: solicitudId || null,
        performedBy: user?.email || user?.uid || null,
      });
      onDone();
      onClose();
    } catch (err) {
      setError(err?.message || 'No se pudo registrar el consumo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-dark-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-dark-900/40 px-6 py-4 border-b border-slate-700/70 flex justify-between items-center">
          <h2 className="text-lg font-bold text-white">Registrar consumo</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-200 p-1 hover:bg-slate-700 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-500/10 text-red-400 border border-red-500/20 p-3 rounded-xl text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1.5">Producto</label>
            <select
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              required
              className="w-full bg-dark-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-blue-500"
            >
              <option value="">Selecciona un producto</option>
              {products
                .filter((p) => (p.stockCurrent || 0) > 0)
                .map((p) => (
                  <option key={p.productId} value={p.productId}>
                    {p.productName} (stock: {p.stockCurrent})
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1.5">
              Cantidad {selectedProduct ? `(máx. ${maxQty})` : ''}
            </label>
            <input
              type="number"
              min="1"
              max={maxQty || undefined}
              required
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full bg-dark-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1.5">Motivo / observación</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ej: aplicación a paciente, vencido, derrame…"
              required
              className="w-full bg-dark-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1.5">
              Servicio asociado <span className="text-slate-600">(opcional)</span>
            </label>
            <select
              value={solicitudId}
              onChange={(e) => setSolicitudId(e.target.value)}
              className="w-full bg-dark-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-blue-500"
            >
              <option value="">Sin servicio asociado</option>
              {activeSolicitudes.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.id} — {s.estado} {s?.pacienteInfo?.nombre ? `· ${s.pacienteInfo.nombre}` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="pt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-700/60"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-lg flex items-center gap-2 font-medium disabled:opacity-50"
            >
              <Save className="w-4 h-4" /> {saving ? 'Guardando…' : 'Registrar consumo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const LeaderInventoryPage = () => {
  const { user, mobileId } = useAuth();
  const [tab, setTab] = useState('stock');
  const [products, setProducts] = useState([]);
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showConsumption, setShowConsumption] = useState(false);

  useEffect(() => {
    if (!mobileId) { setLoading(false); return undefined; }
    let resolved = 0;
    const done = () => { resolved += 1; if (resolved >= 2) setLoading(false); };
    const unsubInv = MobileInventoryService.subscribeMobileInventory(
      mobileId,
      (items) => { setProducts(items); done(); },
      () => done(),
    );
    const unsubMov = MobileInventoryService.subscribeMobileMovements(
      mobileId,
      (items) => { setMovements(items); done(); },
      () => done(),
      100,
    );
    return () => { unsubInv(); unsubMov(); };
  }, [mobileId]);

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) =>
      (p.productName || '').toLowerCase().includes(q)
      || (p.code || '').toLowerCase().includes(q)
      || (p.category || '').toLowerCase().includes(q),
    );
  }, [products, search]);

  if (!mobileId) {
    return (
      <div className="min-h-screen bg-dark-900 flex flex-col items-center justify-center p-6 gap-4 text-center">
        <div className="w-16 h-16 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-300">
          <AlertTriangle size={32} />
        </div>
        <h1 className="text-xl font-bold text-white">Tablet sin móvil asignado</h1>
        <p className="text-slate-400 text-sm max-w-sm">
          Esta tablet no tiene un móvil asignado. Contacta al administrador.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-900 flex flex-col">
      <header className="flex items-center justify-between p-4 md:p-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <Link
            to="/lider"
            className="p-2 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <p className="text-[11px] text-slate-500 uppercase tracking-wider">Inventario móvil</p>
            <p className="text-lg md:text-xl font-bold text-white">{mobileId}</p>
          </div>
        </div>
        <button
          data-tour="leader-consume"
          type="button"
          onClick={() => setShowConsumption(true)}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-semibold"
        >
          <Plus size={16} /> Registrar consumo
        </button>
      </header>

      <div className="border-b border-slate-800 px-4 md:px-6 flex gap-2">
        <button
          type="button"
          onClick={() => setTab('stock')}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            tab === 'stock'
              ? 'border-red-500 text-white'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Package className="inline w-4 h-4 mr-1.5" /> Stock actual
        </button>
        <button
          type="button"
          onClick={() => setTab('history')}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            tab === 'history'
              ? 'border-red-500 text-white'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <History className="inline w-4 h-4 mr-1.5" /> Historial
        </button>
      </div>

      <main className="flex-1 overflow-auto p-4 md:p-6">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-500">
            <Loader2 className="w-6 h-6 animate-spin mr-2" /> Cargando…
          </div>
        ) : tab === 'stock' ? (
          <div className="space-y-3">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nombre, código o categoría…"
                className="w-full bg-dark-800 border border-slate-700 rounded-lg pl-9 pr-3 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            {filteredProducts.length === 0 ? (
              <div className="bg-dark-800 border border-slate-700 rounded-xl p-10 text-center text-slate-500">
                {products.length === 0
                  ? 'El móvil aún no ha recibido medicamentos del almacén.'
                  : 'Ningún producto coincide con la búsqueda.'}
              </div>
            ) : (
              <div className="bg-dark-800 border border-slate-700 rounded-xl overflow-hidden divide-y divide-slate-800">
                {filteredProducts.map((p) => {
                  const low = (p.stockCurrent || 0) <= (p.minStock || 0);
                  return (
                    <div key={p.id} className="p-4 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-white font-semibold truncate">{p.productName}</p>
                        <p className="text-xs text-slate-500 truncate">
                          {p.code ? `${p.code} · ` : ''}{p.category || 'Sin categoría'}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`text-lg font-bold ${low ? 'text-amber-300' : 'text-blue-300'}`}>
                          {p.stockCurrent || 0}
                        </p>
                        <p className="text-[11px] text-slate-500">mín. {p.minStock || 0}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {movements.length === 0 ? (
              <div className="bg-dark-800 border border-slate-700 rounded-xl p-10 text-center text-slate-500">
                Aún no hay movimientos para este móvil.
              </div>
            ) : (
              <div className="bg-dark-800 border border-slate-700 rounded-xl overflow-hidden divide-y divide-slate-800">
                {movements.map((m) => (
                  <div key={m.id} className="p-4 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-white font-semibold truncate">{m.productName}</p>
                      <p className="text-xs text-slate-500 truncate">
                        {m.reason || '—'}
                        {m.solicitudId ? ` · ${m.solicitudId}` : ''}
                        {m.performedBy ? ` · ${m.performedBy}` : ''}
                      </p>
                      <p className="text-[11px] text-slate-600 mt-0.5">{formatTimestamp(m.timestamp)}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                        m.type === 'IN'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : 'bg-red-500/10 text-red-400 border-red-500/20'
                      }`}>
                        {m.type === 'IN' ? `+${m.quantity}` : `-${m.quantity}`}
                      </span>
                      <p className="text-[11px] text-slate-500 mt-1">stock: {m.stockSnapshot ?? '—'}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {showConsumption && (
        <ConsumptionModal
          mobileId={mobileId}
          products={products}
          user={user}
          onClose={() => setShowConsumption(false)}
          onDone={() => { /* listeners auto-actualizan */ }}
        />
      )}
    </div>
  );
};

export default LeaderInventoryPage;
