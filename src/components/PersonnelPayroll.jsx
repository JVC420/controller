import React, { useState, useMemo } from 'react';
import { Download } from 'lucide-react';
import { clsx } from 'clsx';

const toH = (ms) => ms / 3600000;

// Parses "HH:mm" (legacy) or "YYYY-MM-DDTHH:mm" (new) into epoch ms
const parseDT = (val, fecha) => {
    if (!val) return null;
    if (val.includes('T')) return new Date(val).getTime();
    return new Date(`${fecha}T${val}:00`).getTime();
};

const isOvertime = (progFinStr, realFinStr, fecha) => {
    if (!progFinStr || !realFinStr) return false;
    const progMs = parseDT(progFinStr, fecha || '1970-01-01');
    const realMs = parseDT(realFinStr, fecha || '1970-01-01');
    if (progMs == null || realMs == null) return false;
    return (realMs - progMs) > 1800000; // >30 mins tolerance
};

const PersonnelPayroll = ({ empleados, turnosHoy, showToast }) => {
    // Range state: default to current month (1st to 30/31st)
    const [payrollRange, setPayrollRange] = useState(() => {
        const d = new Date();
        const y = d.getFullYear(), m = d.getMonth();
        return {
            desde: new Date(y, m, 1).toISOString().split('T')[0],
            hasta: new Date(y, m + 1, 0).toISOString().split('T')[0]
        };
    });

    // Split any time range [startMs, endMs] into diurna (06:00-19:00) and nocturna (19:00-06:00) ms
    const splitDiurnaNocturna = (startMs, endMs) => {
        let diurna = 0, nocturna = 0;
        let cursor = startMs;
        while (cursor < endMs) {
            const d = new Date(cursor);
            const h = d.getHours();
            if (h >= 6 && h < 19) {
                // In diurna window → next boundary is 19:00 today
                const nb = new Date(cursor);
                nb.setHours(19, 0, 0, 0);
                const segEnd = Math.min(endMs, nb.getTime());
                diurna += segEnd - cursor;
                cursor = segEnd;
            } else {
                // In nocturna window → next boundary is 06:00 (next day if h>=19)
                const nb = new Date(cursor);
                if (h >= 19) nb.setDate(nb.getDate() + 1);
                nb.setHours(6, 0, 0, 0);
                const segEnd = Math.min(endMs, nb.getTime());
                nocturna += segEnd - cursor;
                cursor = segEnd;
            }
        }
        return { diurna, nocturna };
    };

    // Computes 8-category hours for a single shift
    // Jornada diurna: 06:00 - 19:00 | Jornada nocturna: 19:00 - 06:00
    // Ordinarias = horas reales dentro de la ventana programada
    // Extras = horas reales fuera de la ventana programada
    const computeHours = (t) => {
        const inicio = t.inicioReal || t.inicioProgramado;
        const fin = t.horaFinReal || t.horaFin;
        if (!inicio || !fin) return null;

        const isSunday = new Date(t.fecha + 'T12:00:00').getDay() === 0;

        let startMs = parseDT(inicio, t.fecha);
        let endMs = parseDT(fin, t.fecha);
        if (endMs <= startMs) endMs += 86400000;

        let baseStart = parseDT(t.inicioProgramado, t.fecha);
        let baseEnd = parseDT(t.horaFin, t.fecha);
        if (baseEnd <= baseStart) baseEnd += 86400000;

        const res = { hod: 0, hon: 0, hed: 0, hen: 0, hdd: 0, hdn: 0, hedd: 0, hedn: 0 };

        // 1. Ordinary hours: intersection of actual worked [startMs, endMs] with programmed [baseStart, baseEnd]
        const ordStart = Math.max(startMs, baseStart);
        const ordEnd = Math.min(endMs, baseEnd);
        if (ordEnd > ordStart) {
            const { diurna, nocturna } = splitDiurnaNocturna(ordStart, ordEnd);
            if (isSunday) { res.hdd += diurna; res.hdn += nocturna; }
            else { res.hod += diurna; res.hon += nocturna; }
        }

        // 2. Extra hours: actual worked time outside the programmed window
        // Before programmed start
        const extraBeforeEnd = Math.min(startMs < baseStart ? baseStart : startMs, endMs);
        if (startMs < baseStart && extraBeforeEnd > startMs) {
            const { diurna, nocturna } = splitDiurnaNocturna(startMs, Math.min(baseStart, endMs));
            if (isSunday) { res.hedd += diurna; res.hedn += nocturna; }
            else { res.hed += diurna; res.hen += nocturna; }
        }
        // After programmed end
        if (endMs > baseEnd) {
            const extraStart = Math.max(startMs, baseEnd);
            const { diurna, nocturna } = splitDiurnaNocturna(extraStart, endMs);
            if (isSunday) { res.hedd += diurna; res.hedn += nocturna; }
            else { res.hed += diurna; res.hen += nocturna; }
        }

        return {
            hod: toH(res.hod), hon: toH(res.hon),
            hed: toH(res.hed), hen: toH(res.hen),
            hdd: toH(res.hdd), hdn: toH(res.hdn),
            hedd: toH(res.hedd), hedn: toH(res.hedn),
        };
    };

    // ── Payroll rows (computed from turnos in range per employee) ──────────────
    const payrollRows = useMemo(() => {
        const { desde, hasta } = payrollRange;
        const inRange = turnosHoy.filter(t => t.fecha >= desde && t.fecha <= hasta);
        const byEmp = {};

        inRange.forEach(t => {
            const key = t.id_empleado;
            if (!byEmp[key]) {
                const emp = empleados.find(e => e.id === key);
                byEmp[key] = {
                    id: key,
                    cedula: t.cedula || emp?.cedula || '—',
                    nombre: t.nombre,
                    cargo: t.cargo,
                    hod: 0, hon: 0, hed: 0, hen: 0, hdd: 0, hdn: 0, hedd: 0, hedn: 0,
                    ausencias: 0,
                    turnos: [],
                };
            }
            if (t.cancelado) {
                // Cancelled shifts: don't count
            } else if (t.ausenciaConfirmada) {
                byEmp[key].ausencias++;
            } else if (!t.inicioReal && !t.horaFin && !t.inicioProgramado) {
                // No planned times at all → mark as absence
                byEmp[key].ausencias++;
            } else if (t.horaFinReal) {
                // Only count hours for finalized shifts (with real end time)
                byEmp[key].turnos.push(t.fecha);
                const h = computeHours(t);
                if (h) {
                    byEmp[key].hod += h.hod; byEmp[key].hon += h.hon;
                    byEmp[key].hed += h.hed; byEmp[key].hen += h.hen;
                    byEmp[key].hdd += h.hdd; byEmp[key].hdn += h.hdn;
                    byEmp[key].hedd += h.hedd; byEmp[key].hedn += h.hedn;
                }
            } else {
                // Shift not yet finalized: check if past date → absence
                if (!t.inicioReal) {
                    const shiftDate = new Date(t.fecha + 'T23:59:00');
                    if (shiftDate < new Date()) byEmp[key].ausencias++;
                }
            }
        });
        return Object.values(byEmp).sort((a, b) => a.nombre.localeCompare(b.nombre));
    }, [turnosHoy, empleados, payrollRange]);

    // ── CSV Export ─────────────────────────────────────────────────────────────
    const handleExportCSV = () => {
        const headers = [
            'Cédula', 'Nombre', 'Cargo', 'Período Desde', 'Período Hasta', 'N° Turnos',
            'Total Hrs',
            'H. Ord. Diurnas', 'H. Ord. Nocturnas',
            'H. Extra Diurnas (HED)', 'H. Extra Nocturnas (HEN)',
            'H. Dom. Diurnas', 'H. Dom. Nocturnas',
            'H. Extra Dom. Diurnas', 'H. Extra Dom. Nocturnas',
            'Ausencias',
        ];
        const rows = payrollRows.map(r => {
            const total = +(r.hod + r.hon + r.hed + r.hen + r.hdd + r.hdn + r.hedd + r.hedn).toFixed(1);
            return [
                r.cedula, r.nombre, r.cargo,
                payrollRange.desde, payrollRange.hasta,
                r.turnos.length, total,
                r.hod.toFixed(1), r.hon.toFixed(1),
                r.hed.toFixed(1), r.hen.toFixed(1),
                r.hdd.toFixed(1), r.hdn.toFixed(1),
                r.hedd.toFixed(1), r.hedn.toFixed(1),
                r.ausencias,
            ];
        });
        const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\r\n');
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `prenomina_${payrollRange.desde}_${payrollRange.hasta}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        showToast('CSV exportado exitosamente.', 'success');
    };

    return (
        <div className="bg-dark-800 border border-slate-700 rounded-xl shadow-md lg:shadow-2xl">
            {/* Filters + Export */}
            <div className="p-4 border-b border-slate-700 bg-dark-900/50 flex flex-wrap gap-4 items-end justify-between">
                <div className="flex flex-wrap gap-4 items-end">
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Desde</label>
                        <input type="date" value={payrollRange.desde}
                            onChange={e => setPayrollRange(r => ({ ...r, desde: e.target.value }))}
                            className="bg-dark-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:border-blue-500 outline-none w-full md:w-auto" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Hasta</label>
                        <input type="date" value={payrollRange.hasta}
                            onChange={e => setPayrollRange(r => ({ ...r, hasta: e.target.value }))}
                            className="bg-dark-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:border-blue-500 outline-none w-full md:w-auto" />
                    </div>
                    <span className="text-xs text-slate-500 pb-1.5 w-full md:w-auto">
                        {payrollRows.length} empleado(s) · {turnosHoy.filter(t => t.fecha >= payrollRange.desde && t.fecha <= payrollRange.hasta).length} turno(s)
                    </span>
                </div>
                <button onClick={handleExportCSV}
                    className="flex-1 md:flex-none items-center justify-center gap-2 bg-emerald-700 hover:bg-emerald-600 text-white px-4 py-2.5 rounded-lg text-sm font-bold transition-colors shadow-lg shadow-emerald-900/30">
                    <Download size={15} className="inline mr-2" /> Exportar CSV
                </button>
            </div>

            {/* Responsive Desktop Grid / Mobile Stack */}
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse whitespace-nowrap text-sm hidden md:table">
                    <thead className="sticky top-0 bg-dark-900/95 backdrop-blur z-10">
                        <tr className="text-slate-400 text-[11px] uppercase tracking-wider border-b border-slate-700">
                            <th className="py-3 px-4 font-semibold">Cédula</th>
                            <th className="py-3 px-4 font-semibold">Nombre</th>
                            <th className="py-3 px-4 font-semibold">Cargo</th>
                            <th className="py-3 px-4 font-semibold text-center">Turnos</th>
                            <th className="py-3 px-4 font-semibold text-right border-l border-slate-700/50 bg-slate-800/20">Total Hrs</th>
                            {/* Ordinary */}
                            <th className="py-3 px-4 font-semibold text-right border-l border-slate-700/30">Ord. Diurnas</th>
                            <th className="py-3 px-4 font-semibold text-right">Ord. Nocturnas</th>
                            {/* Extras */}
                            <th className="py-3 px-4 font-semibold text-right text-orange-300/80 border-l border-orange-700/20">HED</th>
                            <th className="py-3 px-4 font-semibold text-right text-orange-300/80">HEN</th>
                            {/* Dominicales */}
                            <th className="py-3 px-4 font-semibold text-right text-purple-300/80 border-l border-purple-700/20">Dom. Diurnas</th>
                            <th className="py-3 px-4 font-semibold text-right text-purple-300/80">Dom. Nocturnas</th>
                            {/* Extras dom */}
                            <th className="py-3 px-4 font-semibold text-right text-violet-300/80 border-l border-violet-700/20">HE Dom. D.</th>
                            <th className="py-3 px-4 font-semibold text-right text-violet-300/80">HE Dom. N.</th>
                            {/* Ausencias */}
                            <th className="py-3 px-4 font-semibold text-right text-red-400/70 border-l border-red-700/20">Ausencias</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50">
                        {payrollRows.length === 0 && (
                            <tr><td colSpan="14" className="py-12 text-center text-slate-500 text-sm">No hay turnos en el período seleccionado.</td></tr>
                        )}
                        {payrollRows.map(row => {
                            const total = +(row.hod + row.hon + row.hed + row.hen + row.hdd + row.hdn + row.hedd + row.hedn).toFixed(1);
                            const hasExt = row.hed > 0 || row.hen > 0;
                            const hasDom = row.hdd > 0 || row.hdn > 0 || row.hedd > 0 || row.hedn > 0;
                            return (
                                <tr key={row.id} className="hover:bg-slate-700/30 transition-colors">
                                    <td className="py-2.5 px-4 font-mono text-slate-400 text-xs">{row.cedula}</td>
                                    <td className="py-2.5 px-4 font-bold text-slate-200">{row.nombre}</td>
                                    <td className="py-2.5 px-4 text-slate-400">{row.cargo}</td>
                                    <td className="py-2.5 px-4 text-center text-slate-400">{row.turnos.length}</td>
                                    <td className="py-2.5 px-4 text-right border-l border-slate-700/50 bg-slate-800/10 font-bold text-emerald-400">{total}</td>
                                    <td className="py-2.5 px-4 text-right text-slate-300 border-l border-slate-700/20">{row.hod.toFixed(1)}</td>
                                    <td className="py-2.5 px-4 text-right text-slate-300">{row.hon.toFixed(1)}</td>
                                    <td className={`py-2.5 px-4 text-right border-l border-orange-700/20 font-medium ${hasExt ? 'text-orange-300' : 'text-slate-600'}`}>{row.hed.toFixed(1)}</td>
                                    <td className={`py-2.5 px-4 text-right font-medium ${hasExt ? 'text-orange-300' : 'text-slate-600'}`}>{row.hen.toFixed(1)}</td>
                                    <td className={`py-2.5 px-4 text-right border-l border-purple-700/20 font-medium ${hasDom ? 'text-purple-300' : 'text-slate-600'}`}>{row.hdd.toFixed(1)}</td>
                                    <td className={`py-2.5 px-4 text-right font-medium ${hasDom ? 'text-purple-300' : 'text-slate-600'}`}>{row.hdn.toFixed(1)}</td>
                                    <td className={`py-2.5 px-4 text-right border-l border-violet-700/20 font-medium ${hasDom ? 'text-violet-300' : 'text-slate-600'}`}>{row.hedd.toFixed(1)}</td>
                                    <td className={`py-2.5 px-4 text-right font-medium ${hasDom ? 'text-violet-300' : 'text-slate-600'}`}>{row.hedn.toFixed(1)}</td>
                                    <td className="py-2.5 px-4 text-right border-l border-red-700/20">
                                        <span className={row.ausencias > 0 ? 'text-red-400 font-bold' : 'text-slate-600'}>{row.ausencias}</span>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>

                {/* Mobile View: Cards */}
                <div className="md:hidden flex flex-col gap-3 p-4">
                    {payrollRows.length === 0 && (
                        <div className="py-12 text-center text-slate-500 text-sm">No hay turnos en el período seleccionado.</div>
                    )}
                    {payrollRows.map(row => {
                        const total = +(row.hod + row.hon + row.hed + row.hen + row.hdd + row.hdn + row.hedd + row.hedn).toFixed(1);
                        return (
                            <div key={row.id} className="bg-dark-900 border border-slate-700 rounded-lg p-4 space-y-3">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="font-bold text-slate-100">{row.nombre}</div>
                                        <div className="text-xs text-slate-400">{row.cargo} • {row.cedula}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-sm font-bold text-emerald-400">{total} hrs</div>
                                        <div className="text-xs text-slate-500">{row.turnos.length} turnos</div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div className="bg-slate-800/50 p-2 rounded">
                                        <div className="text-slate-400 mb-1">Ordinarias</div>
                                        <div className="text-slate-300">D: {row.hod.toFixed(1)} | N: {row.hon.toFixed(1)}</div>
                                    </div>
                                    <div className="bg-orange-950/20 border border-orange-900/30 p-2 rounded">
                                        <div className="text-orange-400/70 mb-1">Extras</div>
                                        <div className="text-orange-300">D: {row.hed.toFixed(1)} | N: {row.hen.toFixed(1)}</div>
                                    </div>
                                    <div className="bg-purple-950/20 border border-purple-900/30 p-2 rounded">
                                        <div className="text-purple-400/70 mb-1">Dominicales</div>
                                        <div className="text-purple-300">D: {row.hdd.toFixed(1)} | N: {row.hdn.toFixed(1)}</div>
                                    </div>
                                    {row.ausencias > 0 && (
                                        <div className="bg-red-950/20 border border-red-900/30 p-2 rounded col-span-2">
                                            <div className="text-red-400 font-bold">Ausencias: {row.ausencias}</div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default PersonnelPayroll;
