import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, X } from 'lucide-react';
import { getRoleDisplayName } from '../utils/roleDisplay';

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
    const getColombiaToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    const getMaxDate = () => {
        const d = new Date();
        d.setDate(d.getDate() + 30);
        return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
    };
    const [fechaInicio, setFechaInicio] = useState(getColombiaToday);
    const [horaInicio, setHoraInicio] = useState('');
    const [fechaFin, setFechaFin] = useState(getColombiaToday);
    const [horaFin, setHoraFin] = useState('');
    const [employeeSearch, setEmployeeSearch] = useState('');

    const filteredEmployees = useMemo(() => {
        const q = employeeSearch.trim().toLowerCase();
        if (!q) return activeEmpleados;
        return activeEmpleados.filter((emp) => {
            const name = String(emp?.nombre || '').toLowerCase();
            const cedula = String(emp?.cedula || '').toLowerCase();
            const cargo = String(getRoleDisplayName(emp?.cargo || '') || '').toLowerCase();
            return name.includes(q) || cedula.includes(q) || cargo.includes(q);
        });
    }, [activeEmpleados, employeeSearch]);

    const availableVehicles = useMemo(() => {
        const selEmp = activeEmpleados.find((e) => e.id === newShift.empleadoId);
        const cargo = selEmp ? selEmp.cargo : '';
        if (!cargo) return [];
        return getAvailableVehiclesForDate(
            fechaInicio || getColombiaToday(),
            cargo,
            null,
            newShift.dtInicio,
            newShift.dtFin,
            newShift.empleadoId
        );
    }, [activeEmpleados, newShift.empleadoId, newShift.dtInicio, newShift.dtFin, getAvailableVehiclesForDate, fechaInicio]);

    // Reset to today with empty hours when modal opens
    useEffect(() => {
        if (isOpen) {
            const t = getColombiaToday();
            setFechaInicio(t);
            setHoraInicio('');
            setFechaFin(t);
            setHoraFin('');
            setEmployeeSearch('');
            setNewShift(s => ({ ...s, dtInicio: '', dtFin: '' }));
        }
    }, [isOpen]);

    // Sync combined datetime to parent
    const syncParent = (fi, hi, ff, hf) => {
        setNewShift(s => ({
            ...s,
            dtInicio: fi && hi ? `${fi}T${hi}` : '',
            dtFin: ff && hf ? `${ff}T${hf}` : ''
        }));
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-dark-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 modal-overlay-enter">
            <div className="bg-dark-800 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden modal-panel-enter">
                <div className="px-6 py-4 border-b border-slate-700 flex justify-between items-center bg-dark-900/50">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Calendar size={20} className="text-blue-500" /> Programar Turno
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>
                <form onSubmit={e => {
                    e.preventDefault();
                    if (newShift.dtInicio && newShift.dtFin && newShift.dtInicio >= newShift.dtFin) {
                        alert('La fecha/hora de inicio no puede ser mayor o igual a la de finalización.');
                        return;
                    }
                    if (newShift.dtInicio && newShift.dtFin) {
                        const diffMs = new Date(newShift.dtFin).getTime() - new Date(newShift.dtInicio).getTime();
                        if (diffMs > 12 * 3600000) {
                            alert('No se pueden programar más de 12 horas laborales en un turno.');
                            return;
                        }
                    }
                    onSubmit(e);
                }} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-semibold text-slate-300 mb-1.5">
                            Empleado <span className="text-slate-500 font-normal">(solo activos)</span>
                        </label>
                        <input
                            type="text"
                            value={employeeSearch}
                            onChange={e => setEmployeeSearch(e.target.value)}
                            placeholder="Buscar empleado por nombre, cédula o cargo..."
                            className="w-full mb-2 bg-dark-900 border border-slate-700 rounded-lg px-4 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                        />
                        <select
                            required
                            className="w-full bg-dark-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                            value={newShift.empleadoId}
                            onChange={e => setNewShift({ ...newShift, empleadoId: e.target.value })}
                        >
                            <option value="" disabled>Seleccione un empleado...</option>
                            {filteredEmployees.map(emp => (
                                <option key={emp.id} value={emp.id}>{emp.nombre} — {getRoleDisplayName(emp.cargo)}</option>
                            ))}
                        </select>
                        <p className="text-xs text-slate-500 mt-1">{filteredEmployees.length} empleado(s)</p>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-slate-300 mb-1.5">
                            Vehículo <span className="text-slate-500 font-normal">(según tipo y cargo)</span>
                        </label>
                        <select
                            className="w-full bg-dark-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                            value={newShift.vehiculo}
                            onChange={e => setNewShift({ ...newShift, vehiculo: e.target.value })}
                        >
                            <option value="">Sin Asignar (Retén / Base)</option>
                            {availableVehicles.map(v => (
                                <option key={v.id} value={v.id}>{v.id} — {v.tipo}</option>
                            ))}
                        </select>
                        {!!newShift.empleadoId && <p className="text-xs text-slate-500 mt-1">{availableVehicles.length} vehículo(s)</p>}
                        {!newShift.empleadoId && <p className="text-xs text-slate-500 mt-1">Seleccione un empleado primero para ver vehículos disponibles</p>}
                    </div>
                    <div className="space-y-3">
                        <p className="text-sm font-semibold text-slate-300">Inicio Programado</p>
                        <div className="grid grid-cols-2 gap-3">
                            <input
                                type="date"
                                required
                                min={getColombiaToday()}
                                max={getMaxDate()}
                                className="w-full bg-dark-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                                value={fechaInicio}
                                onChange={e => { setFechaInicio(e.target.value); syncParent(e.target.value, horaInicio, fechaFin, horaFin); }}
                            />
                            <input
                                type="time"
                                required
                                className="w-full bg-dark-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                                value={horaInicio}
                                onChange={e => { setHoraInicio(e.target.value); syncParent(fechaInicio, e.target.value, fechaFin, horaFin); }}
                            />
                        </div>
                    </div>
                    <div className="space-y-3">
                        <p className="text-sm font-semibold text-slate-300">Fin Programado</p>
                        <div className="grid grid-cols-2 gap-3">
                            <input
                                type="date"
                                required
                                min={fechaInicio || getColombiaToday()}
                                max={getMaxDate()}
                                className="w-full bg-dark-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                                value={fechaFin}
                                onChange={e => { setFechaFin(e.target.value); syncParent(fechaInicio, horaInicio, e.target.value, horaFin); }}
                            />
                            <input
                                type="time"
                                required
                                className="w-full bg-dark-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                                value={horaFin}
                                onChange={e => { setHoraFin(e.target.value); syncParent(fechaInicio, horaInicio, fechaFin, e.target.value); }}
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
