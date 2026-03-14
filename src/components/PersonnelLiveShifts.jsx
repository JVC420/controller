import React, { useState, useEffect, useMemo } from 'react';
import { clsx } from 'clsx';
import { Truck, CheckCircle, AlertCircle, X, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import ShiftTimeInput from './ui/ShiftTimeInput';

const PAGE_SIZE = 30;

const PersonnelLiveShifts = ({
    filteredTurnos,
    filters,
    setFilters,
    uniqueFechas,
    allEstados,
    uniqueCargos,
    uniqueMoviles,
    hasFilters,
    getPunctualityStatus,
    getAvailableVehiclesForDate,
    handleAssignVehicle,
    handleSetShiftField,
    isOvertime,
    setChangeMobilTarget,
    dtVal,
    fmtDT,
    toMs
}) => {
    const onAusenciaClick = (turno) => {
        if (window.confirm(`¿Confirmar ausencia de ${turno.nombre}?`)) {
            handleSetShiftField(turno.id, 'ausenciaConfirmada', true);
        }
    };
    const onCancelarClick = (turno) => {
        if (window.confirm(`¿Cancelar turno de ${turno.nombre}?`)) {
            handleSetShiftField(turno.id, 'cancelado', true);
        }
    };

    const [now, setNow] = useState(new Date());
    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 10000); // update every 10s (saves CPU)
        return () => clearInterval(timer);
    }, []);

    const [currentPage, setCurrentPage] = useState(1);
    useEffect(() => { setCurrentPage(1); }, [filters]);
    const totalPages = Math.max(1, Math.ceil(filteredTurnos.length / PAGE_SIZE));
    const paginatedTurnos = useMemo(() => {
        const start = (currentPage - 1) * PAGE_SIZE;
        return filteredTurnos.slice(start, start + PAGE_SIZE);
    }, [filteredTurnos, currentPage]);
    const timeStr = now.toLocaleTimeString('es-CO', { timeZone: 'America/Bogota', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });

    return (
        <div className="flex flex-col gap-4">
            {/* Filters */}
            <div className="flex flex-wrap gap-3 mb-4 items-center">
                <select className="bg-dark-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:border-blue-500 outline-none w-full md:w-auto"
                    value={filters.fecha} onChange={e => setFilters(f => ({ ...f, fecha: e.target.value }))}>
                    <option value="">Todas las fechas</option>
                    {uniqueFechas.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
                <select className="bg-dark-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:border-blue-500 outline-none w-full md:w-auto"
                    value={filters.estado} onChange={e => setFilters(f => ({ ...f, estado: e.target.value }))}>
                    <option value="">Todos los estados</option>
                    {allEstados.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <select className="bg-dark-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:border-blue-500 outline-none w-full md:w-auto"
                    value={filters.cargo} onChange={e => setFilters(f => ({ ...f, cargo: e.target.value }))}>
                    <option value="">Todos los cargos</option>
                    {uniqueCargos.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <select className="bg-dark-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:border-blue-500 outline-none w-full md:w-auto"
                    value={filters.movil} onChange={e => setFilters(f => ({ ...f, movil: e.target.value }))}>
                    <option value="">Todos los móviles</option>
                    {uniqueMoviles.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                {hasFilters && (
                    <button onClick={() => setFilters({ fecha: '', estado: '', cargo: '', movil: '' })}
                        className="text-xs text-slate-400 hover:text-white border border-slate-700 hover:border-slate-500 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 w-full md:w-auto justify-center">
                        <X size={12} /> Limpiar filtros
                    </button>
                )}
                <span className="md:ml-auto text-xs text-slate-500 w-full md:w-auto text-center md:text-right">{filteredTurnos.length} turno(s)</span>
                <span className="flex items-center gap-1.5 bg-dark-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm font-mono text-emerald-400 font-semibold w-full md:w-auto justify-center">
                    <Clock size={14} className="text-emerald-500" />
                    {timeStr}
                </span>
            </div>

            <div className="bg-dark-800 border border-slate-700 rounded-xl shadow-md lg:shadow-2xl max-w-full">
                <div className="overflow-x-auto max-w-full">
                    {/* Desktop View: Table */}
                    <table className="hidden min-[1600px]:table w-full min-w-[1160px] max-[1860px]:min-w-[1020px] text-left border-collapse whitespace-nowrap">
                        {/* Table Header */}
                        <thead className="sticky top-0 bg-dark-900/95 backdrop-blur z-10">
                            <tr className="text-slate-400 text-xs uppercase tracking-wider border-b border-slate-700">
                                <th className="hidden xl:table-cell max-[1860px]:hidden py-2.5 px-2.5 2xl:py-3 2xl:px-3 font-semibold">Cédula</th>
                                <th className="py-2.5 px-2.5 2xl:py-3 2xl:px-3 font-semibold">Empleado</th>
                                <th className="hidden lg:table-cell py-2.5 px-2.5 2xl:py-3 2xl:px-3 font-semibold">Cargo</th>
                                <th className="py-2.5 px-2.5 2xl:py-3 2xl:px-3 font-semibold">Móvil</th>
                                <th className="hidden lg:table-cell max-[1760px]:hidden py-2.5 px-2.5 2xl:py-3 2xl:px-3 font-semibold">Fecha</th>
                                <th className="py-2.5 px-2.5 2xl:py-3 2xl:px-3 font-semibold">Inicio Prog.</th>
                                <th className="hidden xl:table-cell max-[1860px]:hidden py-2.5 px-2.5 2xl:py-3 2xl:px-3 font-semibold">Fin Prog.</th>
                                <th className="py-2.5 px-2.5 2xl:py-3 2xl:px-3 font-semibold">Inicio Real</th>
                                <th className="py-2.5 px-2.5 2xl:py-3 2xl:px-3 font-semibold">Salida Real</th>
                                <th className="py-2.5 px-2.5 2xl:py-3 2xl:px-3 font-semibold">Estado</th>
                                <th className="py-2.5 px-2.5 2xl:py-3 2xl:px-3 font-semibold text-center">Acciones</th>
                            </tr>
                        </thead>
                        {/* Table Body */}
                        <tbody className="divide-y divide-slate-700/50">
                            {paginatedTurnos.length === 0 && (
                                <tr><td colSpan="11" className="py-12 text-center text-slate-500 text-sm">No hay turnos que coincidan con los filtros.</td></tr>
                            )}
                            {paginatedTurnos.map(turno => {
                                const status = getPunctualityStatus(turno.inicioProgramado, turno.inicioReal, turno.horaFinReal, turno.cancelado, turno.ausenciaConfirmada, turno.fecha);
                                const sinMovil = !turno.movil || turno.movil === 'Sin Asignar';
                                const overtime = isOvertime(turno.horaFin, turno.horaFinReal, turno.fecha);
                                const isCancelled = turno.cancelado;
                                const isAbsent = turno.ausenciaConfirmada;
                                return (
                                    <tr key={turno.id} className={clsx("hover:bg-slate-700/20 transition-colors text-sm text-slate-300", (isCancelled || isAbsent) && 'opacity-40')}>
                                        <td className="hidden xl:table-cell max-[1860px]:hidden py-2.5 px-2.5 2xl:px-3 font-mono text-slate-500 text-xs">{turno.cedula || '—'}</td>
                                        <td className="py-2.5 px-3 min-w-[200px] max-w-[260px]">
                                            <div className="font-semibold text-slate-100 flex items-center gap-2 truncate">
                                                <span className="truncate">{turno.nombre}</span>
                                                {isCancelled && <span className="text-[10px] bg-red-900/40 text-red-400 border border-red-700/30 px-1.5 py-0.5 rounded font-bold normal-case">Baja</span>}
                                                {isAbsent && !isCancelled && <span className="text-[10px] bg-slate-800 text-slate-500 border border-slate-700 px-1.5 py-0.5 rounded font-bold normal-case">Ausencia</span>}
                                            </div>
                                            <div className="text-[10px] text-slate-600 font-mono">{turno.id_empleado}</div>
                                        </td>
                                        <td className="hidden lg:table-cell py-2.5 px-2.5 2xl:px-3 text-slate-400">{turno.cargo}</td>
                                        <td className="py-2.5 px-2.5 2xl:px-3">
                                            {(isCancelled || isAbsent) ? (
                                                <span className="font-mono text-slate-600 text-xs">{turno.movil || 'Sin Asignar'}</span>
                                            ) : sinMovil ? (
                                                <select className="bg-amber-950/40 border border-amber-700/50 text-amber-300 rounded px-2 py-1 text-xs focus:outline-none focus:border-blue-500 font-mono"
                                                    defaultValue=""
                                                    onChange={e => handleAssignVehicle(turno, e.target.value)}>
                                                    <option value="">Sin Asignar</option>
                                                    {getAvailableVehiclesForDate(turno.fecha, turno.cargo).map(v => (
                                                        <option key={v.id} value={v.id}>{v.id} – {v.tipo}</option>
                                                    ))}
                                                </select>
                                            ) : (
                                                <span className="font-mono font-semibold text-slate-200">{turno.movil}</span>
                                            )}
                                        </td>
                                        <td className="hidden lg:table-cell max-[1760px]:hidden py-2.5 px-2.5 2xl:px-3 font-mono text-xs text-slate-400">{turno.fecha || '—'}</td>
                                        <td className="py-2.5 px-2.5 2xl:px-3 font-mono text-slate-300 text-xs">{fmtDT(turno.inicioProgramado)}</td>
                                        <td className="hidden xl:table-cell max-[1860px]:hidden py-2.5 px-2.5 2xl:px-3 font-mono text-slate-400 text-xs">{fmtDT(turno.horaFin)}</td>
                                        <td className="py-2.5 px-2.5 2xl:px-3 min-w-[170px] max-[1860px]:min-w-[150px]">
                                            <ShiftTimeInput
                                                value={dtVal(turno.inicioReal, turno.fecha)}
                                                disabled={isCancelled || isAbsent || status.label === 'Finalizado'}
                                                label="Inicio real"
                                                onSave={val => {
                                                    if (turno.inicioProgramado && toMs(val, turno.fecha) < toMs(turno.inicioProgramado, turno.fecha)) {
                                                        alert('La fecha/hora de inicio real no puede ser menor a la programada.');
                                                        return;
                                                    }
                                                    handleSetShiftField(turno.id, 'inicioReal', val);
                                                }}
                                            />
                                        </td>
                                        <td className="py-2.5 px-2.5 2xl:px-3 min-w-[170px] max-[1860px]:min-w-[150px]">
                                            <div className="flex items-center gap-1.5">
                                                <ShiftTimeInput
                                                    value={dtVal(turno.horaFinReal, turno.fecha)}
                                                    disabled={isCancelled || isAbsent || status.label === 'Finalizado'}
                                                    overtime={overtime}
                                                    label="Salida real"
                                                    onSave={val => {
                                                        if (!turno.inicioReal) {
                                                            alert('Debe ingresar la fecha/hora de inicio real antes de registrar la salida.');
                                                            return;
                                                        }
                                                        if (toMs(val, turno.fecha) < toMs(turno.inicioReal, turno.fecha)) {
                                                            alert('La salida real no puede ser menor a la hora de inicio real.');
                                                            return;
                                                        }
                                                        const fmtIni = fmtDT(turno.inicioReal);
                                                        const confirmado = window.confirm(`¿Confirmar salida ${fmtDT(val)}?\nInicio real: ${fmtIni}\n\nEsta acción finalizará el turno.`);
                                                        if (!confirmado) return;
                                                        handleSetShiftField(turno.id, 'horaFinReal', val);
                                                    }}
                                                />
                                                {overtime && <span title="Sobretiempo" className="text-orange-400 text-xs font-bold">+OT</span>}
                                            </div>
                                        </td>
                                        <td className="py-2.5 px-2.5 2xl:px-3">
                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold border ${status.styles}`}>
                                                {status.label === 'Tarde' && <AlertCircle size={11} />}
                                                {status.label === 'En Turno' && <CheckCircle size={11} />}
                                                {status.label}
                                            </span>
                                        </td>
                                        <td className="py-2.5 px-2.5 2xl:px-3 text-center">
                                            {!isCancelled && !isAbsent && status.label !== 'Finalizado' && (
                                                <div className="flex items-center justify-center gap-1">
                                                    <button onClick={() => setChangeMobilTarget(turno)} className="text-blue-400 hover:bg-blue-900/40 p-1 rounded-lg transition-colors border border-transparent hover:border-blue-700/50" title="Cambiar Móvil">
                                                        <Truck size={14} />
                                                    </button>
                                                    <button onClick={() => onAusenciaClick(turno)} className="text-orange-400 hover:bg-orange-900/40 p-1 rounded-lg transition-colors border border-transparent hover:border-orange-700/50" title="Marcar Ausencia">
                                                        <AlertCircle size={14} />
                                                    </button>
                                                    <button onClick={() => onCancelarClick(turno)} className="text-red-400 hover:bg-red-900/40 p-1 rounded-lg transition-colors border border-transparent hover:border-red-700/50" title="Cancelar Turno">
                                                        <X size={14} />
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>

                    {/* Tablet View: Compact List */}
                    <div className="hidden">
                        {paginatedTurnos.length === 0 && (
                            <div className="py-10 text-center text-slate-500 text-sm">No hay turnos que coincidan con los filtros.</div>
                        )}
                        {paginatedTurnos.map(turno => {
                            const status = getPunctualityStatus(turno.inicioProgramado, turno.inicioReal, turno.horaFinReal, turno.cancelado, turno.ausenciaConfirmada, turno.fecha);
                            const sinMovil = !turno.movil || turno.movil === 'Sin Asignar';
                            const overtime = isOvertime(turno.horaFin, turno.horaFinReal, turno.fecha);
                            const isCancelled = turno.cancelado;
                            const isAbsent = turno.ausenciaConfirmada;

                            return (
                                <div key={`tablet-${turno.id}`} className={clsx("bg-dark-900 border border-slate-700 rounded-lg px-3 py-2.5", (isCancelled || isAbsent) && 'opacity-60')}>
                                    <div className="flex items-start justify-between gap-3 mb-2">
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <span className="font-semibold text-slate-100 truncate">{turno.nombre}</span>
                                                {isCancelled && <span className="text-[10px] bg-red-900/40 text-red-400 border border-red-700/30 px-1.5 py-0.5 rounded font-bold normal-case">Baja</span>}
                                                {isAbsent && !isCancelled && <span className="text-[10px] bg-slate-800 text-slate-500 border border-slate-700 px-1.5 py-0.5 rounded font-bold normal-case">Ausencia</span>}
                                            </div>
                                            <div className="text-[11px] text-slate-500">{turno.cargo} • {turno.fecha || '—'} • {turno.cedula || '—'}</div>
                                        </div>
                                        <div className="flex items-center gap-1.5 shrink-0">
                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${status.styles}`}>
                                                {status.label === 'Tarde' && <AlertCircle size={10} />}
                                                {status.label === 'En Turno' && <CheckCircle size={10} />}
                                                {status.label}
                                            </span>
                                            {!isCancelled && !isAbsent && status.label !== 'Finalizado' && !sinMovil && (
                                                <button onClick={() => setChangeMobilTarget(turno)} className="text-blue-400 hover:bg-blue-900/40 p-1 rounded-lg transition-colors border border-transparent hover:border-blue-700/50" title="Cambiar Móvil">
                                                    <Truck size={14} />
                                                </button>
                                            )}
                                            {!isCancelled && !isAbsent && status.label !== 'Finalizado' && (
                                                <>
                                                    <button onClick={() => onAusenciaClick(turno)} className="text-orange-400 hover:bg-orange-900/40 p-1 rounded-lg transition-colors border border-transparent hover:border-orange-700/50" title="Marcar Ausencia">
                                                        <AlertCircle size={14} />
                                                    </button>
                                                    <button onClick={() => onCancelarClick(turno)} className="text-red-400 hover:bg-red-900/40 p-1 rounded-lg transition-colors border border-transparent hover:border-red-700/50" title="Cancelar Turno">
                                                        <X size={14} />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-3 gap-2 mb-2.5 text-[11px]">
                                        <div className="rounded-md border border-slate-700/70 bg-slate-800/30 px-2 py-1.5">
                                            <div className="text-slate-500 uppercase tracking-wider text-[9px] font-semibold">Móvil</div>
                                            {(isCancelled || isAbsent) ? (
                                                <div className="font-mono text-slate-500">{turno.movil || 'Sin Asignar'}</div>
                                            ) : sinMovil ? (
                                                <select
                                                    className="mt-1 w-full bg-amber-950/40 border border-amber-700/50 text-amber-300 rounded px-1.5 py-1 text-[10px] focus:outline-none focus:border-blue-500 font-mono"
                                                    defaultValue=""
                                                    onChange={e => handleAssignVehicle(turno, e.target.value)}
                                                >
                                                    <option value="">Sin Asignar</option>
                                                    {getAvailableVehiclesForDate(turno.fecha, turno.cargo).map(v => (
                                                        <option key={v.id} value={v.id}>{v.id} – {v.tipo}</option>
                                                    ))}
                                                </select>
                                            ) : (
                                                <div className="font-mono text-slate-200 font-semibold">{turno.movil}</div>
                                            )}
                                        </div>
                                        <div className="rounded-md border border-slate-700/70 bg-slate-800/30 px-2 py-1.5">
                                            <div className="text-slate-500 uppercase tracking-wider text-[9px] font-semibold">Inicio Prog.</div>
                                            <div className="font-mono text-slate-300">{fmtDT(turno.inicioProgramado)}</div>
                                        </div>
                                        <div className="rounded-md border border-slate-700/70 bg-slate-800/30 px-2 py-1.5">
                                            <div className="text-slate-500 uppercase tracking-wider text-[9px] font-semibold">Fin Prog.</div>
                                            <div className="font-mono text-slate-400">{fmtDT(turno.horaFin)}</div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="rounded-md border border-slate-700/70 bg-slate-800/30 px-2 py-1.5">
                                            <p className="text-[9px] text-slate-500 uppercase font-semibold mb-1 tracking-wider">Inicio Real</p>
                                            <ShiftTimeInput
                                                value={dtVal(turno.inicioReal, turno.fecha)}
                                                disabled={isCancelled || isAbsent || status.label === 'Finalizado'}
                                                label="Inicio real"
                                                onSave={val => {
                                                    if (turno.inicioProgramado && toMs(val, turno.fecha) < toMs(turno.inicioProgramado, turno.fecha)) {
                                                        alert('La fecha/hora de inicio real no puede ser menor a la programada.');
                                                        return;
                                                    }
                                                    handleSetShiftField(turno.id, 'inicioReal', val);
                                                }}
                                            />
                                        </div>
                                        <div className={clsx("rounded-md border px-2 py-1.5", overtime ? "bg-orange-950/20 border-orange-900/40" : "bg-slate-800/30 border-slate-700/70")}>
                                            <p className="flex justify-between text-[9px] text-slate-500 uppercase font-semibold mb-1 tracking-wider">
                                                <span>Salida Real</span>
                                                {overtime && <span className="text-orange-400">+OT</span>}
                                            </p>
                                            <ShiftTimeInput
                                                value={dtVal(turno.horaFinReal, turno.fecha)}
                                                disabled={isCancelled || isAbsent || status.label === 'Finalizado'}
                                                overtime={overtime}
                                                label="Salida real"
                                                onSave={val => {
                                                    if (!turno.inicioReal) {
                                                        alert('Debe ingresar la fecha/hora de inicio real antes de registrar la salida.');
                                                        return;
                                                    }
                                                    if (toMs(val, turno.fecha) < toMs(turno.inicioReal, turno.fecha)) {
                                                        alert('La salida real no puede ser menor a la hora de inicio real.');
                                                        return;
                                                    }
                                                    const fmtIni = fmtDT(turno.inicioReal);
                                                    const confirmado = window.confirm(`¿Confirmar salida ${fmtDT(val)}?\nInicio real: ${fmtIni}\n\nEsta acción finalizará el turno.`);
                                                    if (!confirmado) return;
                                                    handleSetShiftField(turno.id, 'horaFinReal', val);
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Mobile View: Cards */}
                    <div className="min-[1600px]:hidden flex flex-col p-4 gap-4">
                        {paginatedTurnos.length === 0 && (
                            <div className="py-12 text-center text-slate-500 text-sm">No hay turnos que coincidan con los filtros.</div>
                        )}
                        {paginatedTurnos.map(turno => {
                            const status = getPunctualityStatus(turno.inicioProgramado, turno.inicioReal, turno.horaFinReal, turno.cancelado, turno.ausenciaConfirmada, turno.fecha);
                            const sinMovil = !turno.movil || turno.movil === 'Sin Asignar';
                            const overtime = isOvertime(turno.horaFin, turno.horaFinReal, turno.fecha);
                            const isCancelled = turno.cancelado;
                            const isAbsent = turno.ausenciaConfirmada;

                            return (
                                <div key={turno.id} className={clsx("bg-dark-900 border border-slate-700 rounded-xl p-4 shadow-sm", (isCancelled || isAbsent) && 'opacity-60')}>
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-slate-100">{turno.nombre}</span>
                                                {isCancelled && <span className="text-[10px] bg-red-900/40 text-red-400 border border-red-700/30 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Baja</span>}
                                                {isAbsent && !isCancelled && <span className="text-[10px] bg-slate-800 text-slate-500 border border-slate-700 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Ausencia</span>}
                                            </div>
                                            <p className="text-xs text-slate-400">{turno.cargo} • {turno.fecha}</p>
                                        </div>
                                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold border ${status.styles}`}>
                                            {status.label === 'Tarde' && <AlertCircle size={10} />}
                                            {status.label === 'En Turno' && <CheckCircle size={10} />}
                                            {status.label}
                                        </span>
                                    </div>

                                    {/* Inputs row */}
                                    <div className="grid grid-cols-2 gap-3 mb-3">
                                        <div className="bg-slate-800/30 p-2 rounded-lg border border-slate-700/50">
                                            <p className="text-[10px] text-slate-500 uppercase font-bold mb-1 tracking-wider">Inicio (Prog: {fmtDT(turno.inicioProgramado)})</p>
                                            <ShiftTimeInput
                                                value={dtVal(turno.inicioReal, turno.fecha)}
                                                disabled={isCancelled || isAbsent || status.label === 'Finalizado'}
                                                label="Inicio real"
                                                onSave={val => {
                                                    if (turno.inicioProgramado && toMs(val, turno.fecha) < toMs(turno.inicioProgramado, turno.fecha)) {
                                                        alert('La fecha/hora de inicio real no puede ser menor a la programada.');
                                                        return;
                                                    }
                                                    handleSetShiftField(turno.id, 'inicioReal', val);
                                                }}
                                            />
                                        </div>
                                        <div className={clsx("p-2 rounded-lg border", overtime ? "bg-orange-950/20 border-orange-900/30" : "bg-slate-800/30 border-slate-700/50")}>
                                            <p className="flex justify-between text-[10px] text-slate-500 uppercase font-bold mb-1 tracking-wider">
                                                <span>Fin (Prog: {fmtDT(turno.horaFin)})</span>
                                                {overtime && <span className="text-orange-400">+OT</span>}
                                            </p>
                                            <ShiftTimeInput
                                                value={dtVal(turno.horaFinReal, turno.fecha)}
                                                disabled={isCancelled || isAbsent || status.label === 'Finalizado'}
                                                overtime={overtime}
                                                label="Salida real"
                                                onSave={val => {
                                                    if (!turno.inicioReal) {
                                                        alert('Debe ingresar la fecha/hora de inicio real antes de registrar la salida.');
                                                        return;
                                                    }
                                                    if (toMs(val, turno.fecha) < toMs(turno.inicioReal, turno.fecha)) {
                                                        alert('La salida real no puede ser menor a la hora de inicio real.');
                                                        return;
                                                    }
                                                    const fmtIni = fmtDT(turno.inicioReal);
                                                    const confirmado = window.confirm(`¿Confirmar salida ${fmtDT(val)}?\nInicio real: ${fmtIni}\n\nEsta acción finalizará el turno.`);
                                                    if (!confirmado) return;
                                                    handleSetShiftField(turno.id, 'horaFinReal', val);
                                                }}
                                            />
                                        </div>
                                    </div>

                                    {/* Mobile bottom actions */}
                                    <div className="flex items-center justify-between border-t border-slate-800 pt-3 mt-1">
                                        <div className="flex-1">
                                            {(isCancelled || isAbsent) ? (
                                                <span className="font-mono text-slate-500 text-xs px-2">{turno.movil || 'Sin Asignar'}</span>
                                            ) : sinMovil ? (
                                                <select className="w-full max-w-[150px] bg-amber-950/40 border border-amber-700/50 text-amber-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-blue-500 font-mono"
                                                    defaultValue=""
                                                    onChange={e => handleAssignVehicle(turno, e.target.value)}>
                                                    <option value="">Sin Asignar (Asignar Móvil)</option>
                                                    {getAvailableVehiclesForDate(turno.fecha, turno.cargo).map(v => (
                                                        <option key={v.id} value={v.id}>{v.id} – {v.tipo}</option>
                                                    ))}
                                                </select>
                                            ) : (
                                                <div className="flex items-center gap-2 px-2">
                                                    <Truck size={14} className="text-blue-500/70" />
                                                    <span className="font-mono font-bold text-slate-300 text-sm">{turno.movil}</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {!isCancelled && !isAbsent && status.label !== 'Finalizado' && !sinMovil && (
                                                <button onClick={() => setChangeMobilTarget(turno)}
                                                    className="flex items-center justify-center text-blue-400 hover:bg-blue-900/40 p-2 rounded-lg border border-transparent hover:border-blue-700/50 transition-colors" title="Cambiar Móvil">
                                                    <Truck size={16} />
                                                </button>
                                            )}
                                            {!isCancelled && !isAbsent && status.label !== 'Finalizado' && (
                                                <>
                                                    <button onClick={() => onAusenciaClick(turno)}
                                                        className="flex items-center justify-center text-orange-400 hover:bg-orange-900/40 p-2 rounded-lg border border-transparent hover:border-orange-700/50 transition-colors" title="Marcar Ausencia">
                                                        <AlertCircle size={16} />
                                                    </button>
                                                    <button onClick={() => onCancelarClick(turno)}
                                                        className="flex items-center justify-center text-red-400 hover:bg-red-900/40 p-2 rounded-lg border border-transparent hover:border-red-700/50 transition-colors" title="Cancelar Turno">
                                                        <X size={16} />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between gap-4 text-sm">
                    <span className="text-slate-500 text-xs">
                        Mostrando {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filteredTurnos.length)} de {filteredTurnos.length}
                    </span>
                    <div className="flex items-center gap-1">
                        <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                            className="p-1.5 rounded-lg border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                            <ChevronLeft size={16} />
                        </button>
                        {Array.from({ length: totalPages }, (_, i) => i + 1)
                            .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                            .reduce((acc, p, idx, arr) => {
                                if (idx > 0 && p - arr[idx - 1] > 1) acc.push('...');
                                acc.push(p);
                                return acc;
                            }, [])
                            .map((p, i) => typeof p === 'number' ? (
                                <button key={p} onClick={() => setCurrentPage(p)}
                                    className={clsx('min-w-[32px] h-8 rounded-lg text-xs font-semibold border transition-colors',
                                        p === currentPage ? 'bg-blue-600 border-blue-500 text-white' : 'border-slate-700 text-slate-400 hover:text-white hover:border-slate-500')}>
                                    {p}
                                </button>
                            ) : <span key={`e${i}`} className="text-slate-600 px-1">…</span>)}
                        <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                            className="p-1.5 rounded-lg border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PersonnelLiveShifts;
