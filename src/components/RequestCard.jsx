import React, { useState, useEffect } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Clock, MapPin, GripVertical, AlertTriangle, Pencil, CalendarClock, Hourglass } from 'lucide-react';
import { clsx } from 'clsx';

// The visual representation of the card
export const RequestCardUI = ({ request, client, isDragging, style, attributes, listeners, setNodeRef, onEdit, compact = false }) => {
    const patientName = request?.pacienteInfo?.nombre || request?.paciente || 'Sin paciente';

    // Check if request is in review state
    const isEnRevision = request.estado === 'En revisión';

    const toMs = (value) => {
        if (!value) return null;
        if (typeof value?.toDate === 'function') {
            const ms = value.toDate().getTime();
            return Number.isFinite(ms) ? ms : null;
        }
        const ms = new Date(value).getTime();
        return Number.isFinite(ms) ? ms : null;
    };

    // ── Live wait-time counter ────────────────────────────────────────────────
    // For triage semaphore, waiting time is measured from request creation.
    const programadoMs = toMs(request?.programacionInfo?.servicioProgramado);
    const creadoAtMs = toMs(request?.creadoAt);
    const isProgramadoValid = Number.isFinite(programadoMs);

    const getElapsedMin = () => {
        if (Number.isFinite(creadoAtMs)) {
            return Math.max(0, Math.floor((Date.now() - creadoAtMs) / 60000));
        }
        return request.tiempoEsperaMin ?? 0;
    };
    const [elapsedMin, setElapsedMin] = useState(getElapsedMin);
    useEffect(() => {
        setElapsedMin(getElapsedMin());
        const id = setInterval(() => setElapsedMin(getElapsedMin()), 30000);
        return () => clearInterval(id);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [request.creadoAt, request.tiempoEsperaMin, request.estado, request.programacionInfo?.servicioProgramado]);

    const isPending = request.estado === 'Pendiente';
    const isUnassigned = isPending && !request.ambulanciaAsignada && !request.asignadoAt;
    const isProgramadoVencido = isUnassigned && isProgramadoValid && Date.now() > programadoMs;

    let semaphore = 'neutral';
    if (isEnRevision) {
        semaphore = 'review';
    } else if (isUnassigned) {
        if (isProgramadoVencido) {
            semaphore = 'red';
        } else if (elapsedMin < 10) {
            semaphore = 'green';
        } else if (elapsedMin < 30) {
            semaphore = 'yellow';
        } else {
            semaphore = 'red';
        }
    }

    const displayTime = elapsedMin >= 60
            ? `${Math.floor(elapsedMin / 60)}h ${elapsedMin % 60}m`
            : `${Math.floor(elapsedMin)} min`;

    const cardClasses = clsx(
        "relative bg-dark-800 transition-all w-full flex flex-col group select-none",
        compact ? "rounded-lg p-2 gap-1.5" : "rounded-xl p-4 gap-3",
        {
            "border-2 border-amber-500 animate-pulse shadow-[0_0_15px_rgba(245,158,11,0.25)]": isEnRevision,
            "border-2 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.22)]": semaphore === 'green',
            "border-2 border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.22)]": semaphore === 'yellow',
            "border-2 border-red-500 animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.2)]": semaphore === 'red',
            "border border-slate-700 hover:border-slate-500": semaphore === 'neutral',
            "z-50 shadow-2xl opacity-90 scale-105 rotate-2 cursor-grabbing": isDragging,
            "cursor-grab": !isDragging && !isEnRevision,
            "cursor-not-allowed": isEnRevision,
            "opacity-40": isDragging && !!setNodeRef // dim the original item if it's draggable hook
        }
    );

    return (
        <div ref={setNodeRef} style={style} className={cardClasses} {...attributes} {...listeners}>

            {/* En Revisión Indicator */}
            {isEnRevision && (
                <div className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-amber-500 animate-ping"></div>
            )}
            {isEnRevision && (
                <div className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-amber-500 border-2 border-dark-900 z-10 flex items-center justify-center">
                </div>
            )}

            {/* Semaphore red indicator */}
            {semaphore === 'red' && !isEnRevision && (
                <div className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-red-500 animate-ping"></div>
            )}
            {semaphore === 'red' && !isEnRevision && (
                <div className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-red-600 border-2 border-dark-900 z-10 flex items-center justify-center">
                </div>
            )}

            {/* Header: Drag Handle & Wait Time */}
            <div className="flex justify-between items-start">
                <div className="flex items-center gap-1 text-slate-400 group-hover:text-slate-300">
                    <GripVertical size={compact ? 14 : 16} />
                    <span className={clsx("font-mono font-bold text-slate-300", compact ? "text-[10px]" : "text-xs")}>{request.id}</span>
                </div>

                <div className={clsx("flex items-center gap-1 font-bold rounded-md",
                    compact ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2 py-1",
                    isEnRevision ? "bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/50" :
                    semaphore === 'green' ? "bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/50" :
                    semaphore === 'yellow' ? "bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/50" :
                    semaphore === 'red' ? "bg-red-500/20 text-red-300 ring-1 ring-red-500/60" :
                    "bg-slate-700/50 text-slate-300"
                )}>
                    {isEnRevision ? <Hourglass size={12} /> :
                     semaphore === 'red' ? <AlertTriangle size={12} className="animate-pulse" /> :
                     isProgramadoValid ? <CalendarClock size={12} /> : <Clock size={12} />}
                    <span>{isEnRevision ? 'Cambio pendiente por  aprobar' : displayTime}</span>
                </div>
            </div>

            {onEdit && (
                <div className={compact ? "" : "-mt-1"}>
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onEdit(request);
                        }}
                        onPointerDown={(e) => e.stopPropagation()}
                        className={clsx(
                            "inline-flex items-center gap-1.5 font-semibold rounded-md border border-cyan-500/30 text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 transition-colors",
                            compact ? "text-[10px] px-2 py-1" : "text-[11px] px-2.5 py-1"
                        )}
                        title="Editar solicitud"
                    >
                        <Pencil size={12} /> {compact ? '' : 'Editar solicitud'}
                    </button>
                </div>
            )}

            {client && (
                <div className={clsx("flex flex-col", compact ? "gap-0.5" : "gap-1")}>
                    <div className="flex gap-2 items-center">
                        <span className={clsx("uppercase font-bold px-2 py-0.5 rounded-sm text-white tracking-wider glow-sm", compact ? "text-[9px]" : "text-[10px]", client.colorBadge)}>
                            {client.ranking} (Pri: {client.nivelPrioridad})
                        </span>
                    </div>
                    <h3 className={clsx("font-bold text-white leading-tight mt-1", compact ? "text-sm" : "text-base")}>{client.nombre}</h3>
                    {!compact && <p className="text-xs text-slate-400">{client.tipo}</p>}
                </div>
            )}

            <div className={clsx("rounded-lg border border-slate-800 bg-dark-900/40", compact ? "px-2 py-1" : "px-3 py-2")}>
                <span className={clsx("uppercase font-bold text-slate-500", compact ? "text-[9px]" : "text-[10px]")}>Paciente</span>
                <p className={clsx("text-slate-100 font-medium leading-tight mt-1 truncate", compact ? "text-[11px]" : "text-sm")}>{patientName}</p>
            </div>

            {/* Locations */}
            <div className={clsx("space-y-1.5 bg-dark-900/50 rounded-lg border border-slate-800", compact ? "mt-0.5 p-2" : "mt-2 p-3 space-y-2")}>
                <div className="flex items-start gap-2 min-w-0">
                    <MapPin size={compact ? 12 : 14} className="text-emerald-500 mt-0.5 shrink-0" />
                    <div className="flex flex-col min-w-0">
                        <span className={clsx("uppercase font-bold text-slate-500", compact ? "text-[9px]" : "text-[10px]")}>Origen</span>
                        <span className={clsx("text-slate-200 leading-tight whitespace-normal break-all", compact ? "text-[11px]" : "text-sm")}>{request.origen}</span>
                    </div>
                </div>

                <div className="flex items-start gap-2 min-w-0">
                    <MapPin size={compact ? 12 : 14} className="text-blue-500 mt-0.5 shrink-0" />
                    <div className="flex flex-col min-w-0">
                        <span className={clsx("uppercase font-bold text-slate-500", compact ? "text-[9px]" : "text-[10px]")}>Destino</span>
                        <span className={clsx("text-slate-200 leading-tight whitespace-normal break-all", compact ? "text-[11px]" : "text-sm")}>{request.destino}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Default exported draggable wrapper
const RequestCard = ({ request, client, onEdit, compact = false }) => {
    // Disable dragging for requests in review state
    const isEnRevision = request.estado === 'En revisión';

    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: request.id,
        data: { type: 'REQUEST', request, client },
        disabled: isEnRevision,
    });

    const style = transform ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    } : undefined;

    return (
        <RequestCardUI
            request={request}
            client={client}
            onEdit={isEnRevision ? undefined : onEdit}
            isDragging={isDragging}
            compact={compact}
            style={style}
            attributes={isEnRevision ? {} : attributes}
            listeners={isEnRevision ? {} : listeners}
            setNodeRef={setNodeRef}
        />
    );
};

export default RequestCard;
