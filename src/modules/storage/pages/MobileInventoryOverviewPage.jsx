import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Truck, ArrowLeft, Loader2, Search, Package, History, AlertTriangle,
} from 'lucide-react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { MobileInventoryService } from '../services/mobileInventory.service';

const formatTimestamp = (ts) => {
  if (!ts) return '—';
  const date = ts?.toDate ? ts.toDate() : new Date(ts);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(date);
};

export default function MobileInventoryOverviewPage() {
  const [fleet, setFleet] = useState([]);
  const [fleetLoading, setFleetLoading] = useState(true);
  const [selectedMobileId, setSelectedMobileId] = useState(null);
  const [products, setProducts] = useState([]);
  const [movements, setMovements] = useState([]);
  const [tab, setTab] = useState('stock');
  const [search, setSearch] = useState('');
  const [fleetSearch, setFleetSearch] = useState('');
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, 'flota'), orderBy('placa')),
      (snap) => {
        setFleet(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setFleetLoading(false);
      },
      () => setFleetLoading(false),
    );
    return unsub;
  }, []);

  useEffect(() => {
    if (!selectedMobileId) {
      setProducts([]);
      setMovements([]);
      return undefined;
    }
    setDetailLoading(true);
    let resolved = 0;
    const done = () => { resolved += 1; if (resolved >= 2) setDetailLoading(false); };
    const unsubInv = MobileInventoryService.subscribeMobileInventory(
      selectedMobileId,
      (items) => { setProducts(items); done(); },
      () => done(),
    );
    const unsubMov = MobileInventoryService.subscribeMobileMovements(
      selectedMobileId,
      (items) => { setMovements(items); done(); },
      () => done(),
      100,
    );
    return () => { unsubInv(); unsubMov(); };
  }, [selectedMobileId]);

  const selectedMobile = fleet.find((f) => f.id === selectedMobileId);

  const filteredFleet = useMemo(() => {
    const q = fleetSearch.trim().toLowerCase();
    if (!q) return fleet;
    return fleet.filter((f) =>
      (f.placa || '').toLowerCase().includes(q)
      || (f.id || '').toLowerCase().includes(q)
      || (f.tipo || '').toLowerCase().includes(q),
    );
  }, [fleet, fleetSearch]);

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) =>
      (p.productName || '').toLowerCase().includes(q)
      || (p.code || '').toLowerCase().includes(q)
      || (p.category || '').toLowerCase().includes(q),
    );
  }, [products, search]);

  if (selectedMobileId) {
    return (
      <div className="flex-1 min-w-0 p-6 overflow-y-auto bg-dark-900 h-screen">
        <div className="max-w-5xl mx-auto route-fade">
          <button
            type="button"
            onClick={() => setSelectedMobileId(null)}
            className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white mb-4"
          >
            <ArrowLeft size={16} /> Volver a la lista de móviles
          </button>

          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <Truck className="w-6 h-6 text-blue-300" />
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider">Inventario del móvil</p>
              <h1 className="text-2xl font-bold text-white">
                {selectedMobileId}
                {selectedMobile?.tipo && (
                  <span className="ml-2 text-sm text-slate-500 font-normal">· {selectedMobile.tipo}</span>
                )}
              </h1>
              {selectedMobile?.placa && (
                <p className="text-sm text-slate-500 mt-0.5">{selectedMobile.placa}</p>
              )}
            </div>
          </div>

          <div className="mt-4 inline-flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-1.5 text-[11px] text-amber-300">
            <AlertTriangle size={12} /> Vista de solo lectura — los consumos los registra el líder del móvil.
          </div>

          <div className="border-b border-slate-800 mt-6 flex gap-2">
            <button
              type="button"
              onClick={() => setTab('stock')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                tab === 'stock' ? 'border-blue-500 text-white' : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Package className="inline w-4 h-4 mr-1.5" /> Stock actual
            </button>
            <button
              type="button"
              onClick={() => setTab('history')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                tab === 'history' ? 'border-blue-500 text-white' : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <History className="inline w-4 h-4 mr-1.5" /> Historial
            </button>
          </div>

          <div className="mt-4">
            {detailLoading ? (
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
                      ? 'Este móvil aún no ha recibido medicamentos del almacén.'
                      : 'Ningún producto coincide con la búsqueda.'}
                  </div>
                ) : (
                  <div className="bg-dark-800 border border-slate-700 rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="text-[11px] text-slate-400 bg-dark-900/60 font-semibold uppercase tracking-wider">
                        <tr>
                          <th className="px-4 py-3 text-left">Producto</th>
                          <th className="px-4 py-3 text-left">Código</th>
                          <th className="px-4 py-3 text-left">Categoría</th>
                          <th className="px-4 py-3 text-right">Stock</th>
                          <th className="px-4 py-3 text-right">Mín.</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/80">
                        {filteredProducts.map((p) => {
                          const low = (p.stockCurrent || 0) <= (p.minStock || 0);
                          return (
                            <tr key={p.id} className="hover:bg-slate-800/20">
                              <td className="px-4 py-3 text-white font-medium">{p.productName}</td>
                              <td className="px-4 py-3 text-slate-400 font-mono text-xs">{p.code || '—'}</td>
                              <td className="px-4 py-3 text-slate-400">{p.category || '—'}</td>
                              <td className={`px-4 py-3 text-right font-bold ${low ? 'text-amber-300' : 'text-blue-300'}`}>
                                {p.stockCurrent || 0}
                              </td>
                              <td className="px-4 py-3 text-right text-slate-500">{p.minStock || 0}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
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
                  <div className="bg-dark-800 border border-slate-700 rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="text-[11px] text-slate-400 bg-dark-900/60 font-semibold uppercase tracking-wider">
                        <tr>
                          <th className="px-4 py-3 text-left">Fecha</th>
                          <th className="px-4 py-3 text-left">Producto</th>
                          <th className="px-4 py-3 text-left">Tipo</th>
                          <th className="px-4 py-3 text-right">Cant.</th>
                          <th className="px-4 py-3 text-left">Motivo</th>
                          <th className="px-4 py-3 text-left">Responsable</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/80">
                        {movements.map((m) => (
                          <tr key={m.id} className="hover:bg-slate-800/20">
                            <td className="px-4 py-3 text-slate-400 whitespace-nowrap">{formatTimestamp(m.timestamp)}</td>
                            <td className="px-4 py-3 text-white">{m.productName}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                                m.type === 'IN'
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                  : 'bg-red-500/10 text-red-400 border-red-500/20'
                              }`}>
                                {m.type === 'IN' ? 'Entrada' : 'Salida'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-slate-300">
                              {m.type === 'IN' ? '+' : '−'}{m.quantity}
                            </td>
                            <td className="px-4 py-3 text-slate-400">
                              {m.reason || '—'}
                              {m.solicitudId ? <span className="text-cyan-300 font-mono text-xs ml-1">· {m.solicitudId}</span> : null}
                            </td>
                            <td className="px-4 py-3 text-slate-400 text-xs">{m.performedBy || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-w-0 p-6 overflow-y-auto bg-dark-900 h-screen">
      <div className="max-w-5xl mx-auto route-fade">
        <Link to="/almacen" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white mb-4">
          <ArrowLeft size={16} /> Volver al panel de almacén
        </Link>

        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <Truck className="w-6 h-6 text-blue-300" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Inventarios por móvil</h1>
            <p className="text-sm text-slate-400">Consulta el stock que cada ambulancia tiene actualmente.</p>
          </div>
        </div>

        <div className="relative mb-4">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={fleetSearch}
            onChange={(e) => setFleetSearch(e.target.value)}
            placeholder="Buscar móvil por placa, ID o tipo…"
            className="w-full bg-dark-800 border border-slate-700 rounded-lg pl-9 pr-3 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        {fleetLoading ? (
          <div className="flex items-center justify-center py-20 text-slate-500">
            <Loader2 className="w-6 h-6 animate-spin mr-2" /> Cargando flota…
          </div>
        ) : filteredFleet.length === 0 ? (
          <div className="bg-dark-800 border border-slate-700 rounded-xl p-10 text-center text-slate-500">
            No se encontraron móviles.
          </div>
        ) : (
          <div data-tour="mobile-overview-list" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredFleet.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => { setSelectedMobileId(f.id); setTab('stock'); setSearch(''); }}
                className="text-left bg-dark-800 border border-slate-700 hover:border-blue-500/40 rounded-xl p-4 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/10 rounded-lg group-hover:bg-blue-500/20">
                    <Truck className="w-5 h-5 text-blue-300" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-white font-semibold truncate">{f.id}</p>
                    {f.placa && (
                      <p className="text-xs text-slate-500 truncate">{f.placa}</p>
                    )}
                    <p className="text-[11px] text-slate-600 truncate">
                      {f.tipo || 'Ambulancia'} · {f.estado || 'Sin estado'}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
