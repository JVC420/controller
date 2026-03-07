import React, { useState, useEffect } from 'react';
import { X, CheckCircle, FileCheck } from 'lucide-react';

const ServiceClosureModal = ({ isOpen, onClose, servicio, cliente, onCerrarServicio }) => {
    const [checklistItems, setChecklistItems] = useState({});

    // Initialize checklist state when modal opens or service changes
    useEffect(() => {
        if (isOpen && cliente?.documentos?.length) {
            const initialChecklist = {};
            cliente.documentos.forEach(item => {
                initialChecklist[item] = false;
            });
            setChecklistItems(initialChecklist);
        } else if (isOpen) {
            setChecklistItems({});
        }
    }, [isOpen, cliente]);

    if (!isOpen || !servicio || !cliente) return null;

    const allChecked = Object.values(checklistItems).every(Boolean);

    const handleToggle = (item) => {
        setChecklistItems(prev => ({
            ...prev,
            [item]: !prev[item]
        }));
    };

    const handleConfirm = () => {
        if (allChecked) {
            onCerrarServicio(servicio.id, servicio.ambulanciaAsignada);
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 bg-dark-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-dark-800 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-700 flex justify-between items-center bg-dark-900/50">
                    <div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <FileCheck size={20} className="text-emerald-500" />
                            Cierre de Servicio
                        </h2>
                        <p className="text-xs text-slate-400 mt-1">
                            Requisitos obligatorios para <strong className="text-slate-300">{cliente.nombre}</strong>
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Form Body */}
                <div className="p-6">
                    <div className="mb-6 p-3 bg-dark-900 rounded-lg border border-slate-700 flex justify-between items-center">
                        <span className="text-sm text-slate-400">Servicio ID:</span>
                        <span className="font-mono font-bold text-white">{servicio.id}</span>
                    </div>

                    <h3 className="text-sm font-semibold text-slate-300 mb-4">Validación Documental Requerida</h3>

                    <div className="space-y-3 mb-8">
                        {cliente.documentos && cliente.documentos.length > 0 ? (
                            cliente.documentos.map((item, index) => (
                                <label key={index} className="flex items-start gap-3 cursor-pointer group">
                                    <div className="relative flex items-center justify-center mt-0.5">
                                        <input
                                            type="checkbox"
                                            className="peer sr-only"
                                            checked={!!checklistItems[item]}
                                            onChange={() => handleToggle(item)}
                                        />
                                        <div className="w-5 h-5 rounded border-2 border-slate-600 bg-dark-900 peer-checked:bg-emerald-500 peer-checked:border-emerald-500 transition-colors"></div>
                                        <CheckCircle size={14} className="absolute text-white opacity-0 peer-checked:opacity-100 transition-opacity" />
                                    </div>
                                    <span className="text-sm text-slate-300 group-hover:text-white select-none transition-colors">
                                        {item}
                                    </span>
                                </label>
                            ))
                        ) : (
                            <p className="text-sm text-slate-500 italic">No hay requisitos de cierre configurados para este cliente.</p>
                        )}
                    </div>

                    {/* Footer Actions */}
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 px-4 py-2.5 bg-dark-900 hover:bg-slate-700 border border-slate-600 rounded-lg text-slate-300 font-semibold transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleConfirm}
                            disabled={!allChecked}
                            className={`flex-1 px-4 py-2.5 rounded-lg font-bold flex justify-center items-center gap-2 transition-all shadow-lg ${allChecked
                                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/30'
                                : 'bg-slate-700 text-slate-500 cursor-not-allowed border border-slate-600'
                                }`}
                        >
                            <FileCheck size={18} />
                            Finalizar Servicio
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ServiceClosureModal;
