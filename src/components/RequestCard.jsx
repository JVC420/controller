import React, { useState, useEffect } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Clock, MapPin, GripVertical, AlertTriangle } from 'lucide-react';
import { clsx } from 'clsx';

// The visual representation of the card
export const RequestCardUI = ({ request, client, isDragging, style, attributes, listeners, setNodeRef }) => {

    // ── Live wait-time counter ────────────────────────────────────────────────
    const getElapsedMin = () => {
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
    }, [request.creadoAt, request.tiempoEsperaMin]);

    // SLA breach: > 10 min waiting, > 150 min in service
    const isSlaBreached = request.estado === 'Pendiente'
        ? elapsedMin > 10
        : request.asignadoAt
            ? (() => { const ms = new Date(request.asignadoAt).getTime(); return Number.isFinite(ms) ? Math.floor((Date.now() - ms) / 60000) > 150 : false; })()
            : false;

    // Display
    const displayTime = elapsedMin >= 60
        ? `${Math.floor(elapsedMin / 60)}h ${elapsedMin % 60}m`
        : `${elapsedMin} min`;

    const cardClasses = clsx(
        "relative bg-dark-800 rounded-xl p-4 transition-all w-full flex flex-col gap-3 group select-none",
        {
            "border-2 border-red-500 animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.2)]": isSlaBreached,
            "border border-slate-700 hover:border-slate-500": !isSlaBreached,
            "z-50 shadow-2xl opacity-90 scale-105 rotate-2 cursor-grabbing": isDragging,
            "cursor-grab": !isDragging,
            "opacity-40": isDragging && !!setNodeRef // dim the original item if it's draggable hook
        }
    );

    return (
        <div ref={setNodeRef} style={style} className={cardClasses} {...attributes} {...listeners}>

            {/* SLA Breach Indicator */}
            {isSlaBreached && (
                <div className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-red-500 animate-ping"></div>
            )}
            {isSlaBreached && (
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
                    isSlaBreached ? "bg-red-500/20 text-red-500 ring-1 ring-red-500" : "bg-slate-700/50 text-slate-300"
                )}>
                    {isSlaBreached && request.estado !== "Pendiente" ? <AlertTriangle size={12} className="animate-pulse" /> : <Clock size={12} />}
                    <span>{displayTime}</span>
                </div>
            </div>

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
const RequestCard = ({ request, client }) => {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: request.id,
        data: { type: 'REQUEST', request, client }
    });

    const style = transform ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    } : undefined;

    return (
        <RequestCardUI
            request={request}
            client={client}
            isDragging={isDragging}
            style={style}
            attributes={attributes}
            listeners={listeners}
            setNodeRef={setNodeRef}
        />
    );
};

export default RequestCard;
