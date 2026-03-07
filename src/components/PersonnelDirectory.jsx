import React from 'react';
import { Search, Edit2, UserX, UserCheck, CheckCircle } from 'lucide-react';
import { clsx } from 'clsx';
import { EmpEstadoBadge } from './ui/Badge';

const PersonnelDirectory = ({
    filteredEmpleados,
    empSearch,
    setEmpSearch,
    showInactive,
    setShowInactive,
    onEditEmpleado
}) => {
    return (
        <div className="bg-dark-800 border border-slate-700 rounded-xl shadow-md lg:shadow-2xl">
            {/* Search and Filters */}
            <div className="p-4 border-b border-slate-700 bg-dark-900/50 flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="relative w-full md:w-96">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input type="text" placeholder="Buscar por nombre o cédula..."
                        className="w-full bg-dark-900 border border-slate-700 rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                        value={empSearch} onChange={e => setEmpSearch(e.target.value)} />
                </div>
                <div className="w-full md:w-auto flex items-center justify-between gap-4">
                    <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer hover:text-white transition-colors">
                        <input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)}
                            className="rounded border-slate-700 bg-dark-900 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-dark-900" />
                        Mostrar Inactivos
                    </label>
                    <span className="text-xs font-bold text-slate-500 bg-dark-900 px-2.5 py-1 rounded-md border border-slate-700">
                        Total: {filteredEmpleados.length}
                    </span>
                </div>
            </div>

            <div className="overflow-x-auto">
                {/* Desktop View: Table */}
                <table className="w-full text-left border-collapse whitespace-nowrap hidden md:table">
                    <thead className="sticky top-0 bg-dark-900/95 backdrop-blur z-10">
                        <tr className="text-slate-400 text-xs uppercase tracking-wider border-b border-slate-700">
                            <th className="py-4 px-4 font-semibold">Perfil</th>
                            <th className="py-4 px-4 font-semibold">Cédula</th>
                            <th className="py-4 px-4 font-semibold">Cargo</th>
                            <th className="py-4 px-4 font-semibold">Estado</th>
                            <th className="py-4 px-4 font-semibold text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50">
                        {filteredEmpleados.length === 0 && (
                            <tr><td colSpan="5" className="py-12 text-center text-slate-500 text-sm">No se encontraron empleados.</td></tr>
                        )}
                        {filteredEmpleados.map(emp => (
                            <tr key={emp.id} className={clsx("hover:bg-slate-700/30 transition-colors", emp.estado !== 'Activo' && "opacity-60")}>
                                <td className="py-3 px-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-full bg-dark-900 border border-slate-600 flex items-center justify-center font-bold text-emerald-500 uppercase">
                                            {(emp.nombre || '?').charAt(0)}
                                        </div>
                                        <div>
                                            <div className="font-bold text-slate-200">{emp.nombre || 'Desconocido'}</div>
                                            <div className="text-[10px] text-slate-500 font-mono tracking-wider">{emp.id}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="py-3 px-4 font-mono text-slate-400 text-sm">{emp.cedula}</td>
                                <td className="py-3 px-4 text-slate-300 font-medium">{emp.cargo}</td>
                                <td className="py-3 px-4">
                                    <EmpEstadoBadge estado={emp.estado} />
                                </td>
                                <td className="py-3 px-4 text-right">
                                    <button onClick={() => onEditEmpleado(emp)}
                                        className="text-slate-400 hover:text-emerald-400 bg-slate-800 hover:bg-emerald-500/10 p-2 rounded-lg transition-colors border border-transparent hover:border-emerald-500/30 inline-flex items-center justify-center">
                                        <Edit2 size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* Mobile View: Cards */}
                <div className="md:hidden flex flex-col p-4 gap-3">
                    {filteredEmpleados.length === 0 && (
                        <div className="py-12 text-center text-slate-500 text-sm">No se encontraron empleados.</div>
                    )}
                    {filteredEmpleados.map(emp => (
                        <div key={emp.id} className={clsx("bg-dark-900 border border-slate-700 p-4 rounded-xl flex items-start gap-4 shadow-sm", emp.estado !== 'Activo' && "opacity-70")}>
                            <div className="w-12 h-12 rounded-full bg-dark-800 border-2 border-slate-600 flex items-center justify-center font-bold text-emerald-500 uppercase text-xl shrink-0">
                                {(emp.nombre || '?').charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start mb-1">
                                    <h3 className="font-bold text-slate-100 truncate pr-2">{emp.nombre || 'Desconocido'}</h3>
                                    <EmpEstadoBadge estado={emp.estado} />
                                </div>
                                <p className="text-sm font-medium text-emerald-400 mb-0.5">{emp.cargo}</p>
                                <p className="text-xs font-mono text-slate-500 mb-3">{emp.cedula}</p>
                                <div className="flex justify-end border-t border-slate-800 pt-3">
                                    <button onClick={() => onEditEmpleado(emp)}
                                        className="text-slate-400 hover:text-emerald-400 bg-slate-800 p-2 rounded-lg transition-colors border border-slate-700 flex items-center gap-2 text-sm font-semibold px-4">
                                        <Edit2 size={14} /> Editar
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default PersonnelDirectory;
