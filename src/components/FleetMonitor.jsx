import React, { useState } from 'react';
import AmbulanceCard from './AmbulanceCard';
import NewAmbulanceModal from './NewAmbulanceModal';
import { useAuth } from '../contexts/AuthContext';

const FleetMonitor = ({ flota, onAddAmbulance, onAddRequest, onStatusChange }) => {
    const { role } = useAuth();
    const [isAmbulanceModalOpen, setIsAmbulanceModalOpen] = useState(false);
    const canManageFleet = role === 'administrador_general';

    // Group fleet by status
    const disponibles = flota.filter(a => a.estado === 'Disponible');
    const enServicio = flota.filter(a => a.estado === 'En Servicio');
    const fueraDeServicio = flota.filter(a => a.estado === 'Fuera de Servicio');

    return (
        <div className="flex-1 p-6 overflow-y-auto bg-dark-900 h-screen flex flex-col">
            <header className="mb-8 flex flex-col md:flex-row justify-between md:items-end gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">Monitor de Flota y Asignación</h1>
                    <p className="text-slate-400 mt-1">Arrastra una solicitud de triage hacia una ambulancia disponible para despachar.</p>
                </div>
                <div className="flex flex-col md:flex-row items-end gap-4">
                    <div className="flex gap-2">
                        <button
                            onClick={onAddRequest}
                            className="px-3 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm text-white font-bold transition-colors cursor-pointer shadow-lg shadow-blue-900/20"
                        >
                            Crear Solicitud
                        </button>
                        {canManageFleet && <button
                            onClick={() => setIsAmbulanceModalOpen(true)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-sm text-white font-bold transition-colors cursor-pointer shadow-lg shadow-emerald-900/20"
                        >
                            Nueva Ambulancia
                        </button>}
                    </div>
                    <div className="flex gap-2 lg:gap-4">
                        <StatBox label="Disponibles" count={disponibles.length} color="text-emerald-400" />
                        <StatBox label="En Servicio" count={enServicio.length} color="text-blue-400" />
                        <StatBox label="Fuera" count={fueraDeServicio.length} color="text-red-400" />
                    </div>
                </div>
            </header>

            <div className="flex-1 space-y-8">
                <FleetSection title="Ambulancias Disponibles" color="text-emerald-400" count={disponibles.length}>
                    {disponibles.map(amb => (
                        <AmbulanceCard key={amb.id} ambulance={amb} onStatusChange={onStatusChange} />
                    ))}
                    {disponibles.length === 0 && (
                        <div className="col-span-full py-10 text-center border-2 border-dashed border-slate-700 rounded-xl text-slate-400">
                            No hay ambulancias disponibles en este momento.
                        </div>
                    )}
                </FleetSection>

                <FleetSection title="En Servicio" color="text-blue-400" count={enServicio.length}>
                    {enServicio.map(amb => (
                        <AmbulanceCard key={amb.id} ambulance={amb} onStatusChange={onStatusChange} />
                    ))}
                </FleetSection>

                <FleetSection title="Fuera de Servicio / Mantenimiento" color="text-slate-500" count={fueraDeServicio.length}>
                    {fueraDeServicio.map(amb => (
                        <AmbulanceCard key={amb.id} ambulance={amb} onStatusChange={onStatusChange} />
                    ))}
                </FleetSection>
            </div>
            <NewAmbulanceModal isOpen={isAmbulanceModalOpen} onClose={() => setIsAmbulanceModalOpen(false)} onSubmit={onAddAmbulance} />
        </div>
    );
};

const StatBox = ({ label, count, color }) => (
    <div className="bg-dark-800 border border-slate-700 rounded-lg px-4 py-2 flex items-center gap-3">
        <span className="text-sm font-medium text-slate-400">{label}</span>
        <span className={`text-xl font-bold ${color}`}>{count}</span>
    </div>
);

const FleetSection = ({ title, color, count, children }) => (
    <section>
        <div className="flex items-center gap-3 mb-4">
            <h2 className="text-lg font-semibold text-white">{title}</h2>
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold bg-dark-800 border border-slate-700 ${color}`}>
                {count}
            </span>
            <div className="flex-1 h-px bg-slate-800 ml-2"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {children}
        </div>
    </section>
);

export default FleetMonitor;
