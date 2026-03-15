import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Send, ClipboardList, Ambulance } from 'lucide-react';
import { collection, getDocs, limit, query, where } from 'firebase/firestore';
import { db } from '../firebase/config';

const TAB_ITEMS = [
    { id: 'order', label: 'Orden de Servicio', icon: <ClipboardList size={15} /> },
    { id: 'transfer', label: 'Traslado', icon: <Ambulance size={15} /> },
];

const INITIAL_FORM_DATA = {
    clienteId: '',

    // TAB 1 - Paciente
    idPacienteHC: '',
    tipoIdentidad: '',
    paciente: '',
    sexo: '',
    fechaNacimiento: '',
    edad: '',
    tipoEdad: '',

    // Solicitante
    idSolicitante: '',
    solicitante: '',
    observacionesSolicita: '',

    // Entidad
    idEntidad: '',
    entidadSolicitante: '',
    nombreEntidad: '',
    idSucursal: '',
    nombreSucursal: '',
    codSucursal: '',
    sucursal: '',

    // Informacion del servicio
    codComplejidad: '',
    complejidad: '',
    codTipoHorario: '',
    tipoHorario: '',

    // Autorizaciones
    confirma: '',
    numerosAutorizacionAdicionales: '',

    // Observaciones
    observaciones: '',

    // Informacion de autorizacion
    numeroAutorizacion: '',
    copagoValor: '',
    servicioParticularValor: '',
    servicioProgramado: '',
    servicioSolicitado: '',
    numOrden: '',

    // Opciones
    recordTraslado: false,
    especial: false,

    // Auditoria
    codUsuarioElabora: '',
    elaboradoPor: '',
    ingresadoSistemaPor: '',
    estado: 'Pendiente',

    // TAB 2 - Diagnostico
    codCIE: '',
    buscarCIE: '',
    observacionesCIE: '',

    // Estado clinico
    estadoClinicoActual: '',

    // Origen
    idOrigen: '',
    descripcionOrigen: '',
    ubicacionObsOrigen: '',
    direccionOrigen: '',
    ciudadOrigen: '',
    telefonoOrigen: '',
    fechaHoraContacto: '',
    fechaHoraSaleOrigen: '',

    // Destino 1
    idDestino1: '',
    descripcionDestino1: '',
    ubicacionObsDestino1: '',
    direccionDestino1: '',
    ciudadDestino1: '',
    telefonoDestino1: '',
    fechaHoraEntregaD1: '',
    fechaHoraSaleD1: '',

    // Destino 2
    idDestino2: '',
    descripcionDestino2: '',
    ubicacionObsDestino2: '',
    direccionDestino2: '',
    ciudadDestino2: '',
    telefonoDestino2: '',
    fechaHoraEntregaD2: '',
    fechaHoraSaleD2: '',

};

const baseFieldClass =
    'w-full bg-dark-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-[13px] text-white focus:outline-none focus:border-blue-500';

const sectionClass = 'rounded-xl border border-slate-700/60 bg-dark-900/50 p-3 md:p-4';

const calculateAge = (birthDate) => {
    if (!birthDate) return { edad: '', tipoEdad: '' };

    const now = new Date();
    const birth = new Date(`${birthDate}T00:00:00`);
    if (Number.isNaN(birth.getTime())) return { edad: '', tipoEdad: '' };

    const diffMs = now.getTime() - birth.getTime();
    if (diffMs < 0) return { edad: '', tipoEdad: '' };

    const dayMs = 24 * 60 * 60 * 1000;
    const totalDays = Math.floor(diffMs / dayMs);

    if (totalDays < 30) {
        return { edad: String(totalDays), tipoEdad: 'Días' };
    }

    if (totalDays < 365) {
        const months = Math.max(1, Math.floor(totalDays / 30));
        return { edad: String(months), tipoEdad: 'Meses' };
    }

    const years = Math.max(1, Math.floor(totalDays / 365.25));
    return { edad: String(years), tipoEdad: 'Años' };
};

const FormSection = ({ title, children, className = '' }) => (
    <section className={`${sectionClass} ${className}`}>
        <h3 className="text-xs md:text-sm font-bold text-slate-200 mb-2.5 tracking-wide">{title}</h3>
        {children}
    </section>
);

const FormInput = ({
    label,
    value,
    onChange,
    type = 'text',
    placeholder = '',
    disabled = false,
    className = '',
    onKeyDown,
    readOnly = false,
}) => (
    <div className={className}>
        <label className="block text-[11px] font-semibold text-slate-400 mb-1">{label}</label>
        <input
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            readOnly={readOnly}
            className={`${baseFieldClass} ${(disabled || readOnly) ? 'opacity-60 cursor-not-allowed' : ''}`}
        />
    </div>
);

const FormSelect = ({ label, value, onChange, options, placeholder = 'Seleccione...' }) => (
    <div>
        <label className="block text-[11px] font-semibold text-slate-400 mb-1">{label}</label>
        <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={baseFieldClass}
        >
            <option value="">{placeholder}</option>
            {options.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
        </select>
    </div>
);

const FormDateTime = ({ label, value, onChange }) => (
    <div>
        <label className="block text-[11px] font-semibold text-slate-400 mb-1">{label}</label>
        <input
            type="datetime-local"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={baseFieldClass}
        />
    </div>
);

const FormTextarea = ({ label, value, onChange, rows = 3 }) => (
    <div>
        <label className="block text-[11px] font-semibold text-slate-400 mb-1">{label}</label>
        <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            rows={rows}
            className={`${baseFieldClass} resize-y`}
        />
    </div>
);

const CheckboxField = ({ label, checked, onChange }) => (
    <label className="inline-flex items-center gap-2 text-[13px] text-slate-200 cursor-pointer">
        <input
            type="checkbox"
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
            className="h-4 w-4 rounded border-slate-500 bg-dark-900 text-blue-500 focus:ring-blue-500"
        />
        {label}
    </label>
);

const Tabs = ({ activeTab, setActiveTab }) => (
    <div className="flex gap-1 border-b border-slate-700/70 pb-px overflow-x-auto hide-scrollbar">
        {TAB_ITEMS.map((tab) => (
            <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`whitespace-nowrap px-2.5 md:px-3 py-1.5 text-[11px] md:text-xs font-semibold rounded-t-lg border-b-2 flex items-center gap-1.5 transition-colors ${
                    activeTab === tab.id
                        ? 'text-blue-300 border-blue-500 bg-blue-500/10'
                        : 'text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-800/70'
                }`}
            >
                {tab.icon}
                {tab.label}
            </button>
        ))}
    </div>
);

const OrderTab = ({
    formData,
    setField,
    entityOptions,
    branchOptions,
    selectedBranchValue,
    onEntityChange,
    onBranchChange,
}) => {
    const identityOptions = [
        { value: 'CC', label: 'CC' },
        { value: 'CE', label: 'CE' },
        { value: 'TI', label: 'TI' },
        { value: 'RC', label: 'RC' },
        { value: 'PA', label: 'Pasaporte' },
    ];

    return (
        <div className="space-y-4">
            <FormSection title="Paciente">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3">
                    <FormInput label="Id. Paciente / H.C." value={formData.idPacienteHC} onChange={(v) => setField('idPacienteHC', v)} />
                    <FormSelect label="Tipo Identidad" value={formData.tipoIdentidad} onChange={(v) => setField('tipoIdentidad', v)} options={identityOptions} />
                    <FormInput label="Nombres y Apellidos del Paciente" value={formData.paciente} onChange={(v) => setField('paciente', v)} />
                    <FormSelect
                        label="Sexo"
                        value={formData.sexo}
                        onChange={(v) => setField('sexo', v)}
                        options={[
                            { value: 'Masculino', label: 'Masculino' },
                            { value: 'Femenino', label: 'Femenino' },
                            { value: 'No Definido', label: 'No Definido' },
                        ]}
                    />
                    <FormInput
                        label="Fecha Nacimiento"
                        type="date"
                        value={formData.fechaNacimiento}
                        onChange={(value) => {
                            const ageData = calculateAge(value);
                            setField('fechaNacimiento', value);
                            setField('edad', ageData.edad);
                            setField('tipoEdad', ageData.tipoEdad);
                        }}
                    />
                    <FormInput label="Edad" value={formData.edad} onChange={(v) => setField('edad', v)} />
                    <FormSelect
                        label="Tipo Edad"
                        value={formData.tipoEdad}
                        onChange={(v) => setField('tipoEdad', v)}
                        options={[
                            { value: 'Años', label: 'Años' },
                            { value: 'Meses', label: 'Meses' },
                            { value: 'Días', label: 'Días' },
                        ]}
                    />
                </div>
            </FormSection>

            <FormSection title="Solicitante">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <FormInput label="Id. Solicitante" value={formData.idSolicitante} onChange={(v) => setField('idSolicitante', v)} />
                    <FormInput label="Solicitante" value={formData.solicitante} onChange={(v) => setField('solicitante', v)} />
                    <div className="md:col-span-2">
                        <FormTextarea label="Observaciones Solicita" value={formData.observacionesSolicita} onChange={(v) => setField('observacionesSolicita', v)} />
                    </div>
                </div>
            </FormSection>

            <FormSection title="Entidad">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3">
                    <FormSelect
                        label="Entidad"
                        value={formData.idEntidad}
                        onChange={onEntityChange}
                        options={entityOptions}
                        placeholder="Seleccione una entidad..."
                    />
                    <FormSelect
                        label="Sucursal"
                        value={selectedBranchValue}
                        onChange={onBranchChange}
                        options={branchOptions}
                        placeholder={formData.idEntidad ? 'Seleccione una sucursal...' : 'Primero seleccione una entidad'}
                    />
                    <FormInput label="Nombre Entidad" value={formData.nombreEntidad || formData.entidadSolicitante} onChange={(v) => setField('nombreEntidad', v)} disabled />
                    <FormInput label="Nombre Sucursal" value={formData.nombreSucursal || formData.sucursal} onChange={(v) => setField('nombreSucursal', v)} disabled />
                </div>
            </FormSection>

            <FormSection title="Información del servicio">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3">
                    <FormInput label="Cod. Complejidad" value={formData.codComplejidad} onChange={(v) => setField('codComplejidad', v)} />
                    <FormInput label="Complejidad" value={formData.complejidad} onChange={(v) => setField('complejidad', v)} />
                    <FormInput label="Cod. Tipo Horario" value={formData.codTipoHorario} onChange={(v) => setField('codTipoHorario', v)} />
                    <FormInput label="Tipo Horario" value={formData.tipoHorario} onChange={(v) => setField('tipoHorario', v)} />
                </div>
            </FormSection>

            <FormSection title="Autorizaciones">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <FormSelect
                        label="Confirma"
                        value={formData.confirma}
                        onChange={(v) => setField('confirma', v)}
                        options={[
                            { value: 'Si', label: 'Sí' },
                            { value: 'No', label: 'No' },
                        ]}
                    />
                    <FormInput
                        label="Números de Autorización Adicionales"
                        value={formData.numerosAutorizacionAdicionales}
                        onChange={(v) => setField('numerosAutorizacionAdicionales', v)}
                    />
                </div>
            </FormSection>

            <FormSection title="Observaciones">
                <FormTextarea label="Observaciones" value={formData.observaciones} onChange={(v) => setField('observaciones', v)} rows={4} />
            </FormSection>

            <FormSection title="Información de autorización">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    <FormInput label="Número Autorización" value={formData.numeroAutorizacion} onChange={(v) => setField('numeroAutorizacion', v)} />
                    <FormInput label="Copago Valor" type="number" value={formData.copagoValor} onChange={(v) => setField('copagoValor', v)} />
                    <FormInput label="Servicio Particular Valor" type="number" value={formData.servicioParticularValor} onChange={(v) => setField('servicioParticularValor', v)} />
                    <FormDateTime label="Servicio Programado (Fecha y Hora)" value={formData.servicioProgramado} onChange={(v) => setField('servicioProgramado', v)} />
                    <FormDateTime label="Servicio Solicitado (Fecha y Hora)" value={formData.servicioSolicitado} onChange={(v) => setField('servicioSolicitado', v)} />
                    <FormInput label="Num. Orden" value={formData.numOrden} onChange={(v) => setField('numOrden', v)} />
                </div>
            </FormSection>

            <FormSection title="Opciones">
                <div className="flex flex-wrap gap-6">
                    <CheckboxField label="Record Traslado" checked={formData.recordTraslado} onChange={(v) => setField('recordTraslado', v)} />
                    <CheckboxField label="Especial" checked={formData.especial} onChange={(v) => setField('especial', v)} />
                </div>
            </FormSection>

            <FormSection title="Auditoría">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3">
                    <FormInput label="Cod. Usuario Elabora" value={formData.codUsuarioElabora} onChange={(v) => setField('codUsuarioElabora', v)} />
                    <FormInput label="Elaborado por" value={formData.elaboradoPor} onChange={(v) => setField('elaboradoPor', v)} />
                    <FormInput label="Ingresado al sistema por" value={formData.ingresadoSistemaPor} onChange={(v) => setField('ingresadoSistemaPor', v)} />
                    <FormInput label="Estado" value={formData.estado} onChange={(v) => setField('estado', v)} />
                </div>
            </FormSection>

        </div>
    );
};

const TransferTab = ({ formData, setField, onCieKeyDown, cieLookupState }) => (
    <div className="space-y-4">
        <FormSection title="Diagnóstico">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <FormInput
                    label="Cod. CIE"
                    value={formData.codCIE}
                    onChange={(v) => setField('codCIE', v.toUpperCase())}
                    onKeyDown={onCieKeyDown}
                    placeholder="Escriba el código y presione Enter"
                />
                <FormInput
                    label="Nombre CIE"
                    value={formData.buscarCIE}
                    onChange={(v) => setField('buscarCIE', v)}
                    readOnly
                    placeholder="Se autocompleta al buscar el código"
                />
                <div className="md:col-span-3 min-h-5">
                    {cieLookupState.loading && (
                        <p className="text-xs text-blue-400">Buscando código CIE...</p>
                    )}
                    {!cieLookupState.loading && cieLookupState.error && (
                        <p className="text-xs text-red-400">{cieLookupState.error}</p>
                    )}
                    {!cieLookupState.loading && cieLookupState.success && (
                        <p className="text-xs text-emerald-400">Nombre CIE autocompletado correctamente.</p>
                    )}
                </div>
                <div className="md:col-span-3">
                    <FormTextarea label="Observaciones CIE" value={formData.observacionesCIE} onChange={(v) => setField('observacionesCIE', v)} />
                </div>
            </div>
        </FormSection>

        <FormSection title="Estado clínico">
            <FormTextarea
                label="Estado clínico actual del paciente"
                value={formData.estadoClinicoActual}
                onChange={(v) => setField('estadoClinicoActual', v)}
                rows={4}
            />
        </FormSection>

        <FormSection title="Origen">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3">
                <FormInput label="Id. Origen" value={formData.idOrigen} onChange={(v) => setField('idOrigen', v)} />
                <FormInput label="Descripción Origen" value={formData.descripcionOrigen} onChange={(v) => setField('descripcionOrigen', v)} />
                <FormInput label="Ubicación / Observaciones Origen" value={formData.ubicacionObsOrigen} onChange={(v) => setField('ubicacionObsOrigen', v)} />
                <FormInput label="Dirección Origen" value={formData.direccionOrigen} onChange={(v) => setField('direccionOrigen', v)} />
                <FormInput label="Ciudad Origen" value={formData.ciudadOrigen} onChange={(v) => setField('ciudadOrigen', v)} />
                <FormInput label="Teléfono Origen" value={formData.telefonoOrigen} onChange={(v) => setField('telefonoOrigen', v)} />
                <FormDateTime label="Fecha Hora Contacto" value={formData.fechaHoraContacto} onChange={(v) => setField('fechaHoraContacto', v)} />
                <FormDateTime label="Fecha Hora Sale Origen" value={formData.fechaHoraSaleOrigen} onChange={(v) => setField('fechaHoraSaleOrigen', v)} />
            </div>
        </FormSection>

        <FormSection title="Destino 1">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3">
                <FormInput label="Id. Destino 1" value={formData.idDestino1} onChange={(v) => setField('idDestino1', v)} />
                <FormInput label="Descripción Destino 1" value={formData.descripcionDestino1} onChange={(v) => setField('descripcionDestino1', v)} />
                <FormInput label="Ubicación / Observaciones Destino 1" value={formData.ubicacionObsDestino1} onChange={(v) => setField('ubicacionObsDestino1', v)} />
                <FormInput label="Dirección Destino 1" value={formData.direccionDestino1} onChange={(v) => setField('direccionDestino1', v)} />
                <FormInput label="Ciudad Destino 1" value={formData.ciudadDestino1} onChange={(v) => setField('ciudadDestino1', v)} />
                <FormInput label="Teléfono Destino 1" value={formData.telefonoDestino1} onChange={(v) => setField('telefonoDestino1', v)} />
                <FormDateTime label="Fecha Hora Entrega D1" value={formData.fechaHoraEntregaD1} onChange={(v) => setField('fechaHoraEntregaD1', v)} />
                <FormDateTime label="Fecha Hora Sale D1" value={formData.fechaHoraSaleD1} onChange={(v) => setField('fechaHoraSaleD1', v)} />
            </div>
        </FormSection>

        <FormSection title="Destino 2">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3">
                <FormInput label="Id. Destino 2" value={formData.idDestino2} onChange={(v) => setField('idDestino2', v)} />
                <FormInput label="Descripción Destino 2" value={formData.descripcionDestino2} onChange={(v) => setField('descripcionDestino2', v)} />
                <FormInput label="Ubicación / Observaciones Destino 2" value={formData.ubicacionObsDestino2} onChange={(v) => setField('ubicacionObsDestino2', v)} />
                <FormInput label="Dirección Destino 2" value={formData.direccionDestino2} onChange={(v) => setField('direccionDestino2', v)} />
                <FormInput label="Ciudad Destino 2" value={formData.ciudadDestino2} onChange={(v) => setField('ciudadDestino2', v)} />
                <FormInput label="Teléfono Destino 2" value={formData.telefonoDestino2} onChange={(v) => setField('telefonoDestino2', v)} />
                <FormDateTime label="Fecha Hora Entrega D2" value={formData.fechaHoraEntregaD2} onChange={(v) => setField('fechaHoraEntregaD2', v)} />
                <FormDateTime label="Fecha Hora Sale D2" value={formData.fechaHoraSaleD2} onChange={(v) => setField('fechaHoraSaleD2', v)} />
            </div>
        </FormSection>
    </div>
);

const ServiceOrderForm = ({
    formData,
    setField,
    activeTab,
    setActiveTab,
    entityOptions,
    branchOptions,
    selectedBranchValue,
    onEntityChange,
    onBranchChange,
    onCieKeyDown,
    cieLookupState,
}) => (
    <div className="flex-1 min-h-0 flex flex-col gap-3 overflow-x-hidden">
        <Tabs activeTab={activeTab} setActiveTab={setActiveTab} />

        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden pr-1 pb-1">
            {activeTab === 'order' && (
                <OrderTab
                    formData={formData}
                    setField={setField}
                    entityOptions={entityOptions}
                    branchOptions={branchOptions}
                    selectedBranchValue={selectedBranchValue}
                    onEntityChange={onEntityChange}
                    onBranchChange={onBranchChange}
                />
            )}
            {activeTab === 'transfer' && (
                <TransferTab
                    formData={formData}
                    setField={setField}
                    onCieKeyDown={onCieKeyDown}
                    cieLookupState={cieLookupState}
                />
            )}
        </div>
    </div>
);

const NewServiceModal = ({ isOpen, onClose, clientes = [], onSubmit, getNextReqId }) => {
    const [activeTab, setActiveTab] = useState('order');
    const [formData, setFormData] = useState(INITIAL_FORM_DATA);
    const [selectedBranchKey, setSelectedBranchKey] = useState('');
    const [cieLookupState, setCieLookupState] = useState({ loading: false, error: '', success: false });

    const entityOptions = useMemo(() => {
        return [...clientes]
            .sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''))
            .map((cliente) => ({
                value: cliente.id,
                label: cliente.nombre || cliente.id,
            }));
    }, [clientes]);

    const selectedEntity = useMemo(
        () => clientes.find((cliente) => cliente.id === formData.idEntidad),
        [clientes, formData.idEntidad]
    );

    const selectedContacts = useMemo(() => {
        const rawContacts = selectedEntity?.contacts;
        if (Array.isArray(rawContacts)) return rawContacts;
        if (rawContacts && typeof rawContacts === 'object') return Object.values(rawContacts);
        return [];
    }, [selectedEntity]);

    const normalizedBranches = useMemo(() => {
        return selectedContacts
            .map((contact, index) => {
                const idSucursal =
                    String(
                        contact?.idSucursal ||
                        contact?.reference ||
                        contact?.identification ||
                        contact?.id ||
                        contact?.name ||
                        index
                    ).trim();
                const nombreSucursal = String(contact?.name || '').trim();
                if (!idSucursal || !nombreSucursal) return null;
                return {
                    key: String(index),
                    idSucursal,
                    nombreSucursal,
                };
            })
            .filter(Boolean);
    }, [selectedContacts]);

    const branchOptions = useMemo(() => {
        return normalizedBranches.map((branch) => ({
            value: branch.key,
            label: branch.nombreSucursal,
        }));
    }, [normalizedBranches]);

    useEffect(() => {
        if (!isOpen || typeof document === 'undefined') return undefined;

        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        return () => {
            document.body.style.overflow = prevOverflow;
        };
    }, [isOpen]);

    const canSubmit = useMemo(() => {
        return Boolean(formData.paciente && formData.descripcionOrigen && formData.descripcionDestino1);
    }, [formData.paciente, formData.descripcionOrigen, formData.descripcionDestino1]);

    if (!isOpen) return null;
    if (typeof document === 'undefined') return null;

    const setField = (field, value) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        if (field === 'codCIE') {
            setCieLookupState({ loading: false, error: '', success: false });
        }
    };

    const handleCieLookup = async () => {
        const cieCode = String(formData.codCIE || '').trim().toUpperCase();

        if (!cieCode) {
            setCieLookupState({ loading: false, error: 'Ingrese un código CIE para buscar.', success: false });
            setFormData((prev) => ({ ...prev, buscarCIE: '' }));
            return;
        }

        setCieLookupState({ loading: true, error: '', success: false });

        try {
            const cieQuery = query(
                collection(db, 'CIE'),
                where('codigo', '==', cieCode),
                limit(1)
            );
            const snapshot = await getDocs(cieQuery);

            if (snapshot.empty) {
                setFormData((prev) => ({ ...prev, buscarCIE: '' }));
                setCieLookupState({ loading: false, error: `No se encontró el código CIE ${cieCode}.`, success: false });
                return;
            }

            const cieData = snapshot.docs[0].data();
            const cieName = String(cieData?.nombre || '').trim();

            setFormData((prev) => ({
                ...prev,
                codCIE: cieCode,
                buscarCIE: cieName,
            }));
            setCieLookupState({ loading: false, error: '', success: true });
        } catch (error) {
            setFormData((prev) => ({ ...prev, buscarCIE: '' }));
            setCieLookupState({
                loading: false,
                error: error?.message || 'No se pudo consultar el código CIE.',
                success: false,
            });
        }
    };

    const handleCieKeyDown = async (event) => {
        if (event.key !== 'Enter') return;
        event.preventDefault();
        await handleCieLookup();
    };

    const handleEntityChange = (entityId) => {
        const entity = clientes.find((cliente) => cliente.id === entityId);
        setSelectedBranchKey('');
        setFormData((prev) => ({
            ...prev,
            clienteId: entityId || '',
            idEntidad: entityId || '',
            entidadSolicitante: entity?.nombre || '',
            nombreEntidad: entity?.nombre || '',
            idSucursal: '',
            codSucursal: '',
            sucursal: '',
            nombreSucursal: '',
        }));
    };

    const handleBranchChange = (branchKey) => {
        const selectedBranch = normalizedBranches.find((branch) => branch.key === branchKey);
        const branchName = selectedBranch?.nombreSucursal || '';
        const branchId = selectedBranch?.idSucursal || '';

        setSelectedBranchKey(branchKey || '');
        setFormData((prev) => ({
            ...prev,
            idSucursal: branchId,
            codSucursal: branchId,
            sucursal: branchName,
            nombreSucursal: branchName,
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!canSubmit) return;

        const id = getNextReqId();
        const newRequest = {
            id,
            paciente: formData.paciente,
            clienteId: formData.idEntidad || formData.clienteId || '',
            idEntidad: formData.idEntidad || '',
            entidadSolicitante: formData.entidadSolicitante || formData.nombreEntidad || '',
            nombreEntidad: formData.nombreEntidad || formData.entidadSolicitante || '',
            idSucursal: formData.idSucursal || formData.codSucursal || '',
            sucursal: formData.sucursal || formData.nombreSucursal || '',
            nombreSucursal: formData.nombreSucursal || formData.sucursal || '',
            origen: formData.descripcionOrigen || formData.direccionOrigen || 'Origen no especificado',
            destino: formData.descripcionDestino1 || formData.direccionDestino1 || 'Destino no especificado',
            estado: 'Pendiente',
            tiempoEsperaMin: 0,
            legacyForm: { ...formData },
        };

        onSubmit(newRequest);
        setFormData(INITIAL_FORM_DATA);
        setSelectedBranchKey('');
        setCieLookupState({ loading: false, error: '', success: false });
        setActiveTab('order');
        onClose();
    };

    return createPortal(
        <div
            className="flex items-center justify-center px-4 py-4 md:px-8"
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 2147483647,
                backgroundColor: 'rgba(2, 6, 23, 0.62)',
                backdropFilter: 'blur(2px)',
                WebkitBackdropFilter: 'blur(2px)'
            }}
        >
            <div
                className="bg-dark-800 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col"
                style={{
                    width: 'min(960px, calc(100vw - 32px))',
                    maxWidth: '960px',
                    height: 'min(82vh, 720px)'
                }}
            >
                <div className="px-4 md:px-5 py-3 border-b border-slate-700 flex justify-between items-start md:items-center gap-3 bg-dark-900/50">
                    <div>
                        <h2 className="text-base md:text-lg font-bold text-white">Crear orden de servicio</h2>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-3 md:p-4 flex-1 min-h-0 flex flex-col gap-3 overflow-hidden">
                    <ServiceOrderForm
                        formData={formData}
                        setField={setField}
                        activeTab={activeTab}
                        setActiveTab={setActiveTab}
                        entityOptions={entityOptions}
                        branchOptions={branchOptions}
                        selectedBranchValue={selectedBranchKey}
                        onEntityChange={handleEntityChange}
                        onBranchChange={handleBranchChange}
                        onCieKeyDown={handleCieKeyDown}
                        cieLookupState={cieLookupState}
                    />

                    <div className="pt-2 border-t border-slate-700 flex flex-col sm:flex-row gap-2 sm:justify-end shrink-0">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded-lg border border-slate-600 text-slate-200 hover:bg-slate-700/40 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={!canSubmit}
                            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold inline-flex items-center justify-center gap-2 transition-colors"
                            title="Requiere: Paciente, Descripción Origen y Descripción Destino 1"
                        >
                            <Send size={16} /> Crear y Enviar a Triage
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
};

export default NewServiceModal;
