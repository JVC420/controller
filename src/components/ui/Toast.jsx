import React, { useState, useCallback } from 'react';
import { X, AlertCircle, CheckCircle } from 'lucide-react';
import { clsx } from 'clsx';

export const ToastContainer = ({ toasts, dismiss }) => (
    <div className="fixed top-5 right-5 z-[100] flex flex-col gap-3 pointer-events-none">
        {toasts.map(t => (
            <div key={t.id} className={clsx(
                "pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl border shadow-2xl text-sm font-medium max-w-xs animate-in slide-in-from-top-2 fade-in duration-200",
                t.type === 'error' ? "bg-red-950 border-red-700/60 text-red-200"
                    : t.type === 'success' ? "bg-emerald-950 border-emerald-700/60 text-emerald-200"
                        : "bg-slate-900 border-slate-700 text-slate-200"
            )}>
                {t.type === 'error'
                    ? <AlertCircle size={16} className="mt-0.5 shrink-0 text-red-400" />
                    : <CheckCircle size={16} className="mt-0.5 shrink-0 text-emerald-400" />}
                <span>{t.message}</span>
                <button onClick={() => dismiss(t.id)} className="ml-auto text-slate-500 hover:text-white transition-colors shrink-0"><X size={14} /></button>
            </div>
        ))}
    </div>
);

export const useToast = () => {
    const [toasts, setToasts] = useState([]);
    const show = useCallback((message, type = 'info') => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4500);
    }, []);
    const dismiss = useCallback((id) => setToasts(prev => prev.filter(t => t.id !== id)), []);
    return { toasts, show, dismiss };
};
