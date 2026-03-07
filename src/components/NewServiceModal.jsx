import React, { useState } from 'react';
import { X, Send, Building2, MapPin } from 'lucide-react';

const NewServiceModal = ({ isOpen, onClose, clientes, onSubmit }) => {
    const [formData, setFormData] = useState({
        clienteId: '',
        origen: '',
        destino: ''
    });

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.clienteId || !formData.origen || !formData.destino) return;

        // Simulate backend processing time
        const id = `REQ-${Math.floor(Math.random() * 900) + 100}`;
        const newRequest = {
            id,
            clienteId: formData.clienteId,
            origen: formData.origen,
            destino: formData.destino,
            estado: "Pendiente",
            tiempoEsperaMin: 0,
            creadoAt: new Date().toISOString()
        };

        onSubmit(newRequest);

        // Reset and close
        setFormData({ clienteId: '', origen: '', destino: '' });
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-dark-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-dark-800 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-700 flex justify-between items-center bg-dark-900/50">
                    <div>
                        <h2 className="text-xl font-bold text-white">Nuevo Servicio</h2>
                        <p className="text-xs text-slate-400">Panel Simulado de Call Center</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-5">

                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                            <Building2 size={16} className="text-blue-400" />
                            Seleccionar Cliente
                        </label>
                        <input
                            list="client-options"
                            required
                            placeholder="Buscar cliente por nombre..."
                            onChange={(e) => {
                                const selectedName = e.target.value;
                                const matchingClient = clientes.find(c => `${c.nombre} (${c.ranking})` === selectedName);
                                setFormData({ ...formData, clienteId: matchingClient ? matchingClient.id : '' });
                            }}
                            className="w-full bg-dark-900 border border-slate-600 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        />
                        <datalist id="client-options">
                            {clientes.map(c => (
                                <option key={c.id} value={`${c.nombre} (${c.ranking})`} />
                            ))}
                        </datalist>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                            <MapPin size={16} className="text-emerald-400" />
                            Punto de Origen
                        </label>
                        <input
                            type="text"
                            required
                            value={formData.origen}
                            onChange={(e) => setFormData({ ...formData, origen: e.target.value })}
                            placeholder="Ej: Sede Norte, Piso 3"
                            className="w-full bg-dark-900 border border-slate-600 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                            <MapPin size={16} className="text-blue-400" />
                            Lugar de Destino
                        </label>
                        <input
                            type="text"
                            required
                            value={formData.destino}
                            onChange={(e) => setFormData({ ...formData, destino: e.target.value })}
                            placeholder="Ej: Clínica Central, Urgencias"
                            className="w-full bg-dark-900 border border-slate-600 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        />
                    </div>

                    <div className="pt-4">
                        <button
                            type="submit"
                            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-4 rounded-lg flex justify-center items-center gap-2 transition-colors shadow-lg shadow-blue-900/20"
                        >
                            <Send size={18} />
                            Crear y Enviar a Triage
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default NewServiceModal;
