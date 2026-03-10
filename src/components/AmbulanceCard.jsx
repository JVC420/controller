import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { clsx } from 'clsx';
import { Stethoscope, Activity, FileWarning } from 'lucide-react';

const AmbulanceCard = ({ ambulance, turnosHoy = [], onStatusChange }) => {
    const { isOver, setNodeRef } = useDroppable({
        id: ambulance.id,
        data: {
            type: 'AMBULANCE',
            ambulance
        }
    });

    const isAvailable = ambulance.estado === "Disponible";
    const inService = ambulance.estado === "En Servicio";
    const outOfService = ambulance.estado === "Fuera de Servicio";

    // Derive crew from active shifts instead of fleet document
    const tripulacion = turnosHoy.filter(t =>
        t.movil === ambulance.id &&
        !t.horaFinReal && !t.cancelado && !t.ausenciaConfirmada
    );

    // Calculate Idle Time
    const [idleMinutes, setIdleMinutes] = React.useState(0);

    React.useEffect(() => {
        let interval;
        if (isAvailable && ambulance.lastAvailableAt) {
            const calculateIdle = () => {
                const diff = Date.now() - new Date(ambulance.lastAvailableAt).getTime();
                setIdleMinutes(Math.floor(diff / 60000));
            };
            calculateIdle();
            interval = setInterval(calculateIdle, 60000);
        } else {
            setIdleMinutes(0);
        }
        return () => clearInterval(interval);
    }, [isAvailable, ambulance.lastAvailableAt]);

    const cardClasses = clsx(
        "relative p-4 rounded-xl border transition-all duration-300 flex flex-col h-full",
        {
            "bg-dark-800 border-slate-700": !isOver && !isAvailable,
            "bg-dark-800 border-emerald-500/30 hover:border-emerald-500/50 cursor-pointer": !isOver && isAvailable,
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

            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                    <div className={clsx("p-2 rounded-lg",
                        isAvailable ? "bg-emerald-500/20 text-emerald-400" :
                            inService ? "bg-blue-500/20 text-blue-400" :
                                "bg-red-500/20 text-red-400"
                    )}>
                        <Activity size={20} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-white tracking-wide">{ambulance.id}</h3>
                        <p className="text-xs text-slate-400 font-medium">{ambulance.tipo.toUpperCase()}</p>
                    </div>
                </div>
                {/* Modifiable Status */}
                <select
                    className={clsx(
                        "text-xs font-semibold px-2 py-1 rounded border appearance-none cursor-pointer focus:outline-none focus:ring-1 transition-colors",
                        isAvailable ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 focus:ring-emerald-500" :
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

            <div className="mt-auto space-y-3">
                {isAvailable && (
                    <div className="bg-dark-900/50 p-3 rounded-lg border border-slate-700/50 space-y-2">
                        {(() => {
                            const CREW_RULES = { 'Básica': ['Conductor', 'Paramédico'], 'Medicalizada': ['Médico', 'Conductor', 'Paramédico'] };
                            const rules = CREW_RULES[ambulance.tipo] || [];
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
                                                    {member ? `${role}: ${member.nombre.split(' ')[0]}` : `${role}: —`}
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

                {inService && ambulance.destino && (
                    <div className="flex items-start gap-2 text-sm text-blue-300">
                        <span className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 flex-shrink-0"></span>
                        <span className="line-clamp-2">Destino: {ambulance.destino}</span>
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
