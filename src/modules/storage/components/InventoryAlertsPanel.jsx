import React, { useMemo, useState } from 'react';
import { Bell, AlertCircle, Clock, ChevronDown, ChevronUp, Eye } from 'lucide-react';

const EXPIRY_WINDOW_DAYS = 30;
const PREVIEW_COUNT = 2;

function toDate(value) {
  if (!value) return null;
  if (value.toDate) return value.toDate();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function daysUntil(date, today) {
  const diff = date.getTime() - today.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function formatDate(date) {
  return date.toLocaleDateString();
}

export default function InventoryAlertsPanel({ products = [], onViewDetail }) {
  const [expanded, setExpanded] = useState(false);

  const { outOfStock, expiring } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const limit = new Date(today);
    limit.setDate(limit.getDate() + EXPIRY_WINDOW_DAYS);

    const out = [];
    const exp = [];

    products.forEach((p) => {
      if ((p.stockCurrent ?? 0) <= 0) out.push(p);

      const expDate = toDate(p.expirationDate);
      if (expDate && expDate <= limit) {
        exp.push({ product: p, expDate, days: daysUntil(expDate, today) });
      }
    });

    exp.sort((a, b) => a.expDate - b.expDate);
    out.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

    return { outOfStock: out, expiring: exp };
  }, [products]);

  const totalAlerts = outOfStock.length + expiring.length;

  if (totalAlerts === 0) return null;

  const outDisplay = expanded ? outOfStock : outOfStock.slice(0, PREVIEW_COUNT);
  const expDisplay = expanded ? expiring : expiring.slice(0, PREVIEW_COUNT);
  const outHidden = outOfStock.length - outDisplay.length;
  const expHidden = expiring.length - expDisplay.length;

  return (
    <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/5 overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-amber-500/10 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-amber-500/15 border border-amber-500/30 rounded-lg">
            <Bell className="w-4 h-4 text-amber-300" />
          </div>
          <div className="text-left">
            <h3 className="text-sm font-semibold text-amber-200">
              Centro de alertas
              <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-amber-500/20 text-amber-200 border border-amber-500/30">
                {totalAlerts}
              </span>
            </h3>
            <p className="text-xs text-amber-200/70 mt-0.5">
              {outOfStock.length > 0 && `${outOfStock.length} sin stock`}
              {outOfStock.length > 0 && expiring.length > 0 && ' · '}
              {expiring.length > 0 && `${expiring.length} por vencer (${EXPIRY_WINDOW_DAYS}d)`}
            </p>
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-amber-300/70" />
        ) : (
          <ChevronDown className="w-4 h-4 text-amber-300/70" />
        )}
      </button>

      <div className="border-t border-amber-500/20 grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-amber-500/20">
        <div className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-4 h-4 text-red-400" />
            <h4 className="text-xs font-semibold text-red-300 uppercase tracking-wide">Sin stock</h4>
          </div>
          {outOfStock.length === 0 ? (
            <p className="text-xs text-slate-500">Sin productos agotados.</p>
          ) : (
            <ul className="space-y-1.5">
              {outDisplay.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-2 rounded-lg bg-red-500/5 border border-red-500/15 px-2.5 py-1.5">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm text-slate-200 truncate">{p.name}</div>
                    <div className="text-[11px] text-slate-500 font-mono">{p.code}</div>
                  </div>
                  {onViewDetail && (
                    <button
                      type="button"
                      onClick={() => onViewDetail(p)}
                      className="shrink-0 p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-md transition-colors"
                      title="Ver detalle"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  )}
                </li>
              ))}
              {outHidden > 0 && (
                <li className="text-xs text-slate-500 text-center pt-1">+{outHidden} mas</li>
              )}
            </ul>
          )}
        </div>

        <div className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-amber-400" />
            <h4 className="text-xs font-semibold text-amber-300 uppercase tracking-wide">
              Por vencer ({EXPIRY_WINDOW_DAYS}d)
            </h4>
          </div>
          {expiring.length === 0 ? (
            <p className="text-xs text-slate-500">Sin productos proximos a vencer.</p>
          ) : (
            <ul className="space-y-1.5">
              {expDisplay.map(({ product, expDate, days }) => {
                const overdue = days < 0;
                return (
                  <li key={product.id} className={`flex items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 border ${overdue ? 'bg-red-500/5 border-red-500/15' : 'bg-amber-500/5 border-amber-500/15'}`}>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm text-slate-200 truncate">{product.name}</div>
                      <div className="flex items-center gap-2 text-[11px]">
                        <span className="text-slate-500 font-mono">{product.code}</span>
                        <span className={overdue ? 'text-red-300' : 'text-amber-300/90'}>
                          {overdue ? `Vencido hace ${Math.abs(days)}d` : days === 0 ? 'Vence hoy' : `En ${days}d`}
                          {' · '}{formatDate(expDate)}
                        </span>
                      </div>
                    </div>
                    {onViewDetail && (
                      <button
                        type="button"
                        onClick={() => onViewDetail(product)}
                        className="shrink-0 p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-md transition-colors"
                        title="Ver detalle"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </li>
                );
              })}
              {expHidden > 0 && (
                <li className="text-xs text-slate-500 text-center pt-1">+{expHidden} mas</li>
              )}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
