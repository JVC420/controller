import React, { useState, useMemo } from 'react';
import { Download } from 'lucide-react';
import { clsx } from 'clsx';

const toH = (ms) => ms / 3600000;

const isOvertime = (progFinStr, realFinStr) => {
    if (!progFinStr || !realFinStr) return false;
    const progMs = new Date(`1970-01-01T${progFinStr}:00`).getTime();
    const realMs = new Date(`1970-01-01T${realFinStr}:00`).getTime();
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

    // Compute exactly how many hours fall strictly into
    // Diurno (06:00-21:00) vs Nocturno (21:00-06:00)
    const computeOverlap = (startMs, endMs, limitHour) => {
        if (endMs <= startMs) endMs += 86400000; // crosses midnight
        const ref = new Date(startMs);
        ref.setHours(limitHour, 0, 0, 0);
        let refMs = ref.getTime();

        const s1 = startMs, e1 = Math.min(endMs, refMs);
        const s2 = Math.max(startMs, refMs), e2 = endMs;
        const dur1 = e1 > s1 ? e1 - s1 : 0;
        const dur2 = e2 > s2 ? e2 - s2 : 0;
        return { dur1, dur2 };
    };

    // Computes 8-category hours for a single shift based on actual rules
    const computeHours = (t) => {
        const inicio = t.inicioReal || t.inicioProgramado;
        const fin = t.horaFinReal || t.horaFin;
        if (!inicio || !fin) return null;

        const isSunday = new Date(t.fecha + 'T12:00:00').getDay() === 0;

        let startMs = new Date(`1970-01-01T${inicio}:00`).getTime();
        let endMs = new Date(`1970-01-01T${fin}:00`).getTime();
        if (endMs <= startMs) endMs += 86400000; // cross mid

        const baseStart = new Date(`1970-01-01T${t.inicioProgramado}:00`).getTime();
        let baseEnd = new Date(`1970-01-01T${t.horaFin}:00`).getTime();
        if (baseEnd <= baseStart) baseEnd += 86400000;

        // Actual span vs Standard 12h span
        const totalWorkedMs = endMs - startMs;
        const totalBaseMs = baseEnd - baseStart;

        let ordinaryMs = Math.min(totalWorkedMs, totalBaseMs);
        let extraMs = Math.max(0, totalWorkedMs - totalBaseMs);

        const res = { hod: 0, hon: 0, hed: 0, hen: 0, hdd: 0, hdn: 0, hedd: 0, hedn: 0 };

        // 1. Process Ordinary hours
        const ordEndMs = startMs + ordinaryMs;
        if (startMs < new Date(`1970-01-01T21:00:00`).getTime()) {
            // Started in the day (06:00 - 21:00)
            const { dur1: diurnas, dur2: nocturnas } = computeOverlap(startMs, ordEndMs, 21);
            if (isSunday) { res.hdd += diurnas; res.hdn += nocturnas; }
            else { res.hod += diurnas; res.hon += nocturnas; }
        } else {
            // Started at night (21:00 - 06:00)
            const { dur1: nocturnas, dur2: diurnas } = computeOverlap(startMs, ordEndMs, 6 + 24); // next day 6am
            if (isSunday) { res.hdn += nocturnas; res.hdd += diurnas; }
            else { res.hon += nocturnas; res.hod += diurnas; }
        }

        // 2. Process Extra/Overtime hours
        if (extraMs > 0) {
            const extStartMs = ordEndMs;
            const extEndMs = extStartMs + extraMs;

            // Re-normalize base to determine if extra happens in day or night window
            const extStartObj = new Date(extStartMs);
            const hours = extStartObj.getHours();

            if (hours >= 6 && hours < 21) {
                // Starts in day
                const { dur1: edu, dur2: eno } = computeOverlap(extStartMs, extEndMs, 21);
                if (isSunday) { res.hedd += edu; res.hedn += eno; }
                else { res.hed += edu; res.hen += eno; }
            } else {
                // Starts at night
                let limitHour = hours >= 21 ? 6 + 24 : 6;
                const { dur1: eno, dur2: edu } = computeOverlap(extStartMs, extEndMs, limitHour);
                if (isSunday) { res.hedn += eno; res.hedd += edu; }
                else { res.hen += eno; res.hed += edu; }
            }
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
            byEmp[key].turnos.push(t.fecha);
            if (t.cancelado) {
                // Cancelled shifts: don't count hours or absences
            } else if (!t.inicioReal && !t.horaFin && !t.inicioProgramado) {
                // No planned times at all → mark as absence
                byEmp[key].ausencias++;
            } else {
                // Compute hours: uses real times if present, falls back to planned
                const h = computeHours(t);
                if (h) {
                    byEmp[key].hod += h.hod; byEmp[key].hon += h.hon;
                    byEmp[key].hed += h.hed; byEmp[key].hen += h.hen;
                    byEmp[key].hdd += h.hdd; byEmp[key].hdn += h.hdn;
                    byEmp[key].hedd += h.hedd; byEmp[key].hedn += h.hedn;
                }
                // Only count as absence if no real start AND the shift date is in the past
                if (!t.inicioReal && !t.horaFinReal) {
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
