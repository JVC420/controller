import React, { useState, useEffect } from 'react';
import { FileCheck, Search, Clock, AlertTriangle } from 'lucide-react';
import { clsx } from 'clsx';
import ServiceClosureModal from './ServiceClosureModal';

const HistoryView = ({ historial, getClienteById, updateServiceChecklist, closeService }) => {
    // Current time state to force re-evaluation of 2.5 hour SLAs
    const [now, setNow] = useState(Date.now());

    useEffect(() => {
        const interval = setInterval(() => setNow(Date.now()), 60000); // refresh every minute
        return () => clearInterval(interval);
    }, []);

    // 150 minutes in milliseconds for critical SLA alerts
    const SLA_LIMIT_MS = 150 * 60 * 1000;

    // Modal state for dynamic closure checklists
    const [closureModalData, setClosureModalData] = useState({
        isOpen: false,
        servicio: null,
        cliente: null
    });

    const openClosureModal = (servicio, cliente) => {
        setClosureModalData({ isOpen: true, servicio, cliente });
    };

    return (
        <div className="flex-1 p-6 overflow-y-auto bg-dark-900 h-screen flex flex-col">
            <header className="mb-8">
                <h1 className="text-2xl font-bold text-white tracking-tight">Historial y Control de Servicios</h1>
                <p className="text-slate-400 mt-1">Supervisión de tiempos, soportes físicos y cierre de historias clínicas.</p>
            </header>

            <div className="mb-6 flex gap-4 items-center">
                <div className="relative w-full max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                    <input
                        type="text"
                        placeholder="Buscar por ID, placa o cliente..."
                        className="w-full bg-dark-800 border border-slate-700 rounded-lg py-2.5 pl-10 pr-4 text-white focus:outline-none focus:border-blue-500 transition-all"
                    />
                </div>
            </div>

            <div className="overflow-x-auto bg-dark-800 border border-slate-700 rounded-xl max-h-[70vh]">
                <table className="w-full text-left border-collapse hidden md:table">
                    <thead>
                        <tr className="bg-dark-900/50 text-slate-400 text-sm border-b border-slate-700 text-left">
                            <th className="py-4 px-6 font-semibold">ID Servicio</th>
                            <th className="py-4 px-6 font-semibold">Cliente y Prioridad</th>
                            <th className="py-4 px-6 font-semibold">Ambulancia</th>
                            <th className="py-4 px-6 font-semibold">Tiempo</th>
                            <th className="py-4 px-6 font-semibold">Requisitos Documentales</th>
                            <th className="py-4 px-6 font-semibold">Estado</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50">
                        {historial.sort((a, b) => new Date(b.asignadoAt) - new Date(a.asignadoAt)).map(servicio => {
                            const cliente = getClienteById(servicio.clienteId);

                            // Calculate SLA Breach
                            const assignedAtDate = new Date(servicio.asignadoAt);
                            const elapsedMs = now - assignedAtDate.getTime();
                            const isAlert = elapsedMs > SLA_LIMIT_MS && servicio.estado !== 'Finalizado';

                            // Format Elapsed Time
                            const elapsedHrs = Math.floor(elapsedMs / (1000 * 60 * 60));
                            const elapsedMins = Math.floor((elapsedMs % (1000 * 60 * 60)) / (1000 * 60));

                            return (
                                <tr key={servicio.id} className={clsx("hover:bg-slate-800/50 transition-colors", isAlert && "bg-red-900/10")}>
                                    <td className="py-4 px-6">
                                        <div className="flex items-center gap-3">
                                            {isAlert && <AlertTriangle size={18} className="text-red-500 animate-pulse" />}
                                            <span className="font-mono text-sm font-bold text-white">{servicio.id}</span>
                                        </div>
                                    </td>
                                    <td className="py-4 px-6">
                                        <div className="font-medium text-slate-200">{cliente?.nombre || 'Desconocido'}</div>
                                        <div className="text-xs text-slate-500">{cliente?.ranking} - Nivel {cliente?.nivelPrioridad}</div>
                                    </td>
                                    <td className="py-4 px-6 font-mono text-blue-400 font-bold text-sm">
                                        {servicio.ambulanciaAsignada}
                                    </td>
                                    <td className="py-4 px-6">
                                        <div className={clsx("flex items-center gap-2 text-sm font-bold", isAlert ? "text-red-400" : "text-slate-300")}>
                                            <Clock size={14} />
                                            {elapsedHrs > 0 ? `${elapsedHrs}h ` : ''}{elapsedMins}m
                                        </div>
                                        {isAlert && <div className="text-[10px] text-red-500 uppercase mt-0.5 font-bold tracking-wider">LÍMITE EXCEDIDO (2.5h)</div>}
                                    </td>
                                    <td className="py-4 px-6">
                                        {cliente?.checklistTemplate ? (
                                            <div className="text-xs text-slate-400 max-w-[220px] whitespace-normal">
                                                <span className="font-bold text-slate-300 block mb-1">Checklist:</span>
                                                <span className="line-clamp-2 leading-relaxed" title={cliente.checklistTemplate.join(', ')}>
                                                    • {cliente.checklistTemplate.join(', ')}
                                                </span>
                                            </div>
                                        ) : (
                                            <span className="text-sm text-slate-500 italic">No requiere validaciones</span>
                                        )}
                                    </td>
                                    <td className="py-4 px-6">
                                        {servicio.estado === 'Finalizado' ? (
                                            <span className="px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                                FINALIZADO
                                            </span>
                                        ) : (
                                            <div className="flex flex-col gap-2">
                                                <span className="px-2.5 py-1 w-fit rounded-md text-xs font-bold uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                                    {servicio.estado}
                                                </span>
                                                <button
                                                    onClick={() => openClosureModal(servicio, cliente)}
                                                    className="mt-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all bg-emerald-600 hover:bg-emerald-500 text-white shadow shadow-emerald-900/20"
                                                    title={"Revisar checklist dinámico para cierre."}
                                                >
                                                    <FileCheck size={14} /> Terminación (Validar)
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            )
                        })}
                        {historial.length === 0 && (
                            <tr>
                                <td colSpan="6" className="py-10 text-center text-slate-500">
                                    No hay servicios en el historial todavía.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>

                {/* Mobile View: Cards */}
                <div className="md:hidden flex flex-col p-4 gap-4">
                    {historial.length === 0 && (
                        <div className="py-10 text-center text-slate-500">No hay servicios en el historial todavía.</div>
                    )}
                    {historial.sort((a, b) => new Date(b.asignadoAt) - new Date(a.asignadoAt)).map(servicio => {
                        const cliente = getClienteById(servicio.clienteId);

                        // Calculate SLA Breach
                        const assignedAtDate = new Date(servicio.asignadoAt);
                        const elapsedMs = now - assignedAtDate.getTime();
                        const isAlert = elapsedMs > SLA_LIMIT_MS && servicio.estado !== 'Finalizado';

                        // Format Elapsed Time
                        const elapsedHrs = Math.floor(elapsedMs / (1000 * 60 * 60));
                        const elapsedMins = Math.floor((elapsedMs % (1000 * 60 * 60)) / (1000 * 60));

                        return (
                            <div key={servicio.id} className={clsx("bg-dark-900 border border-slate-700/50 p-4 rounded-xl flex flex-col gap-3 shadow-sm", isAlert ? "border-red-900/50 bg-red-950/20" : "")}>
                                <div className="flex justify-between items-start mb-1">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            {isAlert && <AlertTriangle size={14} className="text-red-500 animate-pulse" />}
                                            <span className="font-mono text-sm font-bold text-white tracking-wider">{servicio.id}</span>
                                            {servicio.estado === 'Finalizado' ? (
                                                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Finalizado</span>
                                            ) : (
                                                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/20">{servicio.estado}</span>
                                            )}
                                        </div>
                                        <div className="font-bold text-slate-200 line-clamp-1">{cliente?.nombre || 'Desconocido'}</div>
                                        <div className="text-xs text-slate-500">{cliente?.ranking} - Nivel {cliente?.nivelPrioridad}</div>
                                    </div>
                                    <div className="text-right flex flex-col items-end">
                                        <div className="text-[10px] text-slate-500 mb-0.5 uppercase tracking-wider font-bold">Móvil</div>
                                        <span className="font-mono font-black text-blue-400">{servicio.ambulanciaAsignada}</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2 text-xs border-t border-slate-800 pt-3">
                                    <div className={clsx("p-2 rounded-lg border", isAlert ? "bg-red-950/40 border-red-900/50" : "bg-slate-800/30 border-slate-700/50")}>
                                        <div className={clsx("uppercase tracking-wider font-bold mb-1 text-[10px]", isAlert ? "text-red-400/80" : "text-slate-500")}>Transcurrido</div>
                                        <div className={clsx("flex items-center gap-1.5 font-bold font-mono text-sm", isAlert ? "text-red-400" : "text-slate-300")}>
                                            <Clock size={12} />
                                            {elapsedHrs > 0 ? `${elapsedHrs}h ` : ''}{elapsedMins}m
                                        </div>
                                        {isAlert && <div className="text-[10px] text-red-500 uppercase mt-0.5 font-bold tracking-wider">Límite 2.5h</div>}
                                    </div>

                                    <div className="flex flex-col justify-end">
                                        {servicio.estado !== 'Finalizado' && (
                                            <button
                                                onClick={() => openClosureModal(servicio, cliente)}
                                                className="w-full h-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-md font-bold transition-all bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-900/20"
                                            >
                                                <FileCheck size={14} /> Validar Cierre
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            {closureModalData.isOpen && (
                <ServiceClosureModal
                    isOpen={closureModalData.isOpen}
                    onClose={() => setClosureModalData({ isOpen: false, servicio: null, cliente: null })}
                    servicio={closureModalData.servicio}
                    cliente={closureModalData.cliente}
                    onCerrarServicio={closeService}
                />
            )}
        </div>
    );
};

export default HistoryView;
