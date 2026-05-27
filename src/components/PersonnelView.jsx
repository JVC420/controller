import React, { useState, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Clock, Calendar, Download, Plus, AlertCircle, FileText, CheckCircle, Truck, X, User, Maximize2 } from 'lucide-react';
import { clsx } from 'clsx';
import { ToastContainer, useToast } from './ui/Toast';
import { getRoleDisplayName, getRoleListDisplay } from '../utils/roleDisplay';
import { CREW_RULES } from '../utils/fleetStatus';
import { getActiveCrewNow, getShiftTimeSemantics, validatePlannedShiftAssignment } from '../utils/shiftOperations';

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
    if (!val) return null;
    if (val.includes('T')) return new Date(val).getTime();
    if (!fecha) return null;
    return new Date(`${fecha}T${val}:00`).getTime();
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
    const realMs = toMs(inicioReal, fecha);
    const progMs = toMs(inicioProgramado, fecha);
    if (realMs == null || progMs == null) {
        return { label: 'En Turno', styles: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' };
    }
    return realMs <= progMs + 15 * 60000
        ? { label: 'En Turno', styles: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' }
        : { label: 'Tarde', styles: 'bg-orange-500/10 text-orange-400 border-orange-500/20' };
};

const getPunctualityStatusLabel = (inicioProgramado, inicioReal, horaFinReal, cancelado, ausenciaConfirmada, fecha) => {
    return getPunctualityStatus(inicioProgramado, inicioReal, horaFinReal, cancelado, ausenciaConfirmada, fecha).label;
};

const isOvertime = (progFinStr, realFinStr, fecha) => {
    if (!progFinStr || !realFinStr) return false;
    const progMs = toMs(progFinStr, fecha);
    const realMs = toMs(realFinStr, fecha);
    if (progMs == null || realMs == null) return false;
    return (realMs - progMs) > 1800000;
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
    const [isFleetModalOpen, setIsFleetModalOpen] = useState(false);
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
                return (b.fecha || '').localeCompare(a.fecha || '') || (a.inicioProgramado || '').localeCompare(b.inicioProgramado || '');
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

    // Active crew now is derived from execution window and current clock.
    const getActiveCrewForVehicle = useCallback((vehicleId, excludeTurnoId = null) => {
        return getActiveCrewNow(turnosHoy, vehicleId, Date.now(), excludeTurnoId);
    }, [turnosHoy]);

    const getValidationMessage = (error) => {
        if (error === 'Employee has overlapping planned shifts.') return 'El empleado tiene solape de turnos programados en ese rango.';
        if (error === 'Shift planned interval is invalid.') return 'El rango programado del turno es inválido.';
        if (error.includes('no available slot for role')) return 'No hay cupo disponible para ese cargo en la móvil y rango seleccionados.';
        if (error.includes('is not allowed for vehicle type')) return 'El cargo del empleado no es compatible con el tipo de ambulancia.';
        return error;
    };

    // Returns vehicles that have room for the given cargo role
    const getAvailableVehiclesForDate = useCallback((fecha, cargo, excludeTurnoId = null, inicioProgramado = null, finProgramado = null, empleadoId = null) => {
        const plannedStart = inicioProgramado || `${fecha}T00:00`;
        const plannedEnd = finProgramado || `${fecha}T23:59`;
        return flota.filter(f => {
            if (f.estado === 'Fuera de Servicio') return false;
            const rules = CREW_RULES[f.tipo];
            if (!rules) return false;

            const validation = validatePlannedShiftAssignment({
                candidateShift: {
                    id: excludeTurnoId,
                    id_empleado: empleadoId,
                    cargo,
                    movil: f.id,
                    fecha,
                    inicioProgramado: plannedStart,
                    horaFin: plannedEnd,
                    finProgramado: plannedEnd,
                },
                allShifts: turnosHoy,
                requiredRoles: rules,
                vehicleType: f.tipo,
                excludeShiftId: excludeTurnoId,
            });

            return validation.valid;
        });
    }, [turnosHoy, flota]);

    // --- Handlers ---
    const handleScheduleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const emp = empleados.find(e => e.id === newShift.empleadoId);
            if (!emp) {
                showToast('Empleado inválido para programar turno.', 'error');
                return;
            }

            const plannedTurno = {
                id_empleado: emp.id,
                cargo: emp.cargo,
                movil: newShift.vehiculo || 'Sin Asignar',
                fecha: newShift.dtInicio.split('T')[0],
                inicioProgramado: newShift.dtInicio,
                horaFin: newShift.dtFin,
                finProgramado: newShift.dtFin,
            };

            const employeeValidation = validatePlannedShiftAssignment({
                candidateShift: { ...plannedTurno, movil: 'Sin Asignar' },
                allShifts: turnosHoy,
                requiredRoles: [],
                vehicleType: '',
            });
            if (!employeeValidation.valid) {
                showToast(getValidationMessage(employeeValidation.errors[0]), 'error');
                return;
            }

            // Validate vehicle crew capacity
            if (newShift.vehiculo) {
                const veh = flota.find(f => f.id === newShift.vehiculo);
                if (veh) {
                    const rules = CREW_RULES[veh.tipo] || [];
                    if (!rules.includes(emp.cargo)) {
                        showToast(`Un ${getRoleDisplayName(emp.cargo)} no puede asignarse a una ambulancia ${veh.tipo}. Roles permitidos: ${getRoleListDisplay(rules)}.`, 'error');
                        return;
                    }

                    const vehicleValidation = validatePlannedShiftAssignment({
                        candidateShift: plannedTurno,
                        allShifts: turnosHoy,
                        requiredRoles: rules,
                        vehicleType: veh.tipo,
                    });

                    if (!vehicleValidation.valid) {
                        showToast(getValidationMessage(vehicleValidation.errors[0]), 'error');
                        return;
                    }
                }
            }

            const semantics = getShiftTimeSemantics(plannedTurno);
            const turnoData = {
                id_empleado: emp.id,
                cedula: emp.cedula,
                nombre: emp.nombre,
                cargo: emp.cargo,
                fecha: newShift.dtInicio.split('T')[0],
                inicioProgramado: newShift.dtInicio,
                horaFin: newShift.dtFin,
                finProgramado: newShift.dtFin,
                movil: newShift.vehiculo || 'Sin Asignar',
                estadoRegistro: 'Activo',
                planningStatus: semantics.planningStatus,
                executionStatus: semantics.executionStatus,
                incidentFlags: semantics.incidentFlags,
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
            // Validate new vehicle if assigning
            if (newVehicleId && newVehicleId !== 'Sin Asignar') {
                const veh = flota.find(f => f.id === newVehicleId);
                if (veh) {
                    const rules = CREW_RULES[veh.tipo] || [];
                    if (!rules.includes(turno.cargo)) {
                        showToast(`Un ${getRoleDisplayName(turno.cargo)} no puede asignarse a una ambulancia ${veh.tipo}. Roles permitidos: ${getRoleListDisplay(rules)}.`, 'error');
                        return;
                    }

                    const vehicleValidation = validatePlannedShiftAssignment({
                        candidateShift: {
                            ...turno,
                            movil: newVehicleId,
                            finProgramado: turno.finProgramado || turno.horaFin,
                        },
                        allShifts: turnosHoy,
                        requiredRoles: rules,
                        vehicleType: veh.tipo,
                        excludeShiftId: turno.id,
                    });

                    if (!vehicleValidation.valid) {
                        showToast(getValidationMessage(vehicleValidation.errors[0]), 'error');
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
            const turno = turnosHoy.find(t => t.id === turnoId);
            const updates = { [field]: value };
            if (field === 'horaFinReal' && value) updates.estadoRegistro = 'Finalizado';
            if (field === 'cancelado' && value) updates.estadoRegistro = 'Cancelado';
            if (field === 'ausenciaConfirmada' && value) updates.estadoRegistro = 'Ausencia';
            if (field === 'inicioReal' && value) {
                if (turno && turno.inicioProgramado) {
                    const realMs = toMs(value, turno.fecha);
                    const progMs = toMs(turno.inicioProgramado, turno.fecha);
                    if (realMs != null && progMs != null) {
                        const isLate = realMs > progMs + 15 * 60000;
                        updates.estadoRegistro = isLate ? 'Tarde' : 'En Turno';
                    }
                }
            }

            if (turno) {
                const nextShift = {
                    ...turno,
                    ...updates,
                    finProgramado: turno.finProgramado || turno.horaFin,
                };
                const semantics = getShiftTimeSemantics(nextShift);
                updates.planningStatus = semantics.planningStatus;
                updates.executionStatus = semantics.executionStatus;
                updates.incidentFlags = semantics.incidentFlags;
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
        if (!editingEmp && empForm.cedula && empleados.some((emp) => emp.cedula === empForm.cedula)) {
            showToast('Ya existe un empleado con esta cedula', 'error');
            return;
        }
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
                        <button data-tour="rh-add-shift" onClick={() => setIsShiftModalOpen(true)} className="flex-1 md:flex-none justify-center bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-lg font-bold flex items-center gap-2 transition-colors shadow-lg shadow-blue-900/30">
                            <Calendar size={18} /> Programar Turno
                        </button>
                    )}
                    {activeTab === 'employees' && (
                        <button data-tour="rh-add-employee" onClick={openNewEmp} className="flex-1 md:flex-none justify-center bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-lg font-bold flex items-center gap-2 transition-colors shadow-lg shadow-emerald-900/30">
                            <Plus size={18} /> Añadir Empleado
                        </button>
                    )}
                </div>
            </header>

            {/* Fleet Crew Status */}
            {activeTab === 'live' && flota.length > 0 && (
                <div data-tour="rh-crew-status" className="mb-4 shrink-0">
                    <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                            <Truck size={16} className="text-blue-400" />
                            <span className="text-sm font-bold text-slate-300">Estado de Tripulación</span>
                        </div>
                        <button
                            onClick={() => setIsFleetModalOpen(true)}
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-700/50 border border-slate-700 hover:border-slate-600 transition-colors"
                            title="Ver todas las ambulancias"
                        >
                            <Maximize2 size={14} />
                            <span className="hidden sm:inline">Ver todas</span>
                        </button>
                    </div>
                    <div className="max-h-[18vh] overflow-y-auto overflow-x-hidden pr-1">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-1.5 auto-rows-fr">
                        {flota.filter(f => f.estado !== 'Fuera de Servicio')
                            .map(veh => ({ veh, crew: getActiveCrewForVehicle(veh.id) }))
                            .sort((a, b) => b.crew.length - a.crew.length)
                            .map(({ veh, crew }) => {
                            const rules = CREW_RULES[veh.tipo] || [];
                            const isFull = rules.length > 0 && rules.every(role => crew.some(c => c.cargo === role));
                            const fillRatio = rules.length ? Math.round((crew.length / rules.length) * 100) : 0;
                            return (
                                <div key={veh.id} className={clsx(
                                    "min-w-0 rounded-md border px-2 py-1.5 flex flex-col gap-1.5",
                                    isFull
                                        ? "bg-emerald-500/10 border-emerald-500/35"
                                        : crew.length > 0
                                            ? "bg-amber-500/10 border-amber-500/35"
                                            : "bg-dark-800 border-slate-700/90"
                                )}>
                                    <div className="flex items-center justify-between">
                                        <span className="font-mono font-bold text-xs text-white tracking-wide truncate pr-2">{veh.id}</span>
                                        <span className={clsx("text-[8px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider",
                                            isFull ? "bg-emerald-500/20 text-emerald-300" : "bg-slate-700/90 text-slate-300"
                                        )}>
                                            {veh.tipo === 'Medicalizada' ? 'TAM' : 'TAB'}
                                        </span>
                                    </div>

                                    <div className="space-y-0.5 min-h-[50px]">
                                        {rules.map(role => {
                                            const member = crew.find(c => c.cargo === role);
                                            return (
                                                <div key={role} className={clsx(
                                                    "rounded-md border px-1.5 py-0 text-[8px] leading-4 flex items-center justify-between gap-1",
                                                    member
                                                        ? "bg-emerald-500/10 border-emerald-500/25"
                                                        : "bg-slate-900/70 border-slate-700/80"
                                                )}>
                                                    <span className="text-slate-400 truncate">{getRoleDisplayName(role)}</span>
                                                    <span className={clsx(
                                                        "font-semibold truncate",
                                                        member ? "text-emerald-300" : "text-slate-500"
                                                    )}>
                                                        {member ? member.nombre.split(' ')[0] : 'Pendiente'}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    <div className="mt-auto space-y-0.5 pt-0.5">
                                        <div className="h-1 rounded-full bg-slate-800 overflow-hidden">
                                            <div
                                                className={clsx(
                                                    "h-full rounded-full transition-all duration-300",
                                                    isFull ? "bg-emerald-400" : "bg-amber-400"
                                                )}
                                                style={{ width: `${fillRatio}%` }}
                                            />
                                        </div>
                                        <div className="text-[8px] font-semibold flex items-center justify-between">
                                            {isFull
                                                ? <span className="text-emerald-300">Tripulación completa</span>
                                                : <span className="text-slate-400">Tripulación incompleta</span>
                                            }
                                            <span className="text-slate-500">{crew.length}/{rules.length}</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    </div>
                </div>
            )}

            {/* Tabs */}
            <div data-tour="rh-tabs" className="flex gap-1 mb-6 border-b border-slate-700/50 pb-px overflow-x-auto hide-scrollbar shrink-0">
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
            <div className="flex-1 overflow-y-auto overflow-x-auto min-h-0">
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
                                    {getAvailableVehiclesForDate(
                                        changeMobilTarget.fecha,
                                        changeMobilTarget.cargo,
                                        changeMobilTarget.id,
                                        changeMobilTarget.inicioProgramado,
                                        changeMobilTarget.finProgramado || changeMobilTarget.horaFin,
                                        changeMobilTarget.id_empleado
                                    ).map(v => (
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

            {/* Fleet Overview Modal */}
            {isFleetModalOpen && createPortal(
                <div
                    className="flex items-center justify-center p-4"
                    style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 2147483647,
                        backgroundColor: 'rgba(2, 6, 23, 0.80)',
                        backdropFilter: 'blur(2px)',
                        WebkitBackdropFilter: 'blur(2px)'
                    }}
                >
                    <div className="bg-dark-800 border border-slate-700 rounded-2xl w-full max-w-5xl max-h-[85vh] shadow-2xl overflow-hidden flex flex-col">
                        <div className="px-6 py-4 border-b border-slate-700 flex justify-between items-center bg-dark-900/50 shrink-0">
                            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                <Truck size={18} className="text-blue-400" /> Estado de Flota Completa
                            </h2>
                            <button onClick={() => setIsFleetModalOpen(false)} className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors">
                                <X size={18} />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto flex-1">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                {flota
                                    .map(veh => {
                                        const crew = getActiveCrewForVehicle(veh.id);
                                        const rules = CREW_RULES[veh.tipo] || [];
                                        const isFull = rules.length > 0 && rules.every(role => crew.some(c => c.cargo === role));
                                        const isOutOfService = veh.estado === 'Fuera de Servicio';
                                        // Sort priority: partial (1) > full (2) > empty (3) > out of service (4)
                                        let sortOrder = 3; // empty
                                        if (isOutOfService) sortOrder = 4;
                                        else if (isFull) sortOrder = 2;
                                        else if (crew.length > 0) sortOrder = 1;
                                        return { veh, crew, rules, isFull, isOutOfService, sortOrder };
                                    })
                                    .sort((a, b) => a.sortOrder - b.sortOrder)
                                    .map(({ veh, crew, rules, isFull, isOutOfService }) => {
                                    const fillRatio = rules.length ? Math.round((crew.length / rules.length) * 100) : 0;

                                    return (
                                        <div key={veh.id} className={clsx(
                                            "rounded-xl border p-4 flex flex-col gap-3",
                                            isOutOfService
                                                ? "bg-red-950/20 border-red-900/50 opacity-70"
                                                : isFull
                                                    ? "bg-emerald-500/10 border-emerald-500/40"
                                                    : crew.length > 0
                                                        ? "bg-amber-500/10 border-amber-500/40"
                                                        : "bg-dark-900 border-slate-700"
                                        )}>
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className={clsx(
                                                        "p-2 rounded-lg",
                                                        isOutOfService
                                                            ? "bg-red-500/20 text-red-400"
                                                            : isFull
                                                                ? "bg-emerald-500/20 text-emerald-400"
                                                                : "bg-slate-700/50 text-slate-400"
                                                    )}>
                                                        <Truck size={20} />
                                                    </div>
                                                    <div>
                                                        <h3 className="font-mono font-bold text-white text-lg">{veh.id}</h3>
                                                        <p className="text-xs text-slate-500">{veh.tipo}</p>
                                                    </div>
                                                </div>
                                                <span className={clsx(
                                                    "text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider",
                                                    isOutOfService
                                                        ? "bg-red-500/20 text-red-400"
                                                        : isFull
                                                            ? "bg-emerald-500/20 text-emerald-300"
                                                            : "bg-slate-700 text-slate-300"
                                                )}>
                                                    {veh.tipo === 'Medicalizada' ? 'TAM' : 'TAB'}
                                                </span>
                                            </div>

                                            {isOutOfService ? (
                                                <div className="flex items-center gap-2 text-sm text-red-400 bg-red-950/30 p-2 rounded-lg">
                                                    <AlertCircle size={14} />
                                                    <span>Fuera de Servicio</span>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="space-y-1.5">
                                                        {rules.map(role => {
                                                            const member = crew.find(c => c.cargo === role);
                                                            return (
                                                                <div key={role} className={clsx(
                                                                    "rounded-lg border px-3 py-1.5 flex items-center justify-between gap-2",
                                                                    member
                                                                        ? "bg-emerald-500/10 border-emerald-500/30"
                                                                        : "bg-slate-900/50 border-slate-700/80"
                                                                )}>
                                                                    <span className="text-xs text-slate-400 font-medium shrink-0">{getRoleDisplayName(role)}</span>
                                                                    <span className={clsx(
                                                                        "text-xs font-semibold truncate",
                                                                        member ? "text-emerald-300" : "text-slate-500"
                                                                    )}>
                                                                        {member ? member.nombre.split(' ').slice(0, 2).join(' ') : '—'}
                                                                    </span>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>

                                                    <div className="mt-auto pt-2 border-t border-slate-700/50">
                                                        <div className="h-2 rounded-full bg-slate-800 overflow-hidden mb-1.5">
                                                            <div
                                                                className={clsx(
                                                                    "h-full rounded-full transition-all duration-300",
                                                                    isFull ? "bg-emerald-400" : "bg-amber-400"
                                                                )}
                                                                style={{ width: `${fillRatio}%` }}
                                                            />
                                                        </div>
                                                        <div className="flex items-center justify-between text-xs font-semibold">
                                                            {isFull
                                                                ? <span className="text-emerald-400 flex items-center gap-1"><CheckCircle size={12} /> Completa</span>
                                                                : <span className="text-slate-400">Tripulación incompleta</span>
                                                            }
                                                            <span className="text-slate-500">{crew.length}/{rules.length}</span>
                                                        </div>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default PersonnelView;
