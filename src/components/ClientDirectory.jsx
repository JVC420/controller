import React, { useState } from 'react';
import { Building2, Search, Star, Clock, FileText, Stethoscope, Edit2, ChevronDown, ChevronUp } from 'lucide-react';
import { clsx } from 'clsx';
import NewClientModal from './NewClientModal';

const ClientDirectory = ({ clientes, onCreateClient, onUpdateClient }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editTarget, setEditTarget] = useState(null); // client being edited
    const [search, setSearch] = useState('');

    const filtered = clientes.filter(c =>
        !search || c.nombre?.toLowerCase().includes(search.toLowerCase()) || c.nit?.includes(search)
    );

    const openNew = () => { setEditTarget(null); setIsModalOpen(true); };
    const openEdit = (c) => { setEditTarget(c); setIsModalOpen(true); };

    const handleSubmit = (payload) => {
        if (editTarget) {
            onUpdateClient?.(payload);
        } else {
            onCreateClient?.(payload);
        }
    };

    return (
        <div className="flex-1 p-6 overflow-y-auto bg-dark-900 h-screen flex flex-col">
            <header className="mb-8 flex justify-between items-end">
                <div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">Directorio de Clientes</h1>
                    <p className="text-slate-400 mt-1">Servicios contratados, documentación y SLA por cliente.</p>
                </div>
                <button onClick={openNew}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 px-4 rounded-lg transition-colors flex items-center gap-2">
                    + Nuevo Cliente
                </button>
            </header>

            <div className="mb-6 flex gap-4 items-center">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <input value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="Buscar por nombre o NIT..."
                        className="w-full bg-dark-800 border border-slate-700 rounded-lg py-2.5 pl-10 pr-4 text-white focus:outline-none focus:border-blue-500 transition-all text-sm" />
                </div>
                <div className="bg-dark-800 border border-slate-700 rounded-lg px-4 py-2.5 text-sm font-medium text-slate-300">
                    {filtered.length} de {clientes.length} cliente(s)
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filtered.map(cliente => (
                    <ClientCard key={cliente.id} cliente={cliente} onEdit={() => openEdit(cliente)} />
                ))}
                {filtered.length === 0 && (
                    <div className="col-span-3 py-16 text-center text-slate-500">
                        {search ? 'No se encontraron clientes que coincidan.' : 'No hay clientes registrados.'}
                    </div>
                )}
            </div>

            <NewClientModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSubmit={handleSubmit}
                initialData={editTarget}
            />
        </div>
    );
};

// ── Client Card ──────────────────────────────────────────────────────────────
const ClientCard = ({ cliente, onEdit }) => {
    const [showDocs, setShowDocs] = useState(false);
    const docs = cliente.documentos || [];
    const servicios = cliente.servicios || [];

    return (
        <div className="bg-dark-800 border border-slate-700 rounded-xl flex flex-col h-full relative overflow-hidden group hover:border-slate-500 transition-colors">
            {/* Top accent */}
            <div className={clsx('absolute top-0 left-0 right-0 h-0.5 opacity-80', cliente.colorBadge)} />

            {/* Header */}
            <div className="p-5 pb-3">
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-dark-900 rounded-lg text-slate-300 border border-slate-700">
                            <Building2 size={22} />
                        </div>
                        <div>
                            <span className="text-xs font-mono font-bold text-slate-500">{cliente.id}</span>
                            <h3 className="text-base font-bold text-white leading-snug">{cliente.nombre}</h3>
                        </div>
                    </div>
                    <button onClick={onEdit}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-700 transition-colors shrink-0 ml-2">
                        <Edit2 size={14} />
                    </button>
                </div>

                {/* Contact info */}
                {(cliente.nit || cliente.telefono || cliente.contacto) && (
                    <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs border-y border-slate-700/50 py-3">
                        {cliente.nit && <span className="text-slate-500">NIT: <span className="text-slate-300">{cliente.nit}</span></span>}
                        {cliente.telefono && <span className="text-slate-500">Tel: <span className="text-slate-300">{cliente.telefono}</span></span>}
                        {cliente.contacto && <span className="col-span-2 text-slate-500">Contacto: <span className="text-slate-300">{cliente.contacto}</span></span>}
                    </div>
                )}
            </div>

            {/* Tipo + SLA */}
            <div className="px-5 pb-3 flex flex-wrap gap-2 items-center">
                <span className="text-xs bg-dark-900 border border-slate-700 px-2.5 py-1 rounded-full text-slate-400">{cliente.tipo}</span>
                <span className={clsx('text-xs px-2.5 py-1 rounded-full font-bold text-white', cliente.colorBadge || 'bg-gray-500')}>
                    {cliente.ranking}
                </span>
                <span className="flex items-center gap-1 text-xs text-slate-500 ml-auto">
                    <Clock size={11} /> {cliente.sla}
                </span>
            </div>

            {/* ── Services ─────────────────────────────────────────────────── */}
            {servicios.length > 0 && (
                <div className="px-5 pb-3">
                    <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-2">
                        <Stethoscope size={11} className="text-blue-400" /> Servicios
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                        {servicios.map(s => (
                            <span key={s} className="text-[11px] bg-blue-900/25 text-blue-300 border border-blue-700/30 px-2 py-0.5 rounded-md">
                                {s}
                            </span>
                        ))}
                    </div>
                </div>
            )}
            {servicios.length === 0 && (
                <div className="px-5 pb-3 text-xs text-slate-600 italic flex items-center gap-1.5">
                    <Stethoscope size={11} /> Sin servicios configurados
                </div>
            )}

            {/* ── Documents ────────────────────────────────────────────────── */}
            <div className="px-5 pb-4 mt-auto border-t border-slate-700/50 pt-3">
                <button onClick={() => setShowDocs(v => !v)}
                    className="w-full flex items-center justify-between text-[10px] uppercase font-bold text-slate-500 tracking-wider hover:text-slate-300 transition-colors">
                    <span className="flex items-center gap-1.5">
                        <FileText size={11} className="text-emerald-400" />
                        Documentos Requeridos
                        <span className={clsx('ml-1 px-1.5 py-0.5 rounded text-white text-[10px] font-bold',
                            docs.length > 0 ? 'bg-emerald-700' : 'bg-slate-700')}>
                            {docs.length}
                        </span>
                    </span>
                    {docs.length > 0 && (showDocs ? <ChevronUp size={13} /> : <ChevronDown size={13} />)}
                </button>

                {showDocs && docs.length > 0 && (
                    <ul className="mt-2 space-y-1">
                        {docs.map((doc, i) => (
                            <li key={i} className="flex items-center gap-2 text-xs text-slate-400">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0" />
                                {doc}
                            </li>
                        ))}
                    </ul>
                )}
                {docs.length === 0 && (
                    <p className="mt-1 text-xs text-slate-600 italic">Sin documentos configurados — haz clic en editar.</p>
                )}
            </div>
        </div>
    );
};

export default ClientDirectory;
