import React, { useState } from 'react';
import { X, Save, Truck } from 'lucide-react';
import { serverTimestamp } from 'firebase/firestore';

const NewAmbulanceModal = ({ isOpen, onClose, onSubmit }) => {
    const [formData, setFormData] = useState({
        idSecretaria: '',
        movil: '',
        placa: '',
        tipo: 'Básica',
    });

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.idSecretaria || !formData.movil || !formData.placa) return;

        const id = formData.movil;
        onSubmit({
            id,
            idSecretaria: formData.idSecretaria,
            movil: formData.movil,
            placa: formData.placa,
            tipo: formData.tipo,
            estado: 'Disponible',
            tripulacion: [],
            lastAvailableAt: serverTimestamp(),
        });
        setFormData({ idSecretaria: '', movil: '', placa: '', tipo: 'Básica' });
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-dark-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-dark-800 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">

                <div className="px-6 py-4 border-b border-slate-700 flex justify-between items-center bg-dark-900/50">
                    <div>
                        <h2 className="text-xl font-bold text-white">Alta de Ambulancia</h2>
                        <p className="text-xs text-slate-400">Gestión de Flota Operativa</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                            <Truck size={16} className="text-emerald-400" /> Id Secretaría
                        </label>
                        <input
                            type="text" required maxLength={10}
                            inputMode="numeric"
                            pattern="[0-9]{1,10}"
                            value={formData.idSecretaria}
                            onChange={e => setFormData({ ...formData, idSecretaria: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                            placeholder="Ej: 1100108171"
                            className="w-full bg-dark-900 border border-slate-600 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-blue-500"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                            <Truck size={16} className="text-emerald-400" /> Numero de Móbil
                        </label>
                        <input
                            type="text" required maxLength={10}
                            inputMode="numeric"
                            pattern="[0-9]{1,10}"
                            value={formData.movil}
                            onChange={e => setFormData({ ...formData, movil: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                            placeholder="Ej: 2501"
                            className="w-full bg-dark-900 border border-slate-600 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-blue-500"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                            <Truck size={16} className="text-emerald-400" /> Placa
                        </label>
                        <input
                            type="text" required maxLength={6}
                            pattern="[A-Z0-9]{1,6}"
                            value={formData.placa}
                            onChange={e => setFormData({ ...formData, placa: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6) })}
                            placeholder="Ej: ABC123"
                            className="w-full bg-dark-900 border border-slate-600 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-blue-500 uppercase"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                            <Truck size={16} className="text-blue-400" /> Tipo de Móvil
                        </label>
                        <select
                            value={formData.tipo}
                            onChange={e => setFormData({ ...formData, tipo: e.target.value })}
                            className="w-full bg-dark-900 border border-slate-600 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-blue-500 appearance-none cursor-pointer"
                        >
                            <option value="Básica">Básica (TAB)</option>
                            <option value="Medicalizada">Medicalizada (TAM)</option>
                        </select>
                    </div>

                    <p className="text-xs text-slate-500 bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2">
                        💡 La tripulación se asigna desde el módulo <strong className="text-slate-300">Personal → Turnos en Vivo</strong>.
                    </p>

                    <button type="submit"
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-4 rounded-lg flex justify-center items-center gap-2 transition-colors shadow-lg shadow-blue-900/20">
                        <Save size={18} /> Registrar Vehículo
                    </button>
                </form>
            </div>
        </div>
    );
};

export default NewAmbulanceModal;
