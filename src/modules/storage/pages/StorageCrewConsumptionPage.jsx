import React, { useEffect, useMemo, useState } from 'react';
import { Search, ShoppingCart, Trash2, CheckCircle, AlertTriangle, Activity } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { InventoryService } from '../services/inventory.service';

export default function StorageCrewConsumptionPage() {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    InventoryService.getProducts().then(setProducts).catch((err) => {
      console.warn('Error loading products for storage consumption', err);
    });
  }, []);

  const filteredProducts = useMemo(() => {
    if (!searchTerm) return [];
    return products.filter((p) => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
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
    setLoading(true);
    setMessage(null);

    try {
      for (const item of cart) {
        await InventoryService.registerMovement(
          item.product.id,
          'OUT',
          item.quantity,
          'Consumo Tripulacion',
          user?.uid || 'anonymous'
        );
      }
      setCart([]);
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
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
            <Activity className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Reporte de consumo</h1>
            <p className="text-sm text-slate-400">Registra uso de insumos por tripulacion</p>
          </div>
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
                    <div>
                      <div className="font-medium text-slate-200">{product.name}</div>
                      <div className="text-xs text-slate-500">{product.presentation}</div>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-xs border ${product.stockCurrent > 0 ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' : 'bg-red-500/15 text-red-400 border-red-500/20'}`}>
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
                    <p className="text-xs text-slate-500">Disponible: {item.product.stockCurrent}</p>
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
