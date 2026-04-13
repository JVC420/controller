import React, { useState, useEffect } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Clock, MapPin, GripVertical, AlertTriangle, Pencil, CalendarClock, Hourglass } from 'lucide-react';
import { clsx } from 'clsx';

// The visual representation of the card
export const RequestCardUI = ({ request, client, isDragging, style, attributes, listeners, setNodeRef, onEdit }) => {
    const patientName = request?.pacienteInfo?.nombre || request?.paciente || 'Sin paciente';

    // Check if request is in review state
    const isEnRevision = request.estado === 'En revisión';

    // ── Live wait-time counter ────────────────────────────────────────────────
    // For pending requests: use servicioProgramado - if not yet reached, show scheduled time
    const programadoAt = request.programacionInfo?.servicioProgramado;
    const programadoMs = programadoAt ? new Date(programadoAt).getTime() : null;
    const isProgramadoValid = Number.isFinite(programadoMs);

    const getElapsedMin = () => {
        if (request.estado === 'Pendiente') {
            // If we have a valid scheduled time
            if (isProgramadoValid) {
                const diff = Date.now() - programadoMs;
                // If scheduled time hasn't arrived yet, return negative to signal "not yet"
                if (diff < 0) return diff / 60000; // negative minutes
                return Math.floor(diff / 60000);
            }
            // Fallback to creadoAt
            if (request.creadoAt) {
                const ms = new Date(request.creadoAt).getTime();
                if (Number.isFinite(ms)) return Math.max(0, Math.floor((Date.now() - ms) / 60000));
            }
            return request.tiempoEsperaMin ?? 0;
        }

        // For other states (assigned/in service), use creadoAt as before
        if (request.creadoAt) {
            const ms = new Date(request.creadoAt).getTime();
            if (Number.isFinite(ms)) return Math.max(0, Math.floor((Date.now() - ms) / 60000));
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

    // Is service scheduled for the future?
    const isScheduledFuture = request.estado === 'Pendiente' && elapsedMin < 0;

    // SLA breach: > 10 min waiting (only if past scheduled time), > 150 min in service
    const isSlaBreached = request.estado === 'Pendiente'
        ? !isScheduledFuture && elapsedMin > 10
        : request.asignadoAt
            ? (() => { const ms = new Date(request.asignadoAt).getTime(); return Number.isFinite(ms) ? Math.floor((Date.now() - ms) / 60000) > 150 : false; })()
            : false;

    // Display
    const formatScheduledDate = () => {
        if (!isProgramadoValid) return '';
        const date = new Date(programadoMs);
        const today = new Date();
        const isToday = date.toDateString() === today.toDateString();
        const time = date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
        if (isToday) return `hoy ${time}`;
        const dateStr = date.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit' });
        return `${dateStr} ${time}`;
    };

    const displayTime = isScheduledFuture
        ? `Prog. ${formatScheduledDate()}`
        : elapsedMin >= 60
            ? `${Math.floor(elapsedMin / 60)}h ${elapsedMin % 60}m`
            : `${Math.floor(elapsedMin)} min`;

    const cardClasses = clsx(
        "relative bg-dark-800 rounded-xl p-4 transition-all w-full flex flex-col gap-3 group select-none",
        {
            "border-2 border-amber-500 animate-pulse shadow-[0_0_15px_rgba(245,158,11,0.25)]": isEnRevision,
            "border-2 border-red-500 animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.2)]": isSlaBreached && !isEnRevision,
            "border border-slate-700 hover:border-slate-500": !isSlaBreached && !isEnRevision,
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

            {/* SLA Breach Indicator */}
            {isSlaBreached && !isEnRevision && (
                <div className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-red-500 animate-ping"></div>
            )}
            {isSlaBreached && !isEnRevision && (
                <div className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-red-600 border-2 border-dark-900 z-10 flex items-center justify-center">
                </div>
            )}

            {/* Header: Drag Handle & Wait Time */}
            <div className="flex justify-between items-start">
                <div className="flex items-center gap-1 text-slate-400 group-hover:text-slate-300">
                    <GripVertical size={16} />
                    <span className="text-xs font-mono font-bold text-slate-300">{request.id}</span>
                </div>

                <div className={clsx("flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-md",
                    isEnRevision ? "bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/50" :
                    isScheduledFuture ? "bg-cyan-500/20 text-cyan-400 ring-1 ring-cyan-500/50" :
                    isSlaBreached ? "bg-red-500/20 text-red-500 ring-1 ring-red-500" : "bg-slate-700/50 text-slate-300"
                )}>
                    {isEnRevision ? <Hourglass size={12} /> :
                     isScheduledFuture ? <CalendarClock size={12} /> :
                     isSlaBreached && request.estado !== "Pendiente" ? <AlertTriangle size={12} className="animate-pulse" /> : <Clock size={12} />}
                    <span>{isEnRevision ? 'Cambio pendiente por  aprobar' : displayTime}</span>
                </div>
            </div>

            {onEdit && (
                <div className="-mt-1">
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onEdit(request);
                        }}
                        onPointerDown={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-md border border-cyan-500/30 text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 transition-colors"
                        title="Editar solicitud"
                    >
                        <Pencil size={12} /> Editar solicitud
                    </button>
                </div>
            )}

            {client && (
                <div className="flex flex-col gap-1">
                    <div className="flex gap-2 items-center">
                        <span className={clsx("text-[10px] uppercase font-bold px-2 py-0.5 rounded-sm text-white tracking-wider glow-sm", client.colorBadge)}>
                            {client.ranking} (Pri: {client.nivelPrioridad})
                        </span>
                    </div>
                    <h3 className="font-bold text-white text-base leading-tight mt-1">{client.nombre}</h3>
                    <p className="text-xs text-slate-400">{client.tipo}</p>
                </div>
            )}

            <div className="rounded-lg border border-slate-800 bg-dark-900/40 px-3 py-2">
                <span className="text-[10px] uppercase font-bold text-slate-500">Paciente</span>
                <p className="text-sm text-slate-100 font-medium leading-tight mt-1">{patientName}</p>
            </div>

            {/* Locations */}
            <div className="mt-2 space-y-2 bg-dark-900/50 rounded-lg p-3 border border-slate-800">
                <div className="flex items-start gap-2">
                    <MapPin size={14} className="text-emerald-500 mt-0.5 shrink-0" />
                    <div className="flex flex-col">
                        <span className="text-[10px] uppercase font-bold text-slate-500">Origen</span>
                        <span className="text-sm text-slate-200 leading-tight">{request.origen}</span>
                    </div>
                </div>

                <div className="flex items-start gap-2">
                    <MapPin size={14} className="text-blue-500 mt-0.5 shrink-0" />
                    <div className="flex flex-col">
                        <span className="text-[10px] uppercase font-bold text-slate-500">Destino</span>
                        <span className="text-sm text-slate-200 leading-tight">{request.destino}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Default exported draggable wrapper
const RequestCard = ({ request, client, onEdit }) => {
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
            style={style}
            attributes={isEnRevision ? {} : attributes}
            listeners={isEnRevision ? {} : listeners}
            setNodeRef={setNodeRef}
        />
    );
};

export default RequestCard;
