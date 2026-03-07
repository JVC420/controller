import React from 'react';
import { User, X } from 'lucide-react';

const EmployeeModal = ({ isOpen, onClose, onSubmit, empForm, setEmpForm, editingEmp, submitting }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-dark-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-dark-800 border border-slate-700 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-700 flex justify-between items-center bg-dark-900/50">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <User size={20} className="text-emerald-500" />
                        {editingEmp ? 'Editar Empleado' : 'Añadir Personal'}
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors"><X size={20} /></button>
                </div>
                <form onSubmit={onSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-semibold text-slate-300 mb-1.5">Cédula</label>
                        <input type="text" required placeholder="Ej. 1234567890"
                            className="w-full bg-dark-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                            value={empForm.cedula} onChange={e => setEmpForm({ ...empForm, cedula: e.target.value })} />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-slate-300 mb-1.5">Nombre Completo</label>
                        <input type="text" required placeholder="Ej. María Gómez"
                            className="w-full bg-dark-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                            value={empForm.nombre} onChange={e => setEmpForm({ ...empForm, nombre: e.target.value })} />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-slate-300 mb-1.5">Cargo</label>
                        <select className="w-full bg-dark-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                            value={empForm.cargo} onChange={e => setEmpForm({ ...empForm, cargo: e.target.value })}>
                            <option value="Médico">Médico</option>
                            <option value="Paramédico">Paramédico</option>
                            <option value="Conductor">Conductor</option>
                        </select>
                    </div>
                    {editingEmp && (
                        <div>
                            <label className="block text-sm font-semibold text-slate-300 mb-1.5">Estado</label>
                            <select className="w-full bg-dark-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                                value={empForm.estado} onChange={e => setEmpForm({ ...empForm, estado: e.target.value })}>
                                <option value="Activo">Activo</option>
                                <option value="Licencia">Licencia</option>
                                <option value="Renuncia">Renuncia</option>
                                <option value="Retirado">Retirado</option>
                            </select>
                        </div>
                    )}
                    <div className="pt-2 flex gap-3">
                        <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-white font-semibold transition-colors">Cancelar</button>
                        <button type="submit" disabled={submitting}
                            className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 rounded-lg text-white font-bold transition-colors shadow-lg shadow-emerald-900/30">
                            {submitting ? 'Guardando...' : (editingEmp ? 'Guardar Cambios' : 'Registrar')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EmployeeModal;
