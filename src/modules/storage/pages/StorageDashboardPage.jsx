import React from 'react';
import { Package, AlertCircle, Clock, TrendingUp, ArrowRight, Activity, BarChart3, Truck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useStorageData } from '../context/StorageDataContext';

export default function StorageDashboardPage() {
  const { stats, loadingProducts, errorProducts } = useStorageData();

  const statCards = [
    {
      title: 'Total insumos',
      value: stats.totalProducts,
      icon: Package,
      accent: 'text-blue-300',
      bg: 'bg-blue-500/10 border-blue-500/20',
    },
    {
      title: 'Stock critico',
      value: stats.lowStock,
      icon: AlertCircle,
      accent: 'text-red-400',
      bg: 'bg-red-500/10 border-red-500/20',
    },
    {
      title: 'Por vencer (30d)',
      value: stats.expiringSoon,
      icon: Clock,
      accent: 'text-amber-400',
      bg: 'bg-amber-500/10 border-amber-500/20',
    },
  ];

  return (
    <div className="flex-1 min-w-0 p-6 overflow-y-auto overflow-x-hidden bg-dark-900 h-screen">
      <div className="max-w-7xl mx-auto route-fade">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <BarChart3 className="w-6 h-6 text-blue-300" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Panel de almacen</h1>
              <p className="text-sm text-slate-400">Resumen operativo del inventario medico</p>
            </div>
          </div>
        </div>

        <div data-tour="storage-stats" className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
          {statCards.map((card, idx) => (
            <div key={idx} className="bg-dark-800 border border-slate-700 rounded-xl p-6 hover:border-slate-600 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400 font-medium">{card.title}</p>
                  <p className="text-4xl font-bold text-white mt-2">
                    {loadingProducts ? <span className="inline-block w-12 h-8 bg-slate-700 rounded animate-pulse"></span> : card.value}
                  </p>
                </div>
                <div className={`p-3 rounded-xl border ${card.bg}`}>
                  <card.icon className={`w-7 h-7 ${card.accent}`} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {errorProducts && (
          <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {errorProducts}
          </div>
        )}

        <div className="mb-4">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-300" />
            Acciones rapidas
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link data-tour="storage-inventory" to="/almacen/inventario" className="bg-dark-800 border border-slate-700 rounded-xl p-5 hover:border-blue-500/40 transition-all group flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-2.5 bg-blue-500/10 rounded-lg group-hover:bg-blue-500/20 transition-colors">
                <Package className="w-5 h-5 text-blue-300" />
              </div>
              <div>
                <p className="font-medium text-slate-200">Ver inventario</p>
                <p className="text-xs text-slate-500">Consultar stock completo</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-blue-300 transition-colors" />
          </Link>

          <Link to="/almacen/consumo" className="bg-dark-800 border border-slate-700 rounded-xl p-5 hover:border-emerald-500/40 transition-all group flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-2.5 bg-emerald-500/10 rounded-lg group-hover:bg-emerald-500/20 transition-colors">
                <Activity className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="font-medium text-slate-200">Nuevo consumo</p>
                <p className="text-xs text-slate-500">Reportar uso por tripulacion</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 transition-colors" />
          </Link>

          <Link to="/almacen/historial" className="bg-dark-800 border border-slate-700 rounded-xl p-5 hover:border-amber-500/40 transition-all group flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-2.5 bg-amber-500/10 rounded-lg group-hover:bg-amber-500/20 transition-colors">
                <Clock className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <p className="font-medium text-slate-200">Historial</p>
                <p className="text-xs text-slate-500">Ver movimientos recientes</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 transition-colors" />
          </Link>

          <Link data-tour="storage-mobile-overview" to="/almacen/moviles" className="bg-dark-800 border border-slate-700 rounded-xl p-5 hover:border-blue-500/40 transition-all group flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-2.5 bg-blue-500/10 rounded-lg group-hover:bg-blue-500/20 transition-colors">
                <Truck className="w-5 h-5 text-blue-300" />
              </div>
              <div>
                <p className="font-medium text-slate-200">Inventarios por móvil</p>
                <p className="text-xs text-slate-500">Stock actual de cada ambulancia</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-blue-300 transition-colors" />
          </Link>
        </div>
      </div>
    </div>
  );
}
