import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { clsx } from 'clsx';
import { Clock, Pencil, Check, X } from 'lucide-react';

const getColombiaDateTime = () => {
    const now = new Date();
    const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
    const time = new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Bogota', hour: '2-digit', minute: '2-digit', hour12: false }).format(now);
    return { date, time };
};

const ShiftTimeInput = ({ value, onSave, disabled, overtime, label }) => {
    const [editing, setEditing] = useState(false);
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');
    const popRef = useRef(null);
    const triggerRef = useRef(null);
    const [popPos, setPopPos] = useState({ top: 0, left: 0 });

    // Reposition popover when editing opens or window scrolls/resizes
    const updatePosition = useCallback(() => {
        if (triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            setPopPos({ top: rect.bottom + 6, left: rect.left });
        }
    }, []);

    useEffect(() => {
        if (!editing) return;
        updatePosition();
        window.addEventListener('scroll', updatePosition, true);
        window.addEventListener('resize', updatePosition);
        return () => {
            window.removeEventListener('scroll', updatePosition, true);
            window.removeEventListener('resize', updatePosition);
        };
    }, [editing, updatePosition]);

    // Parse existing value into date/time parts
    useEffect(() => {
        if (value) {
            if (value.includes('T')) {
                const [d, t] = value.split('T');
                setDate(d);
                setTime(t);
            } else {
                setTime(value);
                setDate('');
            }
        } else {
            setDate('');
            setTime('');
        }
    }, [value]);

    // When opening the popover, default date to today if empty
    useEffect(() => {
        if (editing && !date) {
            const { date: today } = getColombiaDateTime();
            setDate(today);
        }
    }, [editing]);

    // Close popover on outside click
    useEffect(() => {
        if (!editing) return;
        const handler = (e) => {
            if (popRef.current && !popRef.current.contains(e.target) &&
                triggerRef.current && !triggerRef.current.contains(e.target)) {
                setEditing(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [editing]);

    const formatDisplay = (val) => {
        if (!val) return null;
        if (val.includes('T')) {
            const [datePart, timePart] = val.split('T');
            const [y, m, d] = datePart.split('-');
            return { date: `${d}/${m}/${y}`, time: timePart };
        }
        return { date: null, time: val };
    };

    const display = formatDisplay(value);

    const handleNow = () => {
        const { date: d, time: t } = getColombiaDateTime();
        onSave(`${d}T${t}`);
    };

    const handleConfirm = () => {
        if (date && time) {
            onSave(`${date}T${time}`);
            setEditing(false);
        }
    };

    const handleCancel = () => {
        // Reset to original
        if (value && value.includes('T')) {
            const [d, t] = value.split('T');
            setDate(d);
            setTime(t);
        } else {
            setDate('');
            setTime(value || '');
        }
        setEditing(false);
    };

    if (disabled) {
        return (
            <div className={clsx(
                "flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-sm font-mono opacity-50",
                overtime ? "border-orange-500/30 text-orange-300/60 bg-orange-950/10" : "border-slate-700/50 text-slate-500 bg-dark-900/50"
            )}>
                {display ? (
                    <span>{display.date && <span className="text-slate-500 mr-1">{display.date}</span>}{display.time}</span>
                ) : (
                    <span className="text-slate-600 italic">Sin registrar</span>
                )}
            </div>
        );
    }

    return (
        <div className="relative" ref={triggerRef}>
            {/* Display area */}
            <div className={clsx(
                "flex items-center gap-1.5 rounded-lg border text-sm transition-all",
                overtime ? "border-orange-500/50 bg-orange-950/20" : "border-slate-700 bg-dark-900",
                editing && "border-blue-500 ring-1 ring-blue-500/30"
            )}>
                {/* Value display / placeholder */}
                <button
                    type="button"
                    onClick={() => setEditing(!editing)}
                    className={clsx(
                        "flex-1 text-left px-2.5 py-1.5 font-mono rounded-l-lg transition-colors hover:bg-slate-700/30",
                        overtime ? "text-orange-300" : "text-slate-200"
                    )}
                >
                    {display ? (
                        <span>
                            {display.date && <span className="text-slate-400 text-xs mr-1.5">{display.date}</span>}
                            <span className="font-semibold">{display.time}</span>
                        </span>
                    ) : (
                        <span className="text-slate-500 italic text-xs">Sin registrar</span>
                    )}
                </button>

                {/* Quick actions */}
                <div className="flex items-center border-l border-slate-700/50">
                    <button
                        type="button"
                        onClick={handleNow}
                        title="Marcar hora actual"
                        className="flex items-center gap-1 px-2 py-1.5 text-emerald-400 hover:bg-emerald-900/30 transition-colors text-xs font-bold"
                    >
                        <Clock size={13} />
                        <span className="hidden lg:inline">Ahora</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setEditing(!editing)}
                        title="Editar manualmente"
                        className="px-2 py-1.5 text-slate-400 hover:text-blue-400 hover:bg-blue-900/20 transition-colors rounded-r-lg"
                    >
                        <Pencil size={13} />
                    </button>
                </div>
            </div>

            {/* Edit popover (portal) */}
            {editing && createPortal(
                <div ref={popRef} style={{ position: 'fixed', top: popPos.top, left: popPos.left, zIndex: 9999 }}
                    className="bg-dark-800 border border-slate-600 rounded-xl shadow-2xl shadow-black/50 p-3 min-w-[240px]">
                    <p className="text-[10px] uppercase text-slate-500 font-bold tracking-wider mb-2">{label || 'Editar fecha y hora'}</p>
                    <div className="flex flex-col gap-2">
                        <div>
                            <label className="text-[10px] text-slate-500 mb-0.5 block">Fecha</label>
                            <input
                                type="date"
                                value={date}
                                onChange={e => setDate(e.target.value)}
                                className="w-full bg-dark-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white font-mono focus:outline-none focus:border-blue-500"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] text-slate-500 mb-0.5 block">Hora</label>
                            <input
                                type="time"
                                value={time}
                                onChange={e => setTime(e.target.value)}
                                className="w-full bg-dark-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white font-mono focus:outline-none focus:border-blue-500"
                            />
                        </div>
                    </div>
                    <div className="flex items-center justify-end gap-1.5 mt-3 pt-2 border-t border-slate-700/50">
                        <button type="button" onClick={handleCancel}
                            className="flex items-center gap-1 px-2.5 py-1 text-xs text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors">
                            <X size={12} /> Cancelar
                        </button>
                        <button type="button" onClick={handleConfirm}
                            disabled={!date || !time}
                            className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors">
                            <Check size={12} /> Confirmar
                        </button>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default ShiftTimeInput;
