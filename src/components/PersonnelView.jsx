import React, { useState, useCallback, useMemo } from 'react';
import { Clock, Calendar, Download, Plus, AlertCircle, FileText, CheckCircle, Truck, X, User } from 'lucide-react';
import { clsx } from 'clsx';
import { ToastContainer, useToast } from './ui/Toast';

// Imported modular components
import EmployeeModal from './EmployeeModal';
import ShiftModal from './ShiftModal';
import PersonnelLiveShifts from './PersonnelLiveShifts';
import PersonnelDirectory from './PersonnelDirectory';
import PersonnelPayroll from './PersonnelPayroll';

// Colombia timezone helper — returns YYYY-MM-DD in America/Bogota
const getColombiaTodayISO = () => {
    const now = new Date();
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
    return parts; // en-CA gives YYYY-MM-DD
};

// Parses both "HH:mm" (legacy) and "YYYY-MM-DDTHH:mm" (new) into epoch ms
const toMs = (val, fecha) => {
    if (!val) return 0;
    if (val.includes('T')) return new Date(val).getTime();
    return new Date(`${fecha || '1970-01-01'}T${val}:00`).getTime();
};
// Returns "YYYY-MM-DDTHH:mm" for datetime-local inputs (handles legacy "HH:mm" too)
const dtVal = (val, fecha) => {
    if (!val) return '';
    if (val.includes('T')) return val;
    return `${fecha}T${val}`;
};
// Compact display: "09/03 22:00" for datetimes, plain "HH:mm" for legacy
const fmtDT = (val) => {
    if (!val) return '—';
    if (val.includes('T')) {
        const [date, time] = val.split('T');
        const [, m, d] = date.split('-');
        return `${d}/${m} ${time}`;
    }
    return val;
};

const getPunctualityStatus = (inicioProgramado, inicioReal, horaFinReal, cancelado, ausenciaConfirmada, fecha) => {
    if (cancelado) return { label: 'Cancelado', styles: 'bg-red-500/10 text-red-400 border-red-500/20' };
    if (ausenciaConfirmada) return { label: 'Ausencia', styles: 'bg-slate-500/10 text-slate-400 border-slate-500/20' };
    if (horaFinReal) return { label: 'Finalizado', styles: 'bg-blue-500/10 text-blue-400 border-blue-500/20' };
    if (!inicioReal) return { label: 'Ausente', styles: 'bg-slate-500/10 text-slate-400 border-slate-500/20' };
    return toMs(inicioReal, fecha) <= toMs(inicioProgramado, fecha) + 15 * 60000
        ? { label: 'En Turno', styles: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' }
        : { label: 'Tarde', styles: 'bg-orange-500/10 text-orange-400 border-orange-500/20' };
};

const getPunctualityStatusLabel = (inicioProgramado, inicioReal, horaFinReal, cancelado, ausenciaConfirmada, fecha) => {
    return getPunctualityStatus(inicioProgramado, inicioReal, horaFinReal, cancelado, ausenciaConfirmada, fecha).label;
};

const isOvertime = (progFinStr, realFinStr, fecha) => {
    if (!progFinStr || !realFinStr) return false;
    return (toMs(realFinStr, fecha) - toMs(progFinStr, fecha)) > 1800000;
};

const PersonnelView = ({
    empleados = [],
    turnosHoy = [],
    prenominaMensual = [],  // Kept for backward compatibility if ever passed from App
    flota = [],
    addEmpleado,
    updateEmpleado,
    addTurno,
    updateTurno,
}) => {
    const [activeTab, setActiveTab] = useState('live');
    const { toasts, show: showToast, dismiss: dismissToast } = useToast();

    // Modals state
    const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
    const [isEmpModalOpen, setIsEmpModalOpen] = useState(false);
    const [changeMobilTarget, setChangeMobilTarget] = useState(null); // turno object
    const [editingEmp, setEditingEmp] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    // Live shifts filters
    const [filters, setFilters] = useState({ fecha: '', estado: '', cargo: '', movil: '' });

    // Directory Filters
    const [empSearch, setEmpSearch] = useState('');
    const [showInactive, setShowInactive] = useState(false);

    // Forms
    const colombiaToday = getColombiaTodayISO();
    const [newShift, setNewShift] = useState({
        empleadoId: '', vehiculo: '',
        dtInicio: '', dtFin: ''
    });
    const [empForm, setEmpForm] = useState({ cedula: '', nombre: '', cargo: 'Paramédico', estado: 'Activo' });

    // --- Memoized Data ---
    const activeEmpleados = useMemo(() => empleados.filter(e => e.estado === 'Activo'), [empleados]);

    const filteredTurnos = useMemo(() => {
        return turnosHoy.filter(t => {
            const statusLabel = getPunctualityStatusLabel(t.inicioProgramado, t.inicioReal, t.horaFinReal, t.cancelado, t.ausenciaConfirmada, t.fecha);
            if (filters.fecha && t.fecha !== filters.fecha) return false;
            if (filters.estado && statusLabel !== filters.estado) return false;
            if (filters.cargo && t.cargo !== filters.cargo) return false;
            if (filters.movil && t.movil !== filters.movil) return false;
            return true;
        })
            .sort((a, b) => {
                // Si ambos tienen creadoAt, ordenar por creadoAt descendente
                if (a.creadoAt && b.creadoAt) {
                    return new Date(b.creadoAt) - new Date(a.creadoAt);
                }
                // Si solo uno tiene creadoAt, ese va primero
                if (a.creadoAt) return -1;
                if (b.creadoAt) return 1;
                // Fallback: por fecha de turno y hora programada
                return new Date(b.fecha || 0) - new Date(a.fecha || 0) || (a.inicioProgramado || '').localeCompare(b.inicioProgramado || '');
            });
    }, [turnosHoy, filters]);

    const filteredEmpleados = useMemo(() => {
        return empleados.filter(e => {
            if (!showInactive && e.estado !== 'Activo') return false;
            const q = empSearch.toLowerCase();
            if (q && !(e.nombre || '').toLowerCase().includes(q) && !(e.cedula || '').includes(q)) return false;
            return true;
        });
    }, [empleados, empSearch, showInactive]);

    // Live Shifts Dropdowns
    const uniqueFechas = useMemo(() => [...new Set(turnosHoy.map(t => t.fecha).filter(Boolean))].sort((a, b) => b.localeCompare(a)), [turnosHoy]);
    const allEstados = ['En Turno', 'Tarde', 'Ausente', 'Ausencia', 'Cancelado', 'Finalizado'];
    const uniqueCargos = useMemo(() => [...new Set(turnosHoy.map(t => t.cargo))], [turnosHoy]);
    const uniqueMoviles = useMemo(() => [...new Set(turnosHoy.map(t => t.movil).filter(Boolean))], [turnosHoy]);
    const hasFilters = Boolean(filters.fecha || filters.estado || filters.cargo || filters.movil);

    // ── Crew rules per ambulance type ──
    const CREW_RULES = {
        'Básica': ['Conductor', 'Paramédico'],
        'Medicalizada': ['Médico', 'Conductor', 'Paramédico']
    };

    // Active (non-finalized, non-cancelled, non-absent) shifts for a given vehicle
    const getActiveCrewForVehicle = useCallback((vehicleId, excludeTurnoId = null) => {
        return turnosHoy.filter(t =>
            t.movil === vehicleId &&
            t.movil !== 'Sin Asignar' &&
            t.id !== excludeTurnoId &&
            !t.horaFinReal && !t.cancelado && !t.ausenciaConfirmada
        );
    }, [turnosHoy]);

    // Check if employee already has any active shift (not finalized/cancelled/absent)
    const isEmployeeOnActiveShift = useCallback((empleadoId, excludeTurnoId = null) => {
        return turnosHoy.some(t =>
            t.id_empleado === empleadoId &&
            t.id !== excludeTurnoId &&
            !t.horaFinReal && !t.cancelado && !t.ausenciaConfirmada
        );
    }, [turnosHoy]);

    // Returns vehicles that have room for the given cargo role
    const getAvailableVehiclesForDate = useCallback((fecha, cargo, excludeTurnoId = null) => {
        return flota.filter(f => {
            if (f.estado === 'Fuera de Servicio') return false;
            const rules = CREW_RULES[f.tipo];
            if (!rules) return false;
            // Cargo must be one of the allowed roles for this vehicle type
            if (!rules.includes(cargo)) return false;
            // Count active crew for this vehicle (all dates — active shift = not finalized)
            const activeCrew = getActiveCrewForVehicle(f.id, excludeTurnoId);
            // Check if this specific cargo slot is already taken
            const sameCargoCount = activeCrew.filter(t => t.cargo === cargo).length;
            const maxForCargo = rules.filter(r => r === cargo).length; // always 1
            return sameCargoCount < maxForCargo;
        });
    }, [turnosHoy, flota, getActiveCrewForVehicle]);

    // --- Handlers ---
    const handleScheduleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const emp = empleados.find(e => e.id === newShift.empleadoId);
            // Block if employee already has an active shift
            if (isEmployeeOnActiveShift(emp.id)) {
                showToast(`${emp.nombre} ya tiene un turno activo. Finalice o cancele el turno actual antes de asignar otro.`, 'error');
                return;
            }
            // Validate vehicle crew capacity
            if (newShift.vehiculo) {
                const veh = flota.find(f => f.id === newShift.vehiculo);
                if (veh) {
                    const rules = CREW_RULES[veh.tipo] || [];
                    if (!rules.includes(emp.cargo)) {
                        showToast(`Un ${emp.cargo} no puede asignarse a una ambulancia ${veh.tipo}. Roles permitidos: ${rules.join(', ')}.`, 'error');
                        return;
                    }
                    const activeCrew = getActiveCrewForVehicle(veh.id);
                    if (activeCrew.some(t => t.cargo === emp.cargo)) {
                        showToast(`La móvil ${veh.id} ya tiene un ${emp.cargo} asignado.`, 'error');
                        return;
                    }
                    if (activeCrew.length >= rules.length) {
                        showToast(`La móvil ${veh.id} ya está completa.`, 'error');
                        return;
                    }
                }
            }
            const turnoData = {
                id_empleado: emp.id,
                cedula: emp.cedula,
                nombre: emp.nombre,
                cargo: emp.cargo,
                fecha: newShift.dtInicio.split('T')[0],
                inicioProgramado: newShift.dtInicio,
                horaFin: newShift.dtFin,
                movil: newShift.vehiculo || 'Sin Asignar',
                estadoRegistro: 'Activo',
                creadoAt: new Date().toISOString()
            };
            await addTurno(turnoData);
            showToast('Turno programado exitosamente', 'success');
            setIsShiftModalOpen(false);
            setNewShift({ ...newShift, empleadoId: '' });
        } catch (error) {
            console.error(error);
            showToast('Error al programar turno', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const handleAssignVehicle = async (turno, newVehicleId) => {
        try {
            const oldVehicleId = turno.movil;
            // Validate new vehicle if assigning
            if (newVehicleId && newVehicleId !== 'Sin Asignar') {
                const veh = flota.find(f => f.id === newVehicleId);
                if (veh) {
                    const rules = CREW_RULES[veh.tipo] || [];
                    if (!rules.includes(turno.cargo)) {
                        showToast(`Un ${turno.cargo} no puede asignarse a una ambulancia ${veh.tipo}. Roles permitidos: ${rules.join(', ')}.`, 'error');
                        return;
                    }
                    const activeCrew = getActiveCrewForVehicle(veh.id, turno.id);
                    if (activeCrew.some(t => t.cargo === turno.cargo)) {
                        showToast(`La móvil ${veh.id} ya tiene un ${turno.cargo} asignado.`, 'error');
                        return;
                    }
                    if (activeCrew.length >= rules.length) {
                        showToast(`La móvil ${veh.id} ya está completa.`, 'error');
                        return;
                    }
                }
            }
            await updateTurno(turno.id, { movil: newVehicleId || 'Sin Asignar' });
            showToast(`Móvil actualizado a ${newVehicleId || 'Sin Asignar'}`, 'success');
        } catch (error) {
            showToast('Error asignando móvil', 'error');
        }
    };

    const handleChangeMobilSubmit = async (newVehicleId) => {
        if (!changeMobilTarget) return;
        handleAssignVehicle(changeMobilTarget, newVehicleId);
        setChangeMobilTarget(null);
    };

    const handleSetShiftField = async (turnoId, field, value) => {
        try {
            const updates = { [field]: value };
            if (field === 'horaFinReal' && value) updates.estadoRegistro = 'Finalizado';
            if (field === 'cancelado' && value) updates.estadoRegistro = 'Cancelado';
            if (field === 'ausenciaConfirmada' && value) updates.estadoRegistro = 'Ausencia';
            if (field === 'inicioReal' && value) {
                const turno = turnosHoy.find(t => t.id === turnoId);
                if (turno && turno.inicioProgramado) {
                    const isLate = toMs(value, turno.fecha) > toMs(turno.inicioProgramado, turno.fecha) + 15 * 60000;
                    updates.estadoRegistro = isLate ? 'Tarde' : 'En Turno';
                }
            }
            await updateTurno(turnoId, updates);
            showToast(`Registro actualizado (${field})`, 'success');
        } catch (error) {
            showToast('Error al actualizar registro', 'error');
        }
    };

    const openNewEmp = () => {
        setEditingEmp(null);
        setEmpForm({ cedula: '', nombre: '', cargo: 'Paramédico', estado: 'Activo' });
        setIsEmpModalOpen(true);
    };

    const openEditEmp = (emp) => {
        setEditingEmp(emp);
        setEmpForm({ cedula: emp.cedula || '', nombre: emp.nombre, cargo: emp.cargo, estado: emp.estado });
        setIsEmpModalOpen(true);
    };

    const handleEmpSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            if (editingEmp) {
                await updateEmpleado(editingEmp.id, empForm);
                showToast('Empleado actualizado', 'success');
            } else {
                await addEmpleado(empForm);
                showToast('Empleado registrado exitosamente', 'success');
            }
            setIsEmpModalOpen(false);
            setEditingEmp(null);
        } catch (error) {
            console.error(error);
            showToast('Error al guardar empleado', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="flex-1 p-4 md:p-6 overflow-hidden bg-[#0B1121] h-full flex flex-col">
            <ToastContainer toasts={toasts} dismiss={dismissToast} />

            {/* Header */}
            <header className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0">
                <div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">Gestión Operativa y RRHH</h1>
                    <p className="text-slate-400 mt-1">Datos Linea Medica de Ambulancias</p>
                </div>
                <div className="flex w-full md:w-auto gap-3">
                    {activeTab === 'live' && (
                        <button onClick={() => setIsShiftModalOpen(true)} className="flex-1 md:flex-none justify-center bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-lg font-bold flex items-center gap-2 transition-colors shadow-lg shadow-blue-900/30">
                            <Calendar size={18} /> Programar Turno
                        </button>
                    )}
                    {activeTab === 'employees' && (
                        <button onClick={openNewEmp} className="flex-1 md:flex-none justify-center bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-lg font-bold flex items-center gap-2 transition-colors shadow-lg shadow-emerald-900/30">
                            <Plus size={18} /> Añadir Empleado
                        </button>
                    )}
                </div>
            </header>

            {/* Fleet Crew Status */}
            {activeTab === 'live' && flota.length > 0 && (
                <div className="mb-4 shrink-0">
                    <div className="flex items-center gap-2 mb-2">
                        <Truck size={16} className="text-blue-400" />
                        <span className="text-sm font-bold text-slate-300">Estado de Tripulación</span>
                    </div>
                    <div className="flex gap-3 overflow-x-auto pb-1 hide-scrollbar">
                        {flota.filter(f => f.estado !== 'Fuera de Servicio')
                            .map(veh => ({ veh, crew: getActiveCrewForVehicle(veh.id) }))
                            .sort((a, b) => b.crew.length - a.crew.length)
                            .map(({ veh, crew }) => {
                            const rules = CREW_RULES[veh.tipo] || [];
                            const isFull = rules.length > 0 && rules.every(role => crew.some(c => c.cargo === role));
                            return (
                                <div key={veh.id} className={clsx(
                                    "flex-shrink-0 rounded-xl border px-4 py-3 min-w-[200px] space-y-1.5",
                                    isFull
                                        ? "bg-emerald-500/10 border-emerald-500/30"
                                        : crew.length > 0
                                            ? "bg-amber-500/10 border-amber-500/30"
                                            : "bg-dark-800 border-slate-700"
                                )}>
                                    <div className="flex items-center justify-between">
                                        <span className="font-mono font-bold text-sm text-white">{veh.id}</span>
                                        <span className={clsx("text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider",
                                            isFull ? "bg-emerald-500/20 text-emerald-400" : "bg-slate-700 text-slate-400"
                                        )}>
                                            {veh.tipo === 'Medicalizada' ? 'TAM' : 'TAB'}
                                        </span>
                                    </div>
                                    <div className="flex flex-wrap gap-1">
                                        {rules.map(role => {
                                            const member = crew.find(c => c.cargo === role);
                                            return (
                                                <span key={role} className={clsx("text-[10px] px-1.5 py-0.5 rounded font-semibold",
                                                    member ? "bg-emerald-500/20 text-emerald-300" : "bg-slate-800 text-slate-500"
                                                )}>
                                                    {member ? `${role}: ${member.nombre.split(' ')[0]}` : `${role}: —`}
                                                </span>
                                            );
                                        })}
                                    </div>
                                    <div className="text-[10px] font-bold">
                                        {isFull
                                            ? <span className="text-emerald-400">● Completa</span>
                                            : <span className="text-slate-500">{crew.length}/{rules.length} tripulantes</span>
                                        }
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Tabs */}
            <div className="flex gap-1 mb-6 border-b border-slate-700/50 pb-px overflow-x-auto hide-scrollbar shrink-0">
                {[
                    { id: 'live', icon: <Clock size={15} />, label: 'Turnos en Vivo' },
                    { id: 'employees', icon: <User size={15} />, label: 'Directorio' },
                    { id: 'payroll', icon: <FileText size={15} />, label: 'Pre-nómina' },
                ].map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                        className={clsx("whitespace-nowrap px-4 py-2.5 font-bold text-sm tracking-wide rounded-t-lg transition-colors border-b-2 flex items-center gap-2",
                            activeTab === tab.id ? "text-blue-400 border-blue-500 bg-blue-500/10" : "text-slate-400 border-transparent hover:text-slate-300 hover:bg-slate-800/80"
                        )}>
                        {tab.icon}{tab.label}
                    </button>
                ))}
            </div>

            {/* Active Views */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0">
            {activeTab === 'live' && (
                <PersonnelLiveShifts
                    filteredTurnos={filteredTurnos}
                    filters={filters}
                    setFilters={setFilters}
                    uniqueFechas={uniqueFechas}
                    allEstados={allEstados}
                    uniqueCargos={uniqueCargos}
                    uniqueMoviles={uniqueMoviles}
                    hasFilters={hasFilters}
                    getPunctualityStatus={getPunctualityStatus}
                    getAvailableVehiclesForDate={getAvailableVehiclesForDate}
                    handleAssignVehicle={handleAssignVehicle}
                    handleSetShiftField={handleSetShiftField}
                    isOvertime={isOvertime}
                    setChangeMobilTarget={setChangeMobilTarget}
                    dtVal={dtVal}
                    fmtDT={fmtDT}
                    toMs={toMs}
                />
            )}
            {activeTab === 'employees' && (
                <PersonnelDirectory
                    filteredEmpleados={filteredEmpleados}
                    empSearch={empSearch}
                    setEmpSearch={setEmpSearch}
                    showInactive={showInactive}
                    setShowInactive={setShowInactive}
                    onEditEmpleado={openEditEmp}
                />
            )}
            {activeTab === 'payroll' && (
                <PersonnelPayroll
                    empleados={empleados}
                    turnosHoy={turnosHoy}
                    showToast={showToast}
                />
            )}
            </div>

            {/* Reusable Modals */}
            <ShiftModal
                isOpen={isShiftModalOpen}
                onClose={() => setIsShiftModalOpen(false)}
                onSubmit={handleScheduleSubmit}
                newShift={newShift}
                setNewShift={setNewShift}
                activeEmpleados={activeEmpleados}
                getAvailableVehiclesForDate={getAvailableVehiclesForDate}
                submitting={submitting}
            />

            <EmployeeModal
                isOpen={isEmpModalOpen}
                onClose={() => setIsEmpModalOpen(false)}
                onSubmit={handleEmpSubmit}
                empForm={empForm}
                setEmpForm={setEmpForm}
                editingEmp={editingEmp}
                submitting={submitting}
            />

            {/* Change Mobil Inline Modal */}
            {changeMobilTarget && (
                <div className="fixed inset-0 bg-dark-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-dark-800 border border-slate-700 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-700 flex justify-between items-center bg-dark-900/50">
                            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                <Truck size={18} className="text-blue-400" /> Reasignar Móvil
                            </h2>
                            <button onClick={() => setChangeMobilTarget(null)} className="text-slate-400 hover:text-white"><X size={18} /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <p className="text-slate-400 text-sm">
                                <span className="text-white font-semibold">{changeMobilTarget.nombre}</span> —
                                actualmente en <span className="font-mono text-slate-300">{changeMobilTarget.movil}</span>
                            </p>
                            <div>
                                <label className="block text-sm font-semibold text-slate-300 mb-1.5">Nuevo Móvil</label>
                                <select id="nuevo-movil-select"
                                    className="w-full bg-dark-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500">
                                    <option value="">Sin Asignar</option>
                                    {getAvailableVehiclesForDate(changeMobilTarget.fecha, changeMobilTarget.cargo, changeMobilTarget.id).map(v => (
                                        <option key={v.id} value={v.id}>{v.id} — {v.tipo}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button onClick={() => setChangeMobilTarget(null)} className="flex-1 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-white font-semibold transition-colors">Cancelar</button>
                                <button onClick={() => handleChangeMobilSubmit(document.getElementById('nuevo-movil-select').value)}
                                    className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-lg text-white font-bold transition-colors">
                                    Confirmar Cambio
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PersonnelView;
