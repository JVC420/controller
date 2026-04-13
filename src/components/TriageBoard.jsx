import React, { useMemo, useState } from 'react';
import RequestCard from './RequestCard';
import { AlertCircle } from 'lucide-react';

const TriageBoard = ({ solicitudes, getClienteById, onEditRequest }) => {
    const [selectedClientId, setSelectedClientId] = useState('');
    const [patientQuery, setPatientQuery] = useState('');

    const clientOptions = useMemo(() => {
        const map = new Map();
        solicitudes.forEach((s) => {
            const id = s?.clienteId;
            if (!id || map.has(id)) return;
            const client = getClienteById(id);
            map.set(id, {
                id,
                nombre: client?.nombre || id,
            });
        });

        return Array.from(map.values()).sort((a, b) => a.nombre.localeCompare(b.nombre));
    }, [solicitudes, getClienteById]);

    // Auto-Sorting Logic: First by Nivel Prioridad (Ascending 1->3), then by Waiting Time (Descending)
    const sortedSolicitudes = useMemo(() => {
        const query = patientQuery.trim().toLowerCase();
        return solicitudes
            .filter((s) => {
                if (selectedClientId && s?.clienteId !== selectedClientId) return false;
                if (!query) return true;
                const patientName = String(s?.pacienteInfo?.nombre || s?.paciente || '').toLowerCase();
                return patientName.includes(query);
            })
            .sort((a, b) => {
            const clientA = getClienteById(a.clienteId);
            const clientB = getClienteById(b.clienteId);

            const priorityA = clientA ? clientA.nivelPrioridad : 99;
            const priorityB = clientB ? clientB.nivelPrioridad : 99;

            if (priorityA !== priorityB) {
                return priorityA - priorityB; // Lower number means higher priority
            }

            // If same priority, sort by wait time descending
            return b.tiempoEsperaMin - a.tiempoEsperaMin;
            });
            }, [solicitudes, selectedClientId, patientQuery, getClienteById]);

            const useCompactCards = sortedSolicitudes.length > 5;

    return (
        <div className="w-full lg:w-80 xl:w-96 bg-dark-900 lg:border-r border-b lg:border-b-0 border-slate-700 h-[50vh] lg:h-full flex flex-col pt-4 lg:pt-6 pb-2 relative z-10 shadow-lg lg:shadow-2xl mt-16 lg:mt-0">
            <div className="px-5 mb-4 flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                        Bandeja de Triage
                        <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                            {sortedSolicitudes.length}
                        </span>
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">Ordenado por Prioridad y SLA</p>
                </div>
            </div>

            <div className="px-5 mb-2 flex flex-col gap-2">
                <input
                    type="text"
                    value={patientQuery}
                    onChange={(e) => setPatientQuery(e.target.value)}
                    placeholder="Buscar por paciente..."
                    className="w-full bg-dark-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:border-blue-500 outline-none"
                />
                <select
                    value={selectedClientId}
                    onChange={(e) => setSelectedClientId(e.target.value)}
                    className="w-full bg-dark-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:border-blue-500 outline-none"
                >
                    <option value="">Todos los clientes</option>
                    {clientOptions.map((c) => (
                        <option key={c.id} value={c.id}>{c.nombre}</option>
                    ))}
                </select>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-2 space-y-4">
                {sortedSolicitudes.length > 0 ? (
                    sortedSolicitudes.map(request => (
                        <RequestCard
                            key={request.id}
                            request={request}
                            client={getClienteById(request.clienteId)}
                            onEdit={onEditRequest}
                            compact={useCompactCards}
                        />
                    ))
                ) : (
                    <div className="flex flex-col items-center justify-center h-40 text-slate-500 gap-2 border-2 border-dashed border-slate-700 rounded-xl mx-1">
                        <AlertCircle size={32} className="text-slate-600" />
                        <p className="text-sm font-medium">No hay solicitudes pendientes</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TriageBoard;
