import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, onSnapshot } from 'firebase/firestore';
import { Search, ShoppingCart, Trash2, CheckCircle, AlertTriangle, Activity, ArrowLeft, Truck, UserRound } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { db } from '../../../firebase/config';
import { InventoryService } from '../services/inventory.service';
import { useStorageData } from '../context/StorageDataContext';

export default function StorageCrewConsumptionPage() {
  const { user } = useAuth();
  const { products, loadingProducts, errorProducts } = useStorageData();
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState([]);
  const [consumptionMode, setConsumptionMode] = useState('ambulance');
  const [fleet, setFleet] = useState([]);
  const [selectedAmbulanceId, setSelectedAmbulanceId] = useState('');
  const [loadingFleet, setLoadingFleet] = useState(true);
  const [errorFleet, setErrorFleet] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  React.useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'flota'),
      (snapshot) => {
        const next = snapshot.docs
          .map((item) => ({ id: item.id, ...item.data() }))
          .sort((a, b) => String(a.id || '').localeCompare(String(b.id || '')));

        setFleet(next);
        setErrorFleet('');
        setLoadingFleet(false);
      },
      (error) => {
        console.error('Error listening fleet for storage consumption:', error);
        setErrorFleet('No se pudo cargar la flota de ambulancias.');
        setLoadingFleet(false);
      }
    );

    return () => unsub();
  }, []);

  React.useEffect(() => {
    if (consumptionMode === 'personal') {
      setSelectedAmbulanceId('');
    }
  }, [consumptionMode]);

  const filteredProducts = useMemo(() => {
    if (!searchTerm) return [];
    const term = searchTerm.toLowerCase();
    return products.filter((p) => {
      const name = (p.name || '').toLowerCase();
      const marca = (p.marca || '').toLowerCase();
      const batch = (p.batchNumber || '').toLowerCase();
      const code = (p.code || '').toLowerCase();
      return name.includes(term) || marca.includes(term) || batch.includes(term) || code.includes(term);
    });
  }, [products, searchTerm]);

  const addToCart = (product) => {
    const exists = cart.find((item) => item.product.id === product.id);
    if (exists) return;
    setCart([...cart, { product, quantity: 1 }]);
    setSearchTerm('');
  };

  const updateQuantity = (productId, newQty) => {
    setCart(cart.map((item) => {
      if (item.product.id !== productId) return item;
      if (newQty > item.product.stockCurrent) return item;
      return { ...item, quantity: Math.max(1, newQty) };
    }));
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter((item) => item.product.id !== productId));
  };

  const handleSubmit = async () => {
    if (cart.length === 0) return;

    if (consumptionMode === 'ambulance' && !selectedAmbulanceId) {
      setMessage({ type: 'error', text: 'Debes seleccionar una ambulancia para registrar consumo por flota.' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      for (const item of cart) {
        const movementContext = consumptionMode === 'ambulance'
          ? {
            consumptionType: 'ambulance',
            ambulanceId: selectedAmbulanceId,
          }
          : {
            consumptionType: 'personal',
          };

        await InventoryService.registerMovement(
          item.product.id,
          'OUT',
          item.quantity,
          consumptionMode === 'ambulance' ? 'Consumo por ambulancia' : 'Consumo personal',
          user?.uid || 'anonymous',
          movementContext
        );
      }
      setCart([]);
      setSelectedAmbulanceId('');
      setMessage({ type: 'success', text: 'Consumo registrado correctamente.' });
    } catch (error) {
      setMessage({ type: 'error', text: `Error al registrar consumo: ${error.message}` });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 min-w-0 p-6 overflow-y-auto overflow-x-hidden bg-dark-900 h-screen">
      <div className="max-w-3xl mx-auto route-fade">
        <div className="mb-4">
          <Link
            to="/almacen"
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-700 bg-dark-800 text-slate-300 hover:bg-slate-700/70 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver al panel
          </Link>
        </div>

        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
            <Activity className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Reporte de consumo</h1>
            <p className="text-sm text-slate-400">Registra uso de insumos por tripulacion</p>
          </div>
        </div>

        {errorProducts && (
          <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {errorProducts}
          </div>
        )}

        {loadingProducts && (
          <div className="mb-4 rounded-lg border border-slate-700 bg-dark-800 px-3 py-2 text-sm text-slate-300">
            Cargando inventario desde Firebase...
          </div>
        )}

        {errorFleet && (
          <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {errorFleet}
          </div>
        )}

        <div className="mb-6 rounded-xl border border-slate-700 bg-dark-800 p-4 space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-200">Tipo de consumo</h2>
            <p className="text-xs text-slate-500 mt-1">Selecciona si el consumo corresponde a una ambulancia o a uso personal.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setConsumptionMode('ambulance')}
              className={`p-3 rounded-lg border text-left transition-colors ${
                consumptionMode === 'ambulance'
                  ? 'border-blue-500/40 bg-blue-500/10 text-blue-200'
                  : 'border-slate-700 bg-dark-900 text-slate-300 hover:bg-slate-800/70'
              }`}
            >
              <span className="inline-flex items-center gap-2 text-sm font-semibold">
                <Truck className="w-4 h-4" /> Consumo por ambulancia
              </span>
              <p className="text-xs mt-1 opacity-80">Queda trazado el movil que uso el insumo.</p>
            </button>

            <button
              type="button"
              onClick={() => setConsumptionMode('personal')}
              className={`p-3 rounded-lg border text-left transition-colors ${
                consumptionMode === 'personal'
                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
                  : 'border-slate-700 bg-dark-900 text-slate-300 hover:bg-slate-800/70'
              }`}
            >
              <span className="inline-flex items-center gap-2 text-sm font-semibold">
                <UserRound className="w-4 h-4" /> Consumo personal
              </span>
              <p className="text-xs mt-1 opacity-80">Registra salida sin asociar ambulancia.</p>
            </button>
          </div>

          {consumptionMode === 'ambulance' && (
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1.5">Ambulancia (movil) *</label>
              <select
                value={selectedAmbulanceId}
                onChange={(e) => setSelectedAmbulanceId(e.target.value)}
                disabled={loadingFleet || fleet.length === 0}
                className="w-full bg-dark-900 border border-slate-700 rounded-lg py-2.5 px-3 text-white focus:outline-none focus:border-blue-500 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <option value="">Seleccionar movil...</option>
                {fleet.map((ambulance) => (
                  <option key={ambulance.id} value={ambulance.id}>
                    {ambulance.id}{ambulance.tipo ? ` - ${ambulance.tipo}` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="mb-8 relative">
          <label className="block text-sm font-medium text-slate-400 mb-2">Buscar insumo</label>
          <div className="relative">
            <input
              type="text"
              className="w-full bg-dark-800 border border-slate-700 rounded-lg py-2.5 pl-10 pr-3 text-white focus:outline-none focus:border-blue-500"
              placeholder="Escribe el nombre del medicamento..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search className="w-5 h-5 text-slate-500 absolute left-3 top-3" />
          </div>

          {searchTerm && (
            <div className="absolute z-10 w-full mt-2 bg-dark-800 border border-slate-700 rounded-xl shadow-2xl max-h-60 overflow-y-auto">
              {filteredProducts.length > 0 ? (
                filteredProducts.map((product) => (
                  <button
                    key={product.id}
                    onClick={() => addToCart(product)}
                    className="w-full text-left px-4 py-3 hover:bg-slate-800/80 flex justify-between items-center border-b border-slate-700/40 last:border-0 transition-colors"
                  >
                    <div className="min-w-0 flex-1 pr-3">
                      <div className="font-medium text-slate-200 truncate">{product.name}</div>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                        {product.code && (
                          <span className="text-xs font-mono text-slate-300">{product.code}</span>
                        )}
                        {product.marca && (
                          <span className="text-xs text-blue-300">{product.marca}</span>
                        )}
                        {product.batchNumber && (
                          <span className="text-xs text-amber-300/90">Lote: {product.batchNumber}</span>
                        )}
                        {product.presentation && (
                          <span className="text-xs text-slate-500">{product.presentation}</span>
                        )}
                      </div>
                    </div>
                    <span className={`shrink-0 px-2 py-0.5 rounded text-xs border ${product.stockCurrent > 0 ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' : 'bg-red-500/15 text-red-400 border-red-500/20'}`}>
                      Stock: {product.stockCurrent}
                    </span>
                  </button>
                ))
              ) : (
                <div className="p-4 text-slate-500 text-center">No se encontraron productos.</div>
              )}
            </div>
          )}
        </div>

        <div className="bg-dark-800 border border-slate-700 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-700/70 flex items-center justify-between">
            <h2 className="font-semibold text-slate-200 flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-blue-300" /> Insumos a reportar
            </h2>
            <span className="text-sm text-slate-400 bg-dark-900 px-2.5 py-0.5 rounded-full border border-slate-700">{cart.length} items</span>
          </div>

          {cart.length === 0 ? (
            <div className="p-10 text-center text-slate-500">
              <ShoppingCart className="w-10 h-10 mx-auto mb-3 text-slate-600" />
              <p>Tu lista esta vacia.</p>
              <p className="text-xs mt-1">Busca productos arriba para agregarlos.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-700/60">
              {cart.map((item) => (
                <div key={item.product.id} className="p-4 flex items-center justify-between hover:bg-slate-800/30 transition-colors">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-slate-200 truncate">{item.product.name}</h3>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                      {item.product.code && (
                        <span className="text-xs font-mono text-slate-300">{item.product.code}</span>
                      )}
                      {item.product.marca && (
                        <span className="text-xs text-blue-300">{item.product.marca}</span>
                      )}
                      {item.product.batchNumber && (
                        <span className="text-xs text-amber-300/90">Lote: {item.product.batchNumber}</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">Disponible: {item.product.stockCurrent}</p>
                  </div>

                  <div className="flex items-center gap-4 ml-4">
                    <div className="flex items-center bg-dark-900 border border-slate-700 rounded-lg">
                      <button onClick={() => updateQuantity(item.product.id, item.quantity - 1)} className="px-3 py-1.5 hover:bg-slate-800 text-slate-300 rounded-l-lg" disabled={item.quantity <= 1}>-</button>
                      <span className="w-10 text-center font-medium text-white text-sm">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.product.id, item.quantity + 1)} className="px-3 py-1.5 hover:bg-slate-800 text-slate-300 rounded-r-lg" disabled={item.quantity >= item.product.stockCurrent}>+</button>
                    </div>

                    <button onClick={() => removeFromCart(item.product.id)} className="text-red-400/70 hover:text-red-300 p-2">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6">
          {message && (
            <div className={`mb-4 p-4 rounded-xl flex items-center gap-2 border ${
              message.type === 'success'
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : 'bg-red-500/10 text-red-400 border-red-500/20'
            }`}>
              {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
              {message.text}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={cart.length === 0 || loading}
            className={`w-full py-4 rounded-xl font-bold text-base transition-all ${
              cart.length === 0 || loading
                ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
            }`}
          >
            {loading ? 'Procesando...' : 'Confirmar consumo'}
          </button>
        </div>
      </div>
    </div>
  );
}
