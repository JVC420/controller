import React, { useMemo, useState } from 'react';
import { Activity, Clock, FileCheck, Truck, Users, AlertTriangle, Calendar } from 'lucide-react';
import { clsx } from 'clsx';

const getColombiaToday = () =>
    new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

const MetricsDashboard = ({ flota = [], solicitudes = [], turnos = [] }) => {
    // ─── State: Selected Date ──────────────────────────────────────────────
    const [selectedDate, setSelectedDate] = useState(getColombiaToday);

    // ─── 1. Core Computations (Real-time and Historical) ───────────────────
    const metrics = useMemo(() => {
        const now = Date.now();
        const todayColombia = getColombiaToday();

        // Define boundaries for the selected day in local time
        const startOfDay = new Date(selectedDate + 'T00:00:00');
        const endOfDay = new Date(selectedDate + 'T23:59:59.999');

        // Check if selected date is today (in Colombia timezone)
        const isToday = todayColombia === selectedDate;

        // --- Fleet Metrics (Always live) ---
        const totalAmbulancias = flota.length || 1; // avoid division by zero
        const disponibles = flota.filter(a => a.estado === 'Disponible');
        const enServicio = flota.filter(a => a.estado === 'En Servicio');
        const operativas = disponibles.length + enServicio.length;
        const porcOperativa = Math.round((operativas / totalAmbulancias) * 100);

        // --- Time Metrics (Always live) ---
        // Idle time = Average minutes since lastAvailableAt for currently AVAILABLE ambulances
        let totalIdleMs = 0;
        let idleCount = 0;
        disponibles.forEach(a => {
            if (a.lastAvailableAt) {
                totalIdleMs += (now - new Date(a.lastAvailableAt).getTime());
                idleCount++;
            }
        });
        const avgIdleMins = idleCount > 0 ? Math.floor((totalIdleMs / idleCount) / 60000) : 0;

        // --- Services Metrics (Filtered by Date) ---
        const closedOnDate = solicitudes.filter(s => {
            if (s.estado !== 'Finalizado' || !s.finalizadoAt) return false;
            const finTime = new Date(s.finalizadoAt).getTime();
            return finTime >= startOfDay.getTime() && finTime <= endOfDay.getTime();
        });

        // Active services only make sense if viewing "today", otherwise 0.
        const activeServices = isToday ? solicitudes.filter(s => s.estado === 'Pendiente' || s.estado === 'Asignado') : [];

        // Response Time & SLA for the selected date
        let totalResponseMs = 0;
        let responseCount = 0;
        let slaBreaches = 0; // >10 min to assign

        closedOnDate.forEach(s => {
            if (s.creadoAt && s.asignadoAt) {
                const waitMs = new Date(s.asignadoAt).getTime() - new Date(s.creadoAt).getTime();
                if (waitMs > 0) {
                    totalResponseMs += waitMs;
                    responseCount++;
                    if (waitMs > 600000) slaBreaches++; // 10 mins = 600000 ms
                }
            }
        });

        const avgResponseMins = responseCount > 0 ? Math.floor((totalResponseMs / responseCount) / 60000) : 0;
        const slaBreachRate = responseCount > 0 ? Math.round((slaBreaches / responseCount) * 100) : 0;

        // --- Personnel (Filtered by Date) ---
        const activeStaff = turnos.filter(t => {
            if (t.cancelado || t.ausenciaConfirmada) return false;
            if (t.fecha !== selectedDate) return false;
            // If viewing today, count shifts not yet finalized
            if (isToday) return !t.horaFinReal;
            // If viewing history, count all shifts on that date
            return true;
        }).length;

        // --- Per-Ambulance Stats (Services closed on Date) ---
        const ambulanceStats = flota.map(amb => {
            const servicesOnDate = closedOnDate.filter(s => s.ambulanciaAsignada === amb.id).length;

            // Current idle calculation for this specific vehicle ONLY if viewing today
            let currentIdle = null;
            if (isToday && amb.estado === 'Disponible' && amb.lastAvailableAt) {
                currentIdle = Math.floor((now - new Date(amb.lastAvailableAt).getTime()) / 60000);
            }

            return {
                ...amb,
                servicesToday: servicesOnDate,
                currentIdle
            };
        });

        return {
            isToday,
            porcOperativa,
            disponibles: disponibles.length,
            enServicio: enServicio.length,
            mantenimiento: flota.length - operativas,
            avgIdleMins,
            avgResponseMins,
            closedToday: closedOnDate.length,
            activeServices: activeServices.length,
            slaBreachRate,
            activeStaff,
            ambulanceStats: ambulanceStats.sort((a, b) => b.servicesToday - a.servicesToday || a.id.localeCompare(b.id))
        };
    }, [flota, solicitudes, turnos, selectedDate]);

    // ─── Formatting Helpers ───────────────────────────────────────────────
    const formatMin = (m) => m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m} min`;

    return (
        <div className="flex-1 p-6 overflow-y-auto bg-[#0B1121] h-screen flex flex-col space-y-8">
            <header className="flex flex-col md:flex-row justify-between md:items-end gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">Métricas de Operación</h1>
                    <p className="text-slate-400 mt-1">Indicadores vivos calculados desde Firestore.</p>
                </div>
                <div className="flex items-center gap-3 bg-dark-800 border border-slate-700 p-2 rounded-xl">
                    <Calendar size={18} className="text-blue-400 ml-2" />
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="bg-transparent border-none text-white font-medium focus:ring-0 focus:outline-none cursor-pointer"
                        max={getColombiaToday()}
                    />
                </div>
            </header>

            {/* ── Level 1: Global Vital Signs ───────────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <KPICard
                    title="% Flota Operativa"
                    value={`${metrics.porcOperativa}%`}
                    subtitle={`${metrics.disponibles + metrics.enServicio} de ${flota.length} vehículos`}
                    icon={<Truck size={20} className="text-emerald-400" />}
                    color="text-emerald-400" bg="bg-emerald-500/10" border="border-emerald-500/20"
                />
                <KPICard
                    title="Tiempo Prom. Respuesta"
                    value={formatMin(metrics.avgResponseMins)}
                    subtitle="Desde ingreso hasta asignación"
                    icon={<Clock size={20} className="text-blue-400" />}
                    color="text-blue-400" bg="bg-blue-500/10" border="border-blue-500/20"
                />
                <KPICard
                    title="Servicios Finalizados (Hoy)"
                    value={metrics.closedToday}
                    subtitle={`${metrics.activeServices} activos actualmente`}
                    icon={<FileCheck size={20} className="text-purple-400" />}
                    color="text-purple-400" bg="bg-purple-500/10" border="border-purple-500/20"
                />
                <KPICard
                    title="Personal Activo"
                    value={metrics.activeStaff}
                    subtitle="Tripulantes en turno"
                    icon={<Users size={20} className="text-amber-400" />}
                    color="text-amber-400" bg="bg-amber-500/10" border="border-amber-500/20"
                />
            </div>

            {/* ── Level 2: Secondary Indicators ─────────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <MiniIndicator
                    label="Ambulancias en Mantenimiento"
                    value={metrics.mantenimiento}
                    alert={metrics.mantenimiento > 0}
                />
                <MiniIndicator
                    label="Tiempo Muerto Promedio Global"
                    value={formatMin(metrics.avgIdleMins)}
                    alert={metrics.avgIdleMins > 60}
                />
                <MiniIndicator
                    label="Tasa de Brecha SLA (>10m)"
                    value={`${metrics.slaBreachRate}%`}
                    alert={metrics.slaBreachRate > 15}
                />
            </div>

            {/* ── Level 3: Per-Vehicle Breakdown ────────────────────────────── */}
            <section className="bg-dark-800 border border-slate-700/50 rounded-2xl overflow-hidden shadow-xl flex flex-col">
                <div className="px-6 py-4 border-b border-slate-700/50 bg-dark-900/30">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <Activity size={18} className="text-blue-400" />
                        Desglose Operativo por Móvil
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                        Rendimiento individual y estado en tiempo real de cada vehículo.
                    </p>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap hidden md:table">
                        <thead className="text-xs text-slate-400 bg-dark-900/60 font-semibold uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-4 rounded-tl-lg">Móvil</th>
                                <th className="px-6 py-4">Tipo</th>
                                <th className="px-6 py-4">Estado Actual</th>
                                <th className="px-6 py-4 text-center">Servicios Hoy</th>
                                <th className="px-6 py-4">Tiempo Muerto Actual</th>
                                <th className="px-6 py-4 rounded-tr-lg">Novedades</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/80">
                            {metrics.ambulanceStats.length > 0 ? metrics.ambulanceStats.map((amb) => (
                                <tr key={amb.id} className="hover:bg-slate-800/20 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-white">{amb.id}</div>
                                    </td>
                                    <td className="px-6 py-4 text-slate-300">
                                        {amb.tipo}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={clsx("px-2.5 py-1 text-[11px] font-bold rounded-full border",
                                            amb.estado === 'Disponible' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                                                amb.estado === 'En Servicio' ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
                                                    "bg-red-500/10 text-red-400 border-red-500/20"
                                        )}>
                                            {amb.estado}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={clsx("font-bold", amb.servicesToday > 0 ? "text-white" : "text-slate-600")}>
                                            {amb.servicesToday}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        {amb.currentIdle !== null ? (
                                            <span className={clsx("flex items-center gap-1.5", amb.currentIdle > 60 ? "text-amber-400 font-bold" : "text-slate-400")}>
                                                <Clock size={12} />
                                                {formatMin(amb.currentIdle)}
                                            </span>
                                        ) : (
                                            <span className="text-slate-600">—</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-slate-400 text-xs">
                                        {amb.notas ? (
                                            <span className="flex items-center gap-1 text-red-300">
                                                <AlertTriangle size={12} /> {amb.notas}
                                            </span>
                                        ) : (
                                            <span className="text-slate-600">—</span>
                                        )}
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="6" className="px-6 py-8 text-center text-slate-500">
                                        No hay flota registrada.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>

                    {/* Mobile Card View */}
                    <div className="md:hidden flex flex-col p-4 gap-3">
                        {metrics.ambulanceStats.length === 0 && (
                            <div className="py-8 text-center text-slate-500 text-sm">No hay flota registrada.</div>
                        )}
                        {metrics.ambulanceStats.map((amb) => (
                            <div key={amb.id} className="bg-dark-900 border border-slate-700/50 p-4 rounded-xl flex flex-col gap-3 shadow-sm">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="flex justify-between items-center gap-2 mb-1">
                                            <h3 className="font-bold text-white text-lg">{amb.id}</h3>
                                            <span className={clsx("px-2 py-0.5 text-[10px] uppercase font-bold rounded border tracking-wider",
                                                amb.estado === 'Disponible' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                                                    amb.estado === 'En Servicio' ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
                                                        "bg-red-500/10 text-red-400 border-red-500/20"
                                            )}>
                                                {amb.estado}
                                            </span>
                                        </div>
                                        <div className="text-sm font-medium text-slate-400">{amb.tipo}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xs text-slate-500 mb-0.5 uppercase tracking-wider font-bold">Servicios Hoy</div>
                                        <div className={clsx("text-lg font-black font-mono", amb.servicesToday > 0 ? "text-white" : "text-slate-600")}>
                                            {amb.servicesToday}
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2 text-xs border-t border-slate-800 pt-3">
                                    <div className="bg-slate-800/30 p-2 rounded-lg border border-slate-700/50">
                                        <div className="text-slate-500 mb-1 uppercase tracking-wider font-bold text-[10px]">T. Muerto</div>
                                        {amb.currentIdle !== null ? (
                                            <span className={clsx("flex items-center gap-1.5 font-bold font-mono", amb.currentIdle > 60 ? "text-amber-400" : "text-slate-300")}>
                                                {formatMin(amb.currentIdle)}
                                            </span>
                                        ) : (
                                            <span className="text-slate-600">—</span>
                                        )}
                                    </div>
                                    <div className={clsx("p-2 rounded-lg border", amb.notas ? "bg-red-950/20 border-red-900/40" : "bg-slate-800/30 border-slate-700/50")}>
                                        <div className={clsx("mb-1 uppercase tracking-wider font-bold text-[10px]", amb.notas ? "text-red-400/80" : "text-slate-500")}>Novedades</div>
                                        {amb.notas ? (
                                            <span className="flex items-center gap-1 text-red-300 font-medium line-clamp-2">
                                                <AlertTriangle size={12} className="shrink-0" /> {amb.notas}
                                            </span>
                                        ) : (
                                            <span className="text-slate-600">—</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        </div>
    );
};

const KPICard = ({ title, value, subtitle, icon, color, bg, border }) => (
    <div className={`p-5 rounded-2xl border ${border} bg-dark-800 shadow-xl relative overflow-hidden flex flex-col items-start gap-4 hover:border-slate-600 transition-colors`}>
        <div className="flex justify-between w-full relative z-10">
            <div className={`p-2.5 rounded-xl ${bg}`}>
                {icon}
            </div>
        </div>
        <div className="z-10 mt-2">
            <span className={`text-4xl font-black tracking-tight ${color}`}>{value}</span>
            <h3 className="text-sm font-semibold text-white mt-2">{title}</h3>
            <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
        </div>
        <div className={`absolute -bottom-10 -right-10 w-40 h-40 rounded-full ${bg} blur-3xl opacity-50 pointer-events-none`}></div>
    </div>
);

const MiniIndicator = ({ label, value, alert }) => (
    <div className="bg-dark-800 border border-slate-700/50 rounded-xl p-4 flex justify-between items-center shadow-md">
        <span className="text-sm text-slate-300 font-medium">{label}</span>
        <span className={clsx("text-xl font-black font-mono", alert ? "text-red-400" : "text-white")}>
            {value}
        </span>
    </div>
);

export default MetricsDashboard;
