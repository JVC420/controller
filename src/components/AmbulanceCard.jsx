import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { clsx } from 'clsx';
import { Stethoscope, Activity, FileWarning, Pencil } from 'lucide-react';
import { getRoleDisplayName } from '../utils/roleDisplay';
import { translateIncidentFlags } from '../utils/shiftOperations';
import {
    AMBULANCE_OPERATIONAL_STATUS,
    canAssignRequestToAmbulance,
    getAmbulanceOperationalSnapshot,
    getCrewRulesForAmbulance,
} from '../utils/fleetStatus';

const AmbulanceCard = ({ ambulance, turnosHoy = [], onStatusChange, serviceRequest, onEditRequest }) => {
    const operationalSnapshot = getAmbulanceOperationalSnapshot(ambulance, turnosHoy);
    const operationalStatus = operationalSnapshot.status;
    const canAcceptRequest = canAssignRequestToAmbulance(ambulance, turnosHoy);

    const { isOver, setNodeRef } = useDroppable({
        id: ambulance.id,
        disabled: !canAcceptRequest,
        data: {
            type: 'AMBULANCE',
            ambulance,
            canAcceptRequest,
            operationalStatus,
        }
    });

    const isAvailable = operationalStatus === AMBULANCE_OPERATIONAL_STATUS.AVAILABLE;
    const inService = operationalStatus === AMBULANCE_OPERATIONAL_STATUS.IN_SERVICE;
    const outOfService = operationalStatus === AMBULANCE_OPERATIONAL_STATUS.OUT_OF_SERVICE;
    const incompleteCrew = operationalStatus === AMBULANCE_OPERATIONAL_STATUS.INCOMPLETE_CREW;

    // Derive crew from active shifts instead of fleet document
    const tripulacion = operationalSnapshot.activeCrew;

    // Calculate Idle Time
    const [idleMinutes, setIdleMinutes] = React.useState(0);

    React.useEffect(() => {
        let interval;
        const shouldCalculateIdle = isAvailable || incompleteCrew;

        if (shouldCalculateIdle) {
            const calculateIdle = () => {
                // Use appropriate timestamp based on status
                const idleStart = incompleteCrew
                    ? ambulance.tripulacionIncompletaDesde || ambulance.estadoOperativoActualizadoAt
                    : ambulance.lastAvailableAt || ambulance.listaAsignacionDesde;

                if (!idleStart) {
                    setIdleMinutes(0);
                    return;
                }

                const ms = new Date(idleStart).getTime();
                const diff = Number.isFinite(ms) ? Date.now() - ms : 0;
                setIdleMinutes(Math.max(0, Math.floor(diff / 60000)));
            };
            calculateIdle();
            interval = setInterval(calculateIdle, 60000);
        } else {
            setIdleMinutes(0);
        }
        return () => clearInterval(interval);
    }, [isAvailable, incompleteCrew, ambulance.lastAvailableAt, ambulance.listaAsignacionDesde, ambulance.tripulacionIncompletaDesde, ambulance.estadoOperativoActualizadoAt]);

    const cardClasses = clsx(
        "relative p-4 rounded-xl border transition-all duration-300 flex flex-col h-full",
        {
            "bg-dark-800 border-slate-700": !isOver && !isAvailable && !incompleteCrew,
            "bg-dark-800 border-emerald-500/30 hover:border-emerald-500/50 cursor-pointer": !isOver && isAvailable,
            "bg-dark-800 border-amber-500/35": !isOver && incompleteCrew,
            "bg-emerald-900/40 border-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.3)] ring-2 ring-emerald-500 ring-offset-2 ring-offset-dark-900": isOver && isAvailable,
            "opacity-80": outOfService
        }
    );

    return (
        <div ref={setNodeRef} className={cardClasses}>
            {isOver && isAvailable && (
                <div className="absolute inset-0 bg-emerald-500/10 rounded-xl flex items-center justify-center z-10 backdrop-blur-[1px]">
                    <span className="text-emerald-400 font-bold tracking-wide">SOLTAR PARA ASIGNAR</span>
                </div>
            )}

            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-4 min-w-0">
                <div className="flex items-center gap-3 min-w-0">
                    <div className={clsx("p-2 rounded-lg",
                        isAvailable ? "bg-emerald-500/20 text-emerald-400" :
                            incompleteCrew ? "bg-amber-500/20 text-amber-400" :
                            inService ? "bg-blue-500/20 text-blue-400" :
                                "bg-red-500/20 text-red-400"
                    )}>
                        <Activity size={20} />
                    </div>
                    <div className="min-w-0">
                        <h3 className="text-lg font-bold text-white tracking-wide truncate">{ambulance.id}</h3>
                        <p className="text-xs text-slate-400 font-medium truncate">{ambulance.tipo?.toUpperCase() || 'N/A'}</p>
                    </div>
                </div>
                {/* Modifiable Status */}
                <select
                    className={clsx(
                        "w-full sm:w-auto max-w-full sm:max-w-[170px] text-xs font-semibold px-2 py-1 rounded border appearance-none cursor-pointer focus:outline-none focus:ring-1 transition-colors",
                        isAvailable ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 focus:ring-emerald-500" :
                            incompleteCrew ? "bg-amber-500/10 text-amber-400 border-amber-500/20 focus:ring-amber-500" :
                            inService ? "bg-blue-500/10 text-blue-400 border-blue-500/20 focus:ring-blue-500" :
                                "bg-red-500/10 text-red-400 border-red-500/20 focus:ring-red-500"
                    )}
                    value={ambulance.estado}
                    onChange={(e) => onStatusChange && onStatusChange(ambulance.id, e.target.value)}
                    disabled={inService} // Prevent manual change while in service
                >
                    <option value="Disponible">Disponible</option>
                    {inService && <option value="En Servicio">En Servicio</option>}
                    <option value="Fuera de Servicio">Fuera de Servicio</option>
                </select>
            </div>

            {incompleteCrew && (
                <div className="mb-3 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-300">
                    No asignable: falta {operationalSnapshot.missingRoles.map((r) => getRoleDisplayName(r)).join(', ') || 'tripulación'}.
                </div>
            )}

            {/* {operationalSnapshot.incidentFlags.length > 0 && (
                <div className="mb-3 rounded-md border border-orange-500/30 bg-orange-500/10 px-3 py-2 text-[11px] text-orange-300">
                    Incidencias activas: {translateIncidentFlags(operationalSnapshot.incidentFlags).join(', ')}
                </div>
            )} */}

            <div className="mt-auto space-y-3">
                {(isAvailable || incompleteCrew) && (
                    <div className="bg-dark-900/50 p-3 rounded-lg border border-slate-700/50 space-y-2">
                        {(() => {
                            const rules = getCrewRulesForAmbulance(ambulance);
                            const isFull = rules.length > 0 && rules.every(role => tripulacion.some(c => c.cargo === role));
                            return (
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <Stethoscope size={14} className="text-emerald-500 shrink-0" />
                                        <span className="text-xs text-slate-500 font-bold">TRIPULACIÓN</span>
                                        {isFull
                                            ? <span className="text-[10px] font-bold text-emerald-400 ml-auto">● Completa</span>
                                            : <span className="text-[10px] font-bold text-slate-500 ml-auto">{tripulacion.length}/{rules.length}</span>
                                        }
                                    </div>
                                    <div className="flex flex-wrap gap-1">
                                        {rules.map(role => {
                                            const member = tripulacion.find(c => c.cargo === role);
                                            return (
                                                <span key={role} className={clsx("text-[10px] px-1.5 py-0.5 rounded font-semibold",
                                                    member ? "bg-emerald-500/20 text-emerald-300" : "bg-slate-800 text-slate-500"
                                                )}>
                                                    {member ? `${getRoleDisplayName(role)}: ${member.nombre.split(' ')[0]}` : `${getRoleDisplayName(role)}: —`}
                                                </span>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })()}
                        <div className="flex items-center justify-between pt-2 border-t border-slate-700/50">
                            <span className="text-xs text-slate-500 font-bold">TIEMPO MUERTO</span>
                            <span className={clsx(
                                "text-xs font-bold px-2 py-0.5 rounded",
                                idleMinutes > 60 ? "bg-amber-500/10 text-amber-500" : "bg-emerald-500/10 text-emerald-500"
                            )}>
                                {idleMinutes > 60 ? `${Math.floor(idleMinutes / 60)}h ${idleMinutes % 60}m` : `${idleMinutes} min`}
                            </span>
                        </div>
                    </div>
                )}

                {inService && (
                    <div className="space-y-2">
                        {serviceRequest && (
                            <div className="rounded-md border border-blue-500/25 bg-blue-500/10 px-3 py-2 space-y-1">
                                <p className="text-[11px] text-blue-300 font-semibold">
                                    Solicitud asignada: <span className="font-mono text-blue-200">{serviceRequest.id}</span>
                                </p>
                                <p className="text-[11px] text-blue-200 leading-tight break-words">
                                    Paciente: {serviceRequest?.pacienteInfo?.nombre || serviceRequest?.paciente || 'Sin paciente'}
                                </p>
                            </div>
                        )}
                        {ambulance.destino && (
                            <div className="flex items-start gap-2 text-sm text-blue-300">
                                <span className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 flex-shrink-0"></span>
                                <span className="line-clamp-2">Destino: {ambulance.destino}</span>
                            </div>
                        )}
                        {serviceRequest && onEditRequest && (
                            <button
                                type="button"
                                onClick={() => onEditRequest(serviceRequest)}
                                className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-md border border-sky-500/30 text-sky-300 bg-sky-500/10 hover:bg-sky-500/20 transition-colors"
                                title="Editar solicitud asignada"
                            >
                                <Pencil size={12} /> Editar solicitud asignada
                            </button>
                        )}
                    </div>
                )}

                {outOfService && ambulance.notas && (
                    <div className="flex items-start gap-2 text-sm text-red-300">
                        <FileWarning size={14} className="text-red-500 mt-0.5" />
                        <span>{ambulance.notas}</span>
                    </div>
                )}
            </div>
        </div>
    );
};

const StatusBadge = ({ status }) => {
    const styles = {
        "Disponible": "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
        "En Servicio": "bg-blue-500/10 text-blue-400 border-blue-500/20",
        "Fuera de Servicio": "bg-red-500/10 text-red-400 border-red-500/20"
    };

    return (
        <span className={clsx("text-xs font-semibold px-2.5 py-1 rounded-full border", styles[status] || "bg-slate-500/10 text-slate-400 border-slate-500/20")}>
            {status}
        </span>
    );
};

export default AmbulanceCard;
