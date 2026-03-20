import React, { useMemo, useState } from 'react';
import { Activity, Clock, FileCheck, Truck, Users, AlertTriangle, Calendar } from 'lucide-react';
import { clsx } from 'clsx';
import { AMBULANCE_OPERATIONAL_STATUS, getAmbulanceOperationalSnapshot, getAmbulanceOperationalStatus } from '../utils/fleetStatus';
import { getRoleDisplayName } from '../utils/roleDisplay';
import { translateIncidentFlags } from '../utils/shiftOperations';

const getColombiaToday = () =>
    new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

// Safely parse any timestamp (ISO string or Firestore Timestamp) to ms
const safeToMs = (val) => {
    if (!val) return null;
    if (typeof val === 'number') return val;
    if (val.toDate) return val.toDate().getTime();
    const ms = new Date(val).getTime();
    return isNaN(ms) ? null : ms;
};

// Converts a date string in Colombia timezone to Colombia date string (handles ISO strings)
const toColombiaDateStr = (isoStr) => {
    if (!isoStr) return '';
    const ms = safeToMs(isoStr);
    if (ms == null) return '';
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(ms));
};

const MetricsDashboard = ({ flota = [], solicitudes = [], turnos = [], flotaStatusLog = [] }) => {
    // ─── State: Date Range ─────────────────────────────────────────────────
    const [dateRange, setDateRange] = useState(() => {
        const today = getColombiaToday();
        return { desde: today, hasta: today };
    });


    // ─── 1. Core Computations (Real-time and Historical) ───────────────────
    const metrics = useMemo(() => {
        const now = Date.now();
        const todayColombia = getColombiaToday();

        // Check if the range includes today
        const includestoday = dateRange.desde <= todayColombia && todayColombia <= dateRange.hasta;
        const isSingleDay = dateRange.desde === dateRange.hasta;
        const isToday = isSingleDay && dateRange.desde === todayColombia;

        // --- Fleet Metrics (Always live) ---
        const totalAmbulancias = flota.length || 1; // avoid division by zero
        const disponibles = flota.filter((a) => getAmbulanceOperationalStatus(a, turnos) === AMBULANCE_OPERATIONAL_STATUS.AVAILABLE);
        const disponiblesIncompleta = flota.filter((a) => getAmbulanceOperationalStatus(a, turnos) === AMBULANCE_OPERATIONAL_STATUS.INCOMPLETE_CREW);
        const enServicio = flota.filter((a) => getAmbulanceOperationalStatus(a, turnos) === AMBULANCE_OPERATIONAL_STATUS.IN_SERVICE);
        const operativas = disponibles.length + enServicio.length;
        const porcOperativa = Math.round((operativas / totalAmbulancias) * 100);

        // --- Time Metrics from Status Log (Filtered by Date Range) ---
        const logsInRange = flotaStatusLog.filter(log => {
            const logDate = toColombiaDateStr(log.timestamp);
            return logDate >= dateRange.desde && logDate <= dateRange.hasta;
        });

        // Calculate total operational vs idle time from logs
        let totalOperationalMins = 0;
        let totalIdleMinsFromLog = 0;
        logsInRange.forEach(log => {
            const mins = log.durationMinutes || 0;
            if (log.wasOperational) {
                totalOperationalMins += mins;
            } else if (log.wasIdle) {
                totalIdleMinsFromLog += mins;
            }
        });

        // Group logs by ambulance for per-vehicle stats
        const logsByAmbulance = new Map();
        logsInRange.forEach(log => {
            const ambId = log.ambulanceId || log.movil;
            if (!logsByAmbulance.has(ambId)) {
                logsByAmbulance.set(ambId, { operational: 0, idle: 0 });
            }
            const stats = logsByAmbulance.get(ambId);
            if (log.wasOperational) {
                stats.operational += log.durationMinutes || 0;
            } else if (log.wasIdle) {
                stats.idle += log.durationMinutes || 0;
            }
        });

        // Calculate utilization rate
        const totalTrackedMins = totalOperationalMins + totalIdleMinsFromLog;
        const utilizationRate = totalTrackedMins > 0
            ? Math.round((totalOperationalMins / totalTrackedMins) * 100)
            : 0;

        // --- Live Idle Time (current snapshot for ambulances currently idle) ---
        let totalIdleMs = 0;
        let idleCount = 0;
        [...disponibles, ...disponiblesIncompleta].forEach((a) => {
            const operationalStatus = getAmbulanceOperationalStatus(a, turnos);
            const idleStart = operationalStatus === AMBULANCE_OPERATIONAL_STATUS.INCOMPLETE_CREW
                ? safeToMs(a.tripulacionIncompletaDesde) || safeToMs(a.estadoOperativoActualizadoAt) || safeToMs(a.lastAvailableAt)
                : safeToMs(a.listaAsignacionDesde) || safeToMs(a.lastAvailableAt);

            if (idleStart != null) {
                totalIdleMs += (now - idleStart);
                idleCount++;
            }
        });
        const avgIdleMins = idleCount > 0 ? Math.floor((totalIdleMs / idleCount) / 60000) : 0;

        // --- Services Metrics (Filtered by Date, by fecha Colombia) ---
        const closedOnDate = solicitudes.filter(s => {
            if (s.estado !== 'Finalizado' || !s.finalizadoAt) return false;
            const d = toColombiaDateStr(s.finalizadoAt);
            return d >= dateRange.desde && d <= dateRange.hasta;
        });

        // Active services only make sense if range includes today, otherwise 0.
        const activeServices = includestoday ? solicitudes.filter(s => s.estado === 'Pendiente' || s.estado === 'Asignado') : [];

        // Response Time & SLA for the selected date
        let totalResponseMs = 0;
        let responseCount = 0;
        let slaBreaches = 0; // >10 min to assign

        closedOnDate.forEach(s => {
            const creadoMs = safeToMs(s.creadoAt);
            const asignadoMs = safeToMs(s.asignadoAt);
            if (creadoMs != null && asignadoMs != null) {
                const waitMs = asignadoMs - creadoMs;
                if (waitMs > 0) {
                    totalResponseMs += waitMs;
                    responseCount++;
                    if (waitMs > 600000) slaBreaches++; // 10 mins = 600000 ms
                }
            }
        });

        const avgResponseMins = responseCount > 0 ? Math.floor((totalResponseMs / responseCount) / 60000) : 0;
        const slaBreachRate = responseCount > 0 ? Math.round((slaBreaches / responseCount) * 100) : 0;

        // --- Personnel (Filtered by Date Range) ---
        const activeStaff = turnos.filter(t => {
            if (t.cancelado || t.ausenciaConfirmada) return false;
            if (t.fecha < dateRange.desde || t.fecha > dateRange.hasta) return false;
            // If viewing today (single day), count shifts not yet finalized
            if (isToday) return !t.horaFinReal;
            // If viewing history, count all shifts in range
            return true;
        }).length;

        // --- Per-Ambulance Stats (Services closed on Date) ---
        const ambulanceStats = flota.map(amb => {
            const snapshot = getAmbulanceOperationalSnapshot(amb, turnos, now);
            const servicesOnDate = closedOnDate.filter(s => s.ambulanciaAsignada === amb.id).length;

            // Get logged time stats for this ambulance
            const loggedStats = logsByAmbulance.get(amb.id) || { operational: 0, idle: 0 };
            const ambTotalTracked = loggedStats.operational + loggedStats.idle;
            const ambUtilization = ambTotalTracked > 0
                ? Math.round((loggedStats.operational / ambTotalTracked) * 100)
                : null;

            // Current idle calculation for this specific vehicle ONLY if viewing today
            let currentIdle = null;
            const operationalStatus = snapshot.status;
            if (
                isToday
                && (operationalStatus === AMBULANCE_OPERATIONAL_STATUS.AVAILABLE || operationalStatus === AMBULANCE_OPERATIONAL_STATUS.INCOMPLETE_CREW)
            ) {
                const idleStart = operationalStatus === AMBULANCE_OPERATIONAL_STATUS.INCOMPLETE_CREW
                    ? safeToMs(amb.tripulacionIncompletaDesde) || safeToMs(amb.estadoOperativoActualizadoAt) || safeToMs(amb.lastAvailableAt)
                    : safeToMs(amb.listaAsignacionDesde) || safeToMs(amb.lastAvailableAt);
                if (idleStart != null) {
                    currentIdle = Math.floor((now - idleStart) / 60000);
                }
            }

            return {
                ...amb,
                operationalStatus,
                missingRoles: snapshot.missingRoles,
                incidentFlags: snapshot.incidentFlags,
                servicesToday: servicesOnDate,
                currentIdle,
                loggedOperational: loggedStats.operational,
                loggedIdle: loggedStats.idle,
                utilization: ambUtilization
            };
        });

        return {
            isToday,
            porcOperativa,
            disponibles: disponibles.length,
            disponiblesIncompleta: disponiblesIncompleta.length,
            enServicio: enServicio.length,
            mantenimiento: flota.length - operativas,
            avgIdleMins,
            avgResponseMins,
            closedToday: closedOnDate.length,
            activeServices: activeServices.length,
            slaBreachRate,
            activeStaff,
            // New metrics from log
            totalOperationalMins,
            totalIdleMinsFromLog,
            utilizationRate,
            ambulanceStats: ambulanceStats.sort((a, b) => b.servicesToday - a.servicesToday || a.id.localeCompare(b.id))
        };
    }, [flota, solicitudes, turnos, dateRange, flotaStatusLog]);


    // ─── Formatting Helpers ───────────────────────────────────────────────
    const formatMin = (m) => m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m} min`;

    return (
        <div className="flex-1 p-6 overflow-y-auto bg-[#0B1121] h-screen flex flex-col space-y-8">
            <header className="flex flex-col md:flex-row justify-between md:items-end gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">Métricas de Operación</h1>
                    <p className="text-slate-400 mt-1">Indicadores vivos calculados desde Firestore.</p>
                </div>
                <div className="flex items-center gap-2 bg-dark-800 border border-slate-700 p-2 rounded-xl flex-wrap">
                    <Calendar size={18} className="text-blue-400 ml-2 hidden sm:block" />
                    <div className="flex items-center gap-1.5">
                        <input
                            type="date"
                            value={dateRange.desde}
                            onChange={(e) => setDateRange(r => {
                                const desde = e.target.value;
                                return { desde, hasta: desde > r.hasta ? desde : r.hasta };
                            })}
                            className="bg-transparent border border-slate-700 rounded-lg px-2 py-1 text-sm text-white font-medium focus:ring-0 focus:outline-none focus:border-blue-500 cursor-pointer"
                            max={getColombiaToday()}
                        />
                        <span className="text-slate-500 text-xs font-bold">→</span>
                        <input
                            type="date"
                            value={dateRange.hasta}
                            onChange={(e) => setDateRange(r => ({ ...r, hasta: e.target.value }))}
                            className="bg-transparent border border-slate-700 rounded-lg px-2 py-1 text-sm text-white font-medium focus:ring-0 focus:outline-none focus:border-blue-500 cursor-pointer"
                            min={dateRange.desde}
                            max={getColombiaToday()}
                        />
                    </div>
                    <button
                        type="button"
                        onClick={() => { const t = getColombiaToday(); setDateRange({ desde: t, hasta: t }); }}
                        className="flex items-center gap-1.5 px-3 py-1 text-xs font-bold text-emerald-400 hover:bg-emerald-900/30 border border-emerald-700/40 hover:border-emerald-500/50 rounded-lg transition-colors"
                        title="Ver métricas de hoy"
                    >
                        <Clock size={13} />
                        Hoy
                    </button>
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
                    title="Servicios Finalizados"
                    value={metrics.closedToday}
                    subtitle={metrics.isToday ? `${metrics.activeServices} activos actualmente` : `En el rango seleccionado`}
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
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                <MiniIndicator
                    label="Tasa de Utilización"
                    value={`${metrics.utilizationRate}%`}
                    alert={metrics.utilizationRate < 50}
                    positive={metrics.utilizationRate >= 70}
                />
                <MiniIndicator
                    label="Tiempo Operativo (Log)"
                    value={formatMin(metrics.totalOperationalMins)}
                    positive={true}
                />
                <MiniIndicator
                    label="Tiempo Muerto (Log)"
                    value={formatMin(metrics.totalIdleMinsFromLog)}
                    alert={metrics.totalIdleMinsFromLog > metrics.totalOperationalMins}
                />
                <MiniIndicator
                    label="Tasa de Brecha SLA (>10m)"
                    value={`${metrics.slaBreachRate}%`}
                    alert={metrics.slaBreachRate > 15}
                />
            </div>

            {/* ── Level 2b: Fleet Status ─────────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                <MiniIndicator
                    label="Ambulancias en Mantenimiento"
                    value={metrics.mantenimiento}
                    alert={metrics.mantenimiento > 0}
                />
                <MiniIndicator
                    label="Disp. Tripulación Incompleta"
                    value={metrics.disponiblesIncompleta}
                    alert={metrics.disponiblesIncompleta > 0}
                />
                <MiniIndicator
                    label="Tiempo Muerto Actual Promedio"
                    value={formatMin(metrics.avgIdleMins)}
                    alert={metrics.avgIdleMins > 60}
                />
                <MiniIndicator
                    label="En Servicio Ahora"
                    value={metrics.enServicio}
                    positive={metrics.enServicio > 0}
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
                    <table className="hidden min-[1600px]:table w-full table-auto text-left text-sm">
                        <thead className="text-xs text-slate-400 bg-dark-900/60 font-semibold uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-4 rounded-tl-lg">Móvil</th>
                                <th className="px-6 py-4">Tipo</th>
                                <th className="px-6 py-4">Estado Actual</th>
                                <th className="px-6 py-4 text-center">Servicios</th>
                                <th className="px-6 py-4 text-center">T. Operativo</th>
                                <th className="px-6 py-4 text-center">T. Muerto</th>
                                <th className="px-6 py-4 text-center">Utilización</th>
                                <th className="px-6 py-4">T. Muerto Actual</th>
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
                                            amb.operationalStatus === AMBULANCE_OPERATIONAL_STATUS.AVAILABLE ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                                                amb.operationalStatus === AMBULANCE_OPERATIONAL_STATUS.INCOMPLETE_CREW ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                                                    amb.operationalStatus === AMBULANCE_OPERATIONAL_STATUS.IN_SERVICE ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
                                                        "bg-red-500/10 text-red-400 border-red-500/20"
                                        )}>
                                            {amb.operationalStatus}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={clsx("font-bold", amb.servicesToday > 0 ? "text-white" : "text-slate-600")}>
                                            {amb.servicesToday}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={clsx("font-mono text-xs", amb.loggedOperational > 0 ? "text-emerald-400" : "text-slate-600")}>
                                            {amb.loggedOperational > 0 ? formatMin(amb.loggedOperational) : '—'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={clsx("font-mono text-xs", amb.loggedIdle > 0 ? "text-amber-400" : "text-slate-600")}>
                                            {amb.loggedIdle > 0 ? formatMin(amb.loggedIdle) : '—'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        {amb.utilization !== null ? (
                                            <span className={clsx("font-bold text-xs px-2 py-0.5 rounded",
                                                amb.utilization >= 70 ? "bg-emerald-500/20 text-emerald-400" :
                                                    amb.utilization >= 40 ? "bg-amber-500/20 text-amber-400" :
                                                        "bg-red-500/20 text-red-400"
                                            )}>
                                                {amb.utilization}%
                                            </span>
                                        ) : (
                                            <span className="text-slate-600">—</span>
                                        )}
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
                                        {amb.incidentFlags?.length || amb.missingRoles?.length || amb.notas ? (
                                            <div className="space-y-1">
                                                {amb.missingRoles?.length > 0 && (
                                                    <div className="text-amber-300">Faltan: {amb.missingRoles.map(getRoleDisplayName).join(', ')}</div>
                                                )}
                                                {amb.incidentFlags?.length > 0 && (
                                                    <div className="text-orange-300">Incidencias: {translateIncidentFlags(amb.incidentFlags).join(', ')}</div>
                                                )}
                                                {amb.notas && (
                                                    <span className="flex items-center gap-1 text-red-300">
                                                        <AlertTriangle size={12} /> {amb.notas}
                                                    </span>
                                                )}
                                            </div>
                                        ) : (
                                            <span className="text-slate-600">—</span>
                                        )}
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="9" className="px-6 py-8 text-center text-slate-500">
                                        No hay flota registrada.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>

                    {/* Mobile Card View */}
                    <div className="min-[1600px]:hidden flex flex-col p-4 gap-3">
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
                                                amb.operationalStatus === AMBULANCE_OPERATIONAL_STATUS.AVAILABLE ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                                                    amb.operationalStatus === AMBULANCE_OPERATIONAL_STATUS.INCOMPLETE_CREW ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                                                        amb.operationalStatus === AMBULANCE_OPERATIONAL_STATUS.IN_SERVICE ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
                                                            "bg-red-500/10 text-red-400 border-red-500/20"
                                            )}>
                                                {amb.operationalStatus}
                                            </span>
                                        </div>
                                        <div className="text-sm font-medium text-slate-400">{amb.tipo}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xs text-slate-500 mb-0.5 uppercase tracking-wider font-bold">Servicios</div>
                                        <div className={clsx("text-lg font-black font-mono", amb.servicesToday > 0 ? "text-white" : "text-slate-600")}>
                                            {amb.servicesToday}
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-2 text-xs border-t border-slate-800 pt-3">
                                    <div className="bg-slate-800/30 p-2 rounded-lg border border-slate-700/50">
                                        <div className="text-slate-500 mb-1 uppercase tracking-wider font-bold text-[10px]">T. Operativo</div>
                                        <span className={clsx("font-bold font-mono", amb.loggedOperational > 0 ? "text-emerald-400" : "text-slate-600")}>
                                            {amb.loggedOperational > 0 ? formatMin(amb.loggedOperational) : '—'}
                                        </span>
                                    </div>
                                    <div className="bg-slate-800/30 p-2 rounded-lg border border-slate-700/50">
                                        <div className="text-slate-500 mb-1 uppercase tracking-wider font-bold text-[10px]">T. Muerto</div>
                                        <span className={clsx("font-bold font-mono", amb.loggedIdle > 0 ? "text-amber-400" : "text-slate-600")}>
                                            {amb.loggedIdle > 0 ? formatMin(amb.loggedIdle) : '—'}
                                        </span>
                                    </div>
                                    <div className="bg-slate-800/30 p-2 rounded-lg border border-slate-700/50">
                                        <div className="text-slate-500 mb-1 uppercase tracking-wider font-bold text-[10px]">Utilización</div>
                                        {amb.utilization !== null ? (
                                            <span className={clsx("font-bold",
                                                amb.utilization >= 70 ? "text-emerald-400" :
                                                    amb.utilization >= 40 ? "text-amber-400" : "text-red-400"
                                            )}>
                                                {amb.utilization}%
                                            </span>
                                        ) : (
                                            <span className="text-slate-600">—</span>
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div className="bg-slate-800/30 p-2 rounded-lg border border-slate-700/50">
                                        <div className="text-slate-500 mb-1 uppercase tracking-wider font-bold text-[10px]">T. Muerto Actual</div>
                                        {amb.currentIdle !== null ? (
                                            <span className={clsx("flex items-center gap-1.5 font-bold font-mono", amb.currentIdle > 60 ? "text-amber-400" : "text-slate-300")}>
                                                {formatMin(amb.currentIdle)}
                                            </span>
                                        ) : (
                                            <span className="text-slate-600">—</span>
                                        )}
                                    </div>
                                    <div className={clsx("p-2 rounded-lg border", (amb.notas || amb.incidentFlags?.length || amb.missingRoles?.length) ? "bg-red-950/20 border-red-900/40" : "bg-slate-800/30 border-slate-700/50")}>
                                        <div className={clsx("mb-1 uppercase tracking-wider font-bold text-[10px]", (amb.notas || amb.incidentFlags?.length || amb.missingRoles?.length) ? "text-red-400/80" : "text-slate-500")}>Novedades</div>
                                        {(amb.notas || amb.incidentFlags?.length || amb.missingRoles?.length) ? (
                                            <div className="space-y-1">
                                                {amb.missingRoles?.length > 0 && (
                                                    <div className="text-amber-300">Faltan: {amb.missingRoles.map(getRoleDisplayName).join(', ')}</div>
                                                )}
                                                {amb.incidentFlags?.length > 0 && (
                                                    <div className="text-orange-300">Incidencias: {translateIncidentFlags(amb.incidentFlags).join(', ')}</div>
                                                )}
                                                {amb.notas && (
                                                    <span className="flex items-center gap-1 text-red-300 font-medium line-clamp-2">
                                                        <AlertTriangle size={12} className="shrink-0" /> {amb.notas}
                                                    </span>
                                                )}
                                            </div>
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

const MiniIndicator = ({ label, value, alert, positive }) => (
    <div className="bg-dark-800 border border-slate-700/50 rounded-xl p-4 flex justify-between items-center shadow-md">
        <span className="text-sm text-slate-300 font-medium">{label}</span>
        <span className={clsx("text-xl font-black font-mono", alert ? "text-red-400" : positive ? "text-emerald-400" : "text-white")}>
            {value}
        </span>
    </div>
);

export default MetricsDashboard;
