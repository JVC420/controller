import React, { useEffect, useState } from 'react';
import { ClipboardList, ArrowUpRight, ArrowDownLeft, Clock } from 'lucide-react';
import { InventoryService } from '../services/inventory.service';

export default function StorageMovementHistoryPage() {
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadMovements() {
      try {
        setLoading(true);
        setError('');
        const data = await InventoryService.getMovements();
        setMovements(data);
      } catch (err) {
        console.error('Error loading storage movement history', err);
        setMovements([]);
        setError('No se pudo cargar el historial desde Firebase.');
      } finally {
        setLoading(false);
      }
    }

    loadMovements();
  }, []);

  if (loading) {
    return (
      <div className="p-8 flex flex-col items-center justify-center text-slate-500 gap-3">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <span>Cargando historial...</span>
      </div>
    );
  }

  return (
    <div className="flex-1 min-w-0 p-6 overflow-y-auto overflow-x-hidden bg-dark-900 h-screen">
      <div className="max-w-7xl mx-auto route-fade">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <ClipboardList className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Historial de movimientos</h1>
            <p className="text-sm text-slate-400">Registro de entradas y salidas de almacen</p>
          </div>
        </div>

        <div className="bg-dark-800 border border-slate-700 rounded-xl overflow-hidden">
          {error && (
            <div className="mx-4 mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {error}
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-dark-900/50 text-slate-400 text-sm border-b border-slate-700">
                  <th className="py-3 px-4 font-semibold">Fecha/Hora</th>
                  <th className="py-3 px-4 font-semibold">Producto</th>
                  <th className="py-3 px-4 font-semibold">Tipo</th>
                  <th className="py-3 px-4 font-semibold text-right">Cantidad</th>
                  <th className="py-3 px-4 font-semibold">Motivo</th>
                  <th className="py-3 px-4 font-semibold">Usuario</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {movements.length > 0 ? (
                  movements.map((mov) => (
                    <tr key={mov.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5 text-slate-600" />
                          {mov.timestamp?.toDate ? mov.timestamp.toDate().toLocaleString() : 'Reciente'}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-200">{mov.productName}</td>
                      <td className="py-3 px-4">
                        {mov.type === 'IN' ? (
                          <span className="px-2 py-0.5 rounded text-xs border border-emerald-500/20 bg-emerald-500/15 text-emerald-400 flex items-center gap-1 w-fit">
                            <ArrowDownLeft className="w-3 h-3" /> ENTRADA
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-xs border border-orange-500/20 bg-orange-500/15 text-orange-400 flex items-center gap-1 w-fit">
                            <ArrowUpRight className="w-3 h-3" /> SALIDA
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-300">{mov.quantity}</td>
                      <td className="py-3 px-4 text-slate-400">{mov.reason}</td>
                      <td className="py-3 px-4 text-slate-500 text-xs">{mov.performedBy || 'Sistema'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="text-center text-slate-500 py-12">
                      <ClipboardList className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                      No hay movimientos registrados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
