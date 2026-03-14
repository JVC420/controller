import React, { useState, useEffect, useRef } from 'react';
import { X, Save, Building2, Tag, ShieldAlert, Plus, Trash2, FileText, Stethoscope } from 'lucide-react';

// ── Catalog of available services ─────────────────────────────────────────────
const SERVICIOS_CATALOGO = [
    'TAB SENCILLO',
    'TAB REDONDO',
    'TAB DE 25 HASTA 300K',
    'TAB MAYOR A DE 300K',
    'TAB HORA DE ESPERA',
    'TAB FALLIDO',
    'TAM SENCILLO',
    'TAM REDONDO',
    'TAM DE 25 HASTA 300K',
    'TAM MAYOR A DE 300K',
    'TAM HORA DE ESPERA',
    'TAM FALLIDO',
    'TAM NEONATAL SENCILLO',
    'TAM NEONATAL REDONDO',
    'TAM NEONATAL DE 25 HASTA 300K',
    'TAM NEONATAL MAYOR A DE 300K',
    'TAM NEONATAL HORA DE ESPERA',
    'TAM NEONATAL FALLIDO',
];

const EMPTY_FORM = {
    nombre: '', nit: '', telefono: '', direccion: '', contacto: '',
    tipo: 'EPS / Convenio',
    ranking: 'Estándar', nivelPrioridad: 3, sla: '60 min', colorBadge: 'bg-gray-500',
    servicios: [],         // string[]
    documentos: [],        // string[]
};

const Field = ({ label, children }) => (
    <div className="space-y-1.5">
        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">{label}</label>
        {children}
    </div>
);

const inputCls = "w-full bg-dark-900 border border-slate-600 rounded-lg py-2.5 px-3 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors";

const NewClientModal = ({ isOpen, onClose, onSubmit, initialData = null, getNextClientId }) => {
    const [formData, setFormData] = useState(EMPTY_FORM);
    const [newDoc, setNewDoc] = useState('');

    // Only reset the form when the modal OPENS (false → true).
    // DO NOT include initialData in deps — Firestore's onSnapshot creates new
    // object references every tick, which would reset the form while typing.
    const prevOpenRef = useRef(false);
    useEffect(() => {
        if (isOpen && !prevOpenRef.current) {
            // Modal just opened — read initialData at this moment
            setFormData(initialData
                ? { ...EMPTY_FORM, ...initialData, servicios: initialData.servicios || [], documentos: initialData.documentos || [] }
                : { ...EMPTY_FORM }
            );
            setNewDoc('');
        }
        prevOpenRef.current = isOpen;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]); // intentionally omit initialData

    if (!isOpen) return null;

    const isEditing = !!initialData;

    const toggleServicio = (s) => {
        setFormData(f => ({
            ...f,
            servicios: f.servicios.includes(s)
                ? f.servicios.filter(x => x !== s)
                : [...f.servicios, s],
        }));
    };

    const addDoc = () => {
        const d = newDoc.trim();
        if (!d || formData.documentos.includes(d)) return;
        setFormData(f => ({ ...f, documentos: [...f.documentos, d] }));
        setNewDoc('');
    };

    const removeDoc = (doc) => setFormData(f => ({ ...f, documentos: f.documentos.filter(d => d !== doc) }));

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.nombre) return;
        const payload = isEditing
            ? { ...formData }
            : { id: getNextClientId(), ...formData };
        onSubmit(payload);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-dark-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-dark-800 border border-slate-700 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-700 flex justify-between items-center bg-dark-900/50 shrink-0">
                    <div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <Building2 size={18} className="text-blue-400" />
                            {isEditing ? `Editar: ${initialData.nombre}` : 'Nuevo Cliente'}
                        </h2>
                        <p className="text-xs text-slate-400 mt-0.5">Administración Contractual</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="overflow-y-auto flex-1">
                    <div className="p-6 space-y-5">

                        {/* Basic info */}
                        <Field label="Razón Social / Nombre *">
                            <input required value={formData.nombre}
                                maxLength={100}
                                onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                                placeholder="Ej: Clínica Los Cobos" className={inputCls} />
                        </Field>

                        <div className="grid grid-cols-2 gap-4">
                            <Field label="NIT / Identificación">
                                <input value={formData.nit}
                                    maxLength={20}
                                    onChange={e => setFormData({ ...formData, nit: e.target.value })}
                                    placeholder="Opcional" className={inputCls} />
                            </Field>
                            <Field label="Teléfono">
                                <input value={formData.telefono}
                                    maxLength={15}
                                    inputMode="numeric"
                                    onChange={e => {
                                        const val = e.target.value.replace(/[^0-9]/g, '');
                                        setFormData({ ...formData, telefono: val });
                                    }}
                                    placeholder="Teléfono" className={inputCls} />
                            </Field>
                            <Field label="Dirección">
                                <input value={formData.direccion}
                                    maxLength={150}
                                    onChange={e => setFormData({ ...formData, direccion: e.target.value })}
                                    placeholder="Dirección principal" className={inputCls} />
                            </Field>
                            <Field label="Persona de Contacto">
                                <input value={formData.contacto}
                                    maxLength={80}
                                    onChange={e => setFormData({ ...formData, contacto: e.target.value })}
                                    placeholder="Ej: Dra. García" className={inputCls} />
                            </Field>
                        </div>

                        {/* Contract type + ranking */}
                        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-700/50">
                            <Field label="Tipo de Contrato">
                                <select value={formData.tipo}
                                    onChange={e => setFormData({ ...formData, tipo: e.target.value })}
                                    className={inputCls + ' appearance-none cursor-pointer'}>
                                    <option>EPS / Convenio</option>
                                    <option>Clínica Nivel IV</option>
                                    <option>Pago Directo</option>
                                    <option>Aseguradora SOAT</option>
                                </select>
                            </Field>
                            <Field label="Ranking SLA">
                                <select value={formData.ranking}
                                    onChange={e => {
                                        const ranking = e.target.value;
                                        const map = {
                                            VIP: { color: 'bg-yellow-500', nivel: 1, sla: '15 min' },
                                            'Estratégico': { color: 'bg-purple-500', nivel: 2, sla: '30 min' },
                                            'Estándar': { color: 'bg-gray-500', nivel: 3, sla: 'Sujeto a disp.' },
                                        };
                                        const { color, nivel, sla } = map[ranking] || map['Estándar'];
                                        setFormData(f => ({ ...f, ranking, colorBadge: color, nivelPrioridad: nivel, sla }));
                                    }}
                                    className={inputCls + ' appearance-none cursor-pointer'}>
                                    <option>Estándar</option>
                                    <option>Estratégico</option>
                                    <option>VIP</option>
                                </select>
                            </Field>
                        </div>

                        {/* ── Services ──────────────────────────────────────────────── */}
                        <div className="pt-4 border-t border-slate-700/50 space-y-3">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                <Stethoscope size={13} className="text-blue-400" /> Servicios Contratados
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                {SERVICIOS_CATALOGO.map(s => (
                                    <label key={s} className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border cursor-pointer transition-colors text-sm select-none ${formData.servicios.includes(s)
                                        ? 'bg-blue-900/30 border-blue-600/60 text-blue-300'
                                        : 'bg-dark-900 border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-300'
                                        }`}>
                                        <input type="checkbox" className="hidden"
                                            checked={formData.servicios.includes(s)}
                                            onChange={() => toggleServicio(s)} />
                                        <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${formData.servicios.includes(s) ? 'border-blue-500 bg-blue-600' : 'border-slate-600'
                                            }`}>
                                            {formData.servicios.includes(s) && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                                        </span>
                                        {s}
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* ── Required Documents ────────────────────────────────────── */}
                        <div className="pt-4 border-t border-slate-700/50 space-y-3">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                <FileText size={13} className="text-emerald-400" /> Documentos Requeridos para Cierre de Servicio
                            </label>
                            {formData.documentos.length > 0 && (
                                <ul className="space-y-1.5">
                                    {formData.documentos.map(doc => (
                                        <li key={doc} className="flex items-center justify-between bg-dark-900 border border-slate-700 rounded-lg px-3 py-2">
                                            <span className="text-sm text-slate-300 flex items-center gap-2">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                                                {doc}
                                            </span>
                                            <button type="button" onClick={() => removeDoc(doc)}
                                                className="text-slate-600 hover:text-red-400 transition-colors ml-2 shrink-0">
                                                <Trash2 size={14} />
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                            {formData.documentos.length === 0 && (
                                <p className="text-xs text-slate-600 italic">Aún no hay documentos configurados para este cliente.</p>
                            )}
                            <div className="flex gap-2">
                                <input value={newDoc} onChange={e => setNewDoc(e.target.value)}
                                    maxLength={80}
                                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addDoc())}
                                    placeholder="Ej: Historia Clínica, Remisión médica, RIPS..."
                                    className="flex-1 bg-dark-900 border border-slate-600 rounded-lg py-2 px-3 text-white text-sm focus:outline-none focus:border-emerald-500 transition-colors" />
                                <button type="button" onClick={addDoc}
                                    className="px-3 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-sm font-bold flex items-center gap-1.5 transition-colors shrink-0">
                                    <Plus size={15} /> Añadir
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-4 border-t border-slate-700 bg-dark-900/40 shrink-0">
                        <button type="submit"
                            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-4 rounded-lg flex justify-center items-center gap-2 transition-colors shadow-lg shadow-emerald-900/20">
                            <Save size={18} /> {isEditing ? 'Guardar Cambios' : 'Crear Cliente'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default NewClientModal;
