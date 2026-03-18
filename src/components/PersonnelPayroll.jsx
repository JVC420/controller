import React, { useState, useMemo } from 'react';
import { Download } from 'lucide-react';
import { clsx } from 'clsx';
import { getRoleDisplayName } from '../utils/roleDisplay';

const toH = (ms) => ms / 3600000;

// ── Colombian Holidays (Festivos) ─────────────────────────────────────────
// Genera todos los festivos de Colombia para un año dado, incluyendo Ley Emiliani
const getColombianHolidays = (() => {
    const cache = {};

    // Algoritmo anónimo de Pascua (Gauss/Computus)
    function easter(y) {
        const a = y % 19;
        const b = Math.floor(y / 100);
        const c = y % 100;
        const d = Math.floor(b / 4);
        const e = b % 4;
        const f = Math.floor((b + 8) / 25);
        const g = Math.floor((b - f + 1) / 3);
        const h = (19 * a + b - d - g + 15) % 30;
        const i = Math.floor(c / 4);
        const k = c % 4;
        const l = (32 + 2 * e + 2 * i - h - k) % 7;
        const m = Math.floor((a + 11 * h + 22 * l) / 451);
        const month = Math.floor((h + l - 7 * m + 114) / 31) - 1; // 0-based
        const day = ((h + l - 7 * m + 114) % 31) + 1;
        return new Date(y, month, day);
    }

    // Ley Emiliani: mueve al siguiente lunes si no cae en lunes
    function nextMonday(date) {
        const d = new Date(date);
        const day = d.getDay();
        if (day === 1) return d;
        const diff = day === 0 ? 1 : (8 - day);
        d.setDate(d.getDate() + diff);
        return d;
    }

    function toKey(d) {
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }

    function addDays(d, n) {
        const r = new Date(d);
        r.setDate(r.getDate() + n);
        return r;
    }

    return function getColombianHolidays(year) {
        if (cache[year]) return cache[year];
        const set = new Set();
        const E = easter(year);

        // ── Fijos que NO se mueven ──
        set.add(`${year}-01-01`); // Año Nuevo
        set.add(`${year}-05-01`); // Día del Trabajo
        set.add(`${year}-07-20`); // Grito de Independencia
        set.add(`${year}-08-07`); // Batalla de Boyacá
        set.add(`${year}-12-25`); // Navidad

        // ── Fijos que se mueven al siguiente lunes (Ley Emiliani) ──
        set.add(toKey(nextMonday(new Date(year, 0, 6))));   // Reyes Magos (Ene 6)
        set.add(toKey(nextMonday(new Date(year, 2, 19))));  // San José (Mar 19)
        set.add(toKey(nextMonday(new Date(year, 5, 29))));  // San Pedro y San Pablo (Jun 29)
        set.add(toKey(nextMonday(new Date(year, 7, 15))));  // Asunción de la Virgen (Ago 15)
        set.add(toKey(nextMonday(new Date(year, 9, 12))));  // Día de la Raza (Oct 12)
        set.add(toKey(nextMonday(new Date(year, 10, 1))));  // Todos los Santos (Nov 1)
        set.add(toKey(nextMonday(new Date(year, 10, 11)))); // Independencia de Cartagena (Nov 11)

        // ── Basados en Pascua ──
        set.add(toKey(addDays(E, -3)));  // Jueves Santo
        set.add(toKey(addDays(E, -2)));  // Viernes Santo
        set.add(toKey(nextMonday(addDays(E, 43))));  // Ascensión del Señor (Pascua +39 → lunes)
        set.add(toKey(nextMonday(addDays(E, 64))));  // Corpus Christi (Pascua +60 → lunes)
        set.add(toKey(nextMonday(addDays(E, 71))));  // Sagrado Corazón (Pascua +68 → lunes)

        set.add(`${year}-12-08`); // Inmaculada Concepción (fijo)

        cache[year] = set;
        return set;
    };
})();

// Verifica si una fecha (Date object) es domingo o festivo colombiano
function isDominicalOrFestivo(date) {
    if (date.getDay() === 0) return true;
    const y = date.getFullYear();
    const key = `${y}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    return getColombianHolidays(y).has(key);
}

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

    // Get hour in Colombia timezone (0-23)
    const getColombiaHour = (ms) => {
        return parseInt(new Intl.DateTimeFormat('en-US', {
            timeZone: 'America/Bogota', hour: 'numeric', hour12: false
        }).format(new Date(ms)));
    };

    // Get next boundary time in Colombia timezone
    const getNextBoundary = (ms, targetHour) => {
        const d = new Date(ms);
        const parts = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit'
        }).format(d);
        const colH = getColombiaHour(ms);
        // If current hour >= targetHour and target is 6 (morning), go to next day
        // If current hour >= targetHour and target is 19, go to next day 19:00
        let dateStr = parts;
        if ((targetHour === 6 && colH >= 6) || (targetHour === 19 && colH >= 19)) {
            // advance the date by 1 day
            const next = new Date(d);
            next.setDate(next.getDate() + 1);
            dateStr = new Intl.DateTimeFormat('en-CA', {
                timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit'
            }).format(next);
        }
        // Build target datetime in Colombia → convert to UTC ms
        // Colombia is UTC-5, so boundary in UTC = boundary_local + 5h
        const [y, m, dd] = dateStr.split('-').map(Number);
        return Date.UTC(y, m - 1, dd, targetHour + 5, 0, 0, 0);
    };

    // Split any time range [startMs, endMs] into diurna (06:00-19:00 COT) and nocturna (19:00-06:00 COT) ms
    const splitDiurnaNocturna = (startMs, endMs) => {
        let diurna = 0, nocturna = 0;
        let cursor = startMs;
        while (cursor < endMs) {
            const h = getColombiaHour(cursor);
            if (h >= 6 && h < 19) {
                // In diurna window → next boundary is 19:00 COT today
                const nb = getNextBoundary(cursor, 19);
                const segEnd = Math.min(endMs, nb);
                diurna += segEnd - cursor;
                cursor = segEnd;
            } else {
                // In nocturna window → next boundary is 06:00 COT
                const nb = getNextBoundary(cursor, 6);
                const segEnd = Math.min(endMs, nb);
                nocturna += segEnd - cursor;
                cursor = segEnd;
            }
        }
        return { diurna, nocturna };
    };

    // Split a time range into Sunday/Festivo vs ordinary segments, then into diurna/nocturna
    const splitByDayType = (startMs, endMs) => {
        const result = { ordD: 0, ordN: 0, domD: 0, domN: 0 };
        let cursor = startMs;
        while (cursor < endMs) {
            // Get Colombia date for this cursor
            const d = new Date(cursor);
            const colDateStr = new Intl.DateTimeFormat('en-CA', {
                timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit'
            }).format(d);
            // Next midnight in Colombia = next day 00:00 COT = 05:00 UTC
            const [y, m, dd] = colDateStr.split('-').map(Number);
            const nextMidnightUTC = Date.UTC(y, m - 1, dd + 1, 5, 0, 0, 0);
            const segEnd = Math.min(endMs, nextMidnightUTC);
            // Check day type using Colombia date
            const colDate = new Date(y, m - 1, dd);
            const isDom = isDominicalOrFestivo(colDate);
            const { diurna, nocturna } = splitDiurnaNocturna(cursor, segEnd);
            if (isDom) { result.domD += diurna; result.domN += nocturna; }
            else { result.ordD += diurna; result.ordN += nocturna; }
            cursor = segEnd;
        }
        return result;
    };

    // Computes 8-category hours for a single shift
    // Jornada diurna: 06:00 - 19:00 | Jornada nocturna: 19:00 - 06:00
    // Ordinarias = horas reales dentro de la ventana programada
    // Extras = horas reales fuera de la ventana programada
    const computeHours = (t) => {
        const inicio = t.inicioReal || t.inicioProgramado;
        const fin = t.horaFinReal || t.horaFin;
        if (!inicio || !fin) return null;

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
            const s = splitByDayType(ordStart, ordEnd);
            res.hod += s.ordD; res.hon += s.ordN;
            res.hdd += s.domD; res.hdn += s.domN;
        }

        // 2. Extra hours: actual worked time outside the programmed window
        // Before programmed start
        if (startMs < baseStart) {
            const segEnd = Math.min(baseStart, endMs);
            const s = splitByDayType(startMs, segEnd);
            res.hed += s.ordD; res.hen += s.ordN;
            res.hedd += s.domD; res.hedn += s.domN;
        }
        // After programmed end
        if (endMs > baseEnd) {
            const segStart = Math.max(startMs, baseEnd);
            const s = splitByDayType(segStart, endMs);
            res.hed += s.ordD; res.hen += s.ordN;
            res.hedd += s.domD; res.hedn += s.domN;
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
                // Shift not yet finalized: check if past date → absence (Colombia timezone)
                if (!t.inicioReal) {
                    const todayCO = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
                    if (t.fecha < todayCO) byEmp[key].ausencias++;
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
        <div className="bg-dark-800 border border-slate-700 rounded-xl shadow-md lg:shadow-2xl overflow-x-hidden">
            {/* Filters + Export */}
            <div className="p-4 border-b border-slate-700 bg-dark-900/50 flex flex-wrap gap-4 items-end justify-between">
                <div className="flex flex-wrap gap-4 items-end min-w-0">
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Desde</label>
                        <input type="date" value={payrollRange.desde}
                            onChange={e => setPayrollRange(r => ({ ...r, desde: e.target.value }))}
                            className="bg-dark-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:border-blue-500 outline-none w-full sm:w-auto min-w-0" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Hasta</label>
                        <input type="date" value={payrollRange.hasta}
                            onChange={e => setPayrollRange(r => ({ ...r, hasta: e.target.value }))}
                            className="bg-dark-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:border-blue-500 outline-none w-full sm:w-auto min-w-0" />
                    </div>
                    <span className="text-xs text-slate-500 pb-1.5 w-full md:w-auto">
                        {payrollRows.length} empleado(s) · {turnosHoy.filter(t => t.fecha >= payrollRange.desde && t.fecha <= payrollRange.hasta).length} turno(s)
                    </span>
                </div>
                <button onClick={handleExportCSV}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 bg-emerald-700 hover:bg-emerald-600 text-white px-4 py-2.5 rounded-lg text-sm font-bold transition-colors shadow-lg shadow-emerald-900/30">
                    <Download size={15} className="inline mr-2" /> Exportar CSV
                </button>
            </div>

            {/* Responsive Desktop Grid / Mobile Stack */}
            <div className="overflow-x-auto">
                <table className="hidden min-[1600px]:table w-full table-auto text-left border-collapse text-sm">
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
                                    <td className="py-2.5 px-4 font-mono text-slate-400 text-xs whitespace-nowrap">{row.cedula}</td>
                                    <td className="py-2.5 px-4 font-bold text-slate-200 break-words">{row.nombre}</td>
                                    <td className="py-2.5 px-4 text-slate-400 break-words">{getRoleDisplayName(row.cargo)}</td>
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
                <div className="min-[1600px]:hidden flex flex-col gap-3 p-4">
                    {payrollRows.length === 0 && (
                        <div className="py-12 text-center text-slate-500 text-sm">No hay turnos en el período seleccionado.</div>
                    )}
                    {payrollRows.map(row => {
                        const total = +(row.hod + row.hon + row.hed + row.hen + row.hdd + row.hdn + row.hedd + row.hedn).toFixed(1);
                        return (
                            <div key={row.id} className="bg-dark-900 border border-slate-700 rounded-lg p-4 space-y-3 min-w-0">
                                <div className="flex justify-between items-start">
                                    <div className="min-w-0 pr-2">
                                        <div className="font-bold text-slate-100 break-words">{row.nombre}</div>
                                        <div className="text-xs text-slate-400 break-words">{getRoleDisplayName(row.cargo)} • {row.cedula}</div>
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
