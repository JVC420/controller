import React from 'react';
import { Calendar, X } from 'lucide-react';

const ShiftModal = ({
    isOpen,
    onClose,
    onSubmit,
    newShift,
    setNewShift,
    activeEmpleados,
    getAvailableVehiclesForDate,
    submitting
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-dark-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-dark-800 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-700 flex justify-between items-center bg-dark-900/50">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Calendar size={20} className="text-blue-500" /> Programar Turno
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>
                <form onSubmit={onSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-semibold text-slate-300 mb-1.5">
                            Empleado <span className="text-slate-500 font-normal">(solo activos)</span>
                        </label>
                        <select
                            required
                            className="w-full bg-dark-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                            value={newShift.empleadoId}
                            onChange={e => setNewShift({ ...newShift, empleadoId: e.target.value })}
                        >
                            <option value="" disabled>Seleccione un empleado...</option>
                            {activeEmpleados.map(emp => (
                                <option key={emp.id} value={emp.id}>{emp.nombre} — {emp.cargo}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-slate-300 mb-1.5">
                            Vehículo <span className="text-slate-500 font-normal">(Opcional — máx. 3/vehículo)</span>
                        </label>
                        <select
                            className="w-full bg-dark-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                            value={newShift.vehiculo}
                            onChange={e => setNewShift({ ...newShift, vehiculo: e.target.value })}
                        >
                            <option value="">Sin Asignar (Retén / Base)</option>
                            {getAvailableVehiclesForDate(newShift.fecha).map(v => (
                                <option key={v.id} value={v.id}>{v.id} — {v.tipo}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-slate-300 mb-1.5">Fecha del Turno</label>
                        <input
                            type="date"
                            required
                            className="w-full bg-dark-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                            value={newShift.fecha}
                            onChange={e => setNewShift({ ...newShift, fecha: e.target.value })}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-slate-300 mb-1.5">Hora Inicio</label>
                            <input
                                type="time"
                                required
                                className="w-full bg-dark-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                                value={newShift.horaInicioProgramada}
                                onChange={e => setNewShift({ ...newShift, horaInicioProgramada: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-300 mb-1.5">Hora Fin</label>
                            <input
                                type="time"
                                required
                                className="w-full bg-dark-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                                value={newShift.horaFinProgramada}
                                onChange={e => setNewShift({ ...newShift, horaFinProgramada: e.target.value })}
                            />
                        </div>
                    </div>
                    <div className="pt-2 flex gap-3">
                        <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-white font-semibold transition-colors">Cancelar</button>
                        <button type="submit" disabled={submitting}
                            className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 rounded-lg text-white font-bold transition-colors shadow-lg shadow-blue-900/30">
                            {submitting ? 'Guardando...' : 'Guardar Turno'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ShiftModal;
