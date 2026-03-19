import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Send, ClipboardList, Ambulance, Ban, AlertTriangle } from 'lucide-react';
import { Timestamp, collection, getDocs, limit, query, where } from 'firebase/firestore';
import { db } from '../firebase/config';

import { useAuth } from '../contexts/AuthContext';
import { useDashboardData } from '../hooks/useDashboardData';

// Cloud Function URL for status change approval requests
const STATUS_CHANGE_APPROVAL_URL = '/api/status-change-approval';

// Status change reasons
const STATUS_CHANGE_REASONS = [
    {
        id: 'fallido',
        label: 'Fallido',
        description: 'La ambulancia llegó pero el paciente/institución no contaba con los pre-requisitos',
        color: 'orange'
    },
    {
        id: 'cancelado',
        label: 'Cancelado',
        description: 'Servicio cancelado por el cliente',
        color: 'slate'
    },
    {
        id: 'negado',
        label: 'Negado',
        description: 'No había disponibilidad de servicio para realizarlo',
        color: 'red'
    },
];

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

    // Autorizaciones
    confirmaAutorizacion: '',
    numeroAutorizacion: '',

    // Observaciones
    observaciones: '',

    // Informacion de autorizacion
    copagoValor: '',
    servicioParticularValor: '',
    servicioProgramado: '',
    servicioSolicitado: '',
    esServicioParticular: false,

    // Opciones

    // Auditoria
    codCIE: '',
    buscarCIE: '',
    observacionesCIE: '',

    // Estado clinico
    estadoClinicoActual: '',

    // Origen
    idOrigen: '',
    nombreOrigen: '',
    observacionesOrigen: '',
    direccionOrigen: '',
    ciudadOrigen: '',
    telefonoOrigen: '',
    fechaHoraContacto: '',
    fechaHoraSaleOrigen: '',

    // Destino 1
    idDestino1: '',
    nombreDestino1: '',
    observacionesDestino1: '',
    direccionDestino1: '',
    ciudadDestino1: '',
    telefonoDestino1: '',
    fechaHoraEntregaD1: '',
    fechaHoraSaleD1: '',

    // Destino 2
    idDestino2: '',
    nombreDestino2: '',
    observacionesDestino2: '',
    direccionDestino2: '',
    ciudadDestino2: '',
    telefonoDestino2: '',
    fechaHoraEntregaD2: '',
    fechaHoraSaleD2: '',

};

const DESTINATION_2_FIELDS = {
    idDestino2: '',
    nombreDestino2: '',
    observacionesDestino2: '',
    direccionDestino2: '',
    ciudadDestino2: '',
    telefonoDestino2: '',
    fechaHoraEntregaD2: '',
    fechaHoraSaleD2: '',
};

const FIELD_MAX_LENGTHS = {
    idPacienteHC: 30,
    tipoIdentidad: 5,
    paciente: 120,
    sexo: 20,
    fechaNacimiento: 10,
    edad: 3,
    tipoEdad: 10,

    idSolicitante: 30,
    solicitante: 120,
    observacionesSolicita: 1000,

    idEntidad: 40,
    entidadSolicitante: 180,
    nombreEntidad: 180,
    idSucursal: 60,
    nombreSucursal: 180,
    codSucursal: 60,
    sucursal: 180,

    codComplejidad: 10,
    complejidad: 120,
    confirmaAutorizacion: 2,
    numeroAutorizacion: 40,
    copagoValor: 12,
    servicioParticularValor: 12,

    servicioProgramado: 16,
    servicioSolicitado: 16,

    codCIE: 10,
    buscarCIE: 180,
    observacionesCIE: 1000,
    estadoClinicoActual: 3000,

    idOrigen: 30,
    nombreOrigen: 180,
    observacionesOrigen: 1000,
    direccionOrigen: 240,
    ciudadOrigen: 80,
    telefonoOrigen: 25,
    fechaHoraContacto: 16,
    fechaHoraSaleOrigen: 16,

    idDestino1: 30,
    nombreDestino1: 180,
    observacionesDestino1: 1000,
    direccionDestino1: 240,
    ciudadDestino1: 80,
    telefonoDestino1: 25,
    fechaHoraEntregaD1: 16,
    fechaHoraSaleD1: 16,

    idDestino2: 30,
    nombreDestino2: 180,
    observacionesDestino2: 1000,
    direccionDestino2: 240,
    ciudadDestino2: 80,
    telefonoDestino2: 25,
    fechaHoraEntregaD2: 16,
    fechaHoraSaleD2: 16,

    observaciones: 2000,
};

const DIGITS_ONLY_FIELDS = new Set(['edad']);
const MONEY_FIELDS = new Set(['copagoValor', 'servicioParticularValor']);
const UPPERCASE_FIELDS = new Set(['codCIE']);
const LETTERS_ONLY_FIELDS = new Set(['paciente', 'solicitante']);
const AUTH_CODE_FIELDS = new Set(['numeroAutorizacion']);

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

const normalizeLookupValue = (value) => String(value ?? '').trim().toLowerCase();

const toDateTimeLocalString = (value) => {
    if (!value) return '';

    const dateValue = value && typeof value.toDate === 'function'
        ? value.toDate()
        : new Date(value);

    if (!(dateValue instanceof Date) || Number.isNaN(dateValue.getTime())) return '';

    const pad = (n) => String(n).padStart(2, '0');
    return `${dateValue.getFullYear()}-${pad(dateValue.getMonth() + 1)}-${pad(dateValue.getDate())}T${pad(dateValue.getHours())}:${pad(dateValue.getMinutes())}`;
};

const sanitizeText = (value) => String(value ?? '').replace(/\s+/g, ' ').trim();

const sanitizeAmount = (value) => String(value ?? '').replace(/[^\d]/g, '');
const sanitizeAuthorizationCode = (value) => String(value ?? '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();

const sanitizeName = (value) => String(value ?? '')
    .replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s'-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const OTHER_ORIGIN_VALUE = 'otro';

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
    list,
}) => (
    <div className={className}>
        <label className="block text-[11px] font-semibold text-slate-400 mb-1">{label}</label>
        <input
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={onKeyDown}
            list={list}
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

const FormDateTime = ({ label, value, onChange, disabled = false, disabledReason }) => (
    <div className={disabled ? 'opacity-60' : ''}>
        <label className="block text-[11px] font-semibold text-slate-400 mb-1">{label}</label>
        <input
            type="datetime-local"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={baseFieldClass}
            disabled={disabled}
            title={disabled ? disabledReason : undefined}
        />
        {disabled && disabledReason && (
            <p className="text-[10px] text-amber-400 mt-0.5">{disabledReason}</p>
        )}
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
    serviceTypeOptions,
    serviceTypesState,
    complexityLookupState,
    onComplexityCodeKeyDown,
    onComplexityPickerChange,
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

            <FormSection title="Programación del Servicio">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <FormDateTime label="Servicio Solicitado" value={formData.servicioSolicitado} onChange={(v) => setField('servicioSolicitado', v)} />
                    <FormDateTime label="Servicio Programado" value={formData.servicioProgramado} onChange={(v) => setField('servicioProgramado', v)} />
                </div>
            </FormSection>

            <FormSection title="Solicitante">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <FormInput label="Id. Solicitante" value={formData.idSolicitante} onChange={(v) => setField('idSolicitante', v)} />
                    <FormInput label="Solicitante" value={formData.solicitante} onChange={(v) => setField('solicitante', v)} />
                    <div className="md:col-span-2">
                        <FormTextarea label="Observaciones Solicitante" value={formData.observacionesSolicita} onChange={(v) => setField('observacionesSolicita', v)} />
                    </div>
                </div>
            </FormSection>

            <FormSection title="Entidad">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
                    <div className="hidden"><FormInput label="Nombre Entidad" value={formData.nombreEntidad || formData.entidadSolicitante} onChange={(v) => setField('nombreEntidad', v)} disabled /></div>
                    <div className="hidden"><FormInput label="Nombre Sucursal" value={formData.nombreSucursal || formData.sucursal} onChange={(v) => setField('nombreSucursal', v)} disabled /></div>
                </div>
            </FormSection>

            <FormSection title="Información del servicio">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <FormInput
                        label="Cod. Complejidad"
                        value={formData.codComplejidad}
                        onChange={(v) => setField('codComplejidad', v)}
                        onKeyDown={onComplexityCodeKeyDown}
                        placeholder="Escriba el código y presione Enter"
                    />
                    <FormSelect
                        label="Complejidad"
                        value={formData.codComplejidad}
                        onChange={onComplexityPickerChange}
                        options={serviceTypeOptions}
                        placeholder="Seleccione una complejidad..."
                    />
                    <div className="md:col-span-2 min-h-5">
                        {serviceTypesState.loading && (
                            <p className="text-xs text-blue-400">Cargando catálogo de complejidades...</p>
                        )}
                        {!serviceTypesState.loading && serviceTypesState.error && (
                            <p className="text-xs text-red-400">{serviceTypesState.error}</p>
                        )}
                        {!serviceTypesState.loading && !serviceTypesState.error && complexityLookupState.error && (
                            <p className="text-xs text-red-400">{complexityLookupState.error}</p>
                        )}
                        {!serviceTypesState.loading && !serviceTypesState.error && complexityLookupState.success && (
                            <p className="text-xs text-emerald-400">Complejidad autocompletada correctamente.</p>
                        )}
                    </div>
                </div>
            </FormSection>

            <FormSection title="Autorizaciones">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <FormSelect
                        label="Confirma Autorización"
                        value={formData.confirmaAutorizacion}
                        onChange={(v) => setField('confirmaAutorizacion', v)}
                        options={[
                            { value: 'Si', label: 'Sí' },
                            { value: 'No', label: 'No' },
                        ]}
                    />
                    {formData.confirmaAutorizacion === 'Si' && (
                        <FormInput
                            label="Número Autorización"
                            value={formData.numeroAutorizacion}
                            onChange={(v) => setField('numeroAutorizacion', v)}
                        />
                    )}
                </div>
            </FormSection>

            <FormSection title="Información de Pago">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-end">
                    {formData.esServicioParticular ? (
                        <FormInput label="Servicio Particular Valor" type="number" value={formData.servicioParticularValor} onChange={(v) => setField('servicioParticularValor', v)} />
                    ) : (
                        <FormInput label="Copago Valor (Opcional)" type="number" value={formData.copagoValor} onChange={(v) => setField('copagoValor', v)} />
                    )}
                    <div className="flex items-end pb-1">
                        <CheckboxField
                            label="¿Es un servicio particular?"
                            checked={formData.esServicioParticular}
                            onChange={(v) => setField('esServicioParticular', v)}
                        />
                    </div>
                </div>
            </FormSection>

            <FormSection title="Observaciones">
                <FormTextarea value={formData.observaciones} onChange={(v) => setField('observaciones', v)} rows={4} />
            </FormSection>

        </div>
    );
};

const TransferTab = ({
    formData,
    setField,
    cieLookupState,
    showSecondDestination,
    originOptions,
    origins,
    originsState,
    originLookupState,
    onOriginCodeKeyDown,
    onOriginPickerChange,
    isManualOrigin,
    hasAmbulanceAssigned,
    executionFieldsDisabledReason,
}) => (
    <div className="space-y-4">
        <FormSection title="Diagnóstico">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <FormInput
                    label="Cod. CIE"
                    value={formData.codCIE}
                    onChange={(v) => setField('codCIE', v)}
                    placeholder="Escriba el código CIE"
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
                <FormInput
                    label="Id. Origen"
                    value={formData.idOrigen}
                    onChange={(v) => setField('idOrigen', v)}
                    onKeyDown={onOriginCodeKeyDown}
                    placeholder="Escriba el código y presione Enter"
                />
                <FormSelect
                    label="Origen"
                    value={isManualOrigin ? OTHER_ORIGIN_VALUE : formData.idOrigen}
                    onChange={onOriginPickerChange}
                    options={originOptions}
                    placeholder="Seleccione un origen..."
                />
                <FormInput
                    label="Nombre de origen"
                    value={formData.nombreOrigen}
                    onChange={(v) => setField('nombreOrigen', v)}
                    disabled={!isManualOrigin}
                />
                <FormInput
                    label="Observaciones Origen"
                    value={formData.observacionesOrigen}
                    onChange={(v) => setField('observacionesOrigen', v)}
                />
                <FormInput
                    label="Dirección Origen"
                    value={formData.direccionOrigen}
                    onChange={(v) => setField('direccionOrigen', v)}
                    disabled={!isManualOrigin}
                />
                <FormInput
                    label="Ciudad Origen"
                    value={formData.ciudadOrigen}
                    onChange={(v) => setField('ciudadOrigen', v)}
                    disabled={!isManualOrigin}
                />
                <FormInput
                    label="Teléfono Origen"
                    value={formData.telefonoOrigen}
                    onChange={(v) => setField('telefonoOrigen', v)}
                    disabled={!isManualOrigin}
                />
                <FormDateTime label="Fecha Hora Contacto" value={formData.fechaHoraContacto} onChange={(v) => setField('fechaHoraContacto', v)} disabled={!hasAmbulanceAssigned} disabledReason={executionFieldsDisabledReason} />
                <FormDateTime label="Fecha Hora Sale Origen" value={formData.fechaHoraSaleOrigen} onChange={(v) => setField('fechaHoraSaleOrigen', v)} disabled={!hasAmbulanceAssigned} disabledReason={executionFieldsDisabledReason} />
                <div className="md:col-span-2 xl:col-span-3 2xl:col-span-4 min-h-5">
                    {originsState.loading && (
                        <p className="text-xs text-blue-400">Cargando catálogo de orígenes...</p>
                    )}
                    {!originsState.loading && originsState.error && (
                        <p className="text-xs text-red-400">{originsState.error}</p>
                    )}
                    {!originsState.loading && !originsState.error && originLookupState.error && (
                        <p className="text-xs text-red-400">{originLookupState.error}</p>
                    )}
                    {!originsState.loading && !originsState.error && originLookupState.success && (
                        <p className="text-xs text-emerald-400">Origen autocompletado correctamente.</p>
                    )}
                </div>
            </div>
        </FormSection>

        <FormSection title="Destino 1">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3">
                <FormInput
                    label="Id. Destino 1"
                    value={formData.idDestino1}
                    onChange={(v) => setField('idDestino1', v)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            const origin = origins.find((o) => normalizeLookupValue(o?.id) === normalizeLookupValue(formData.idDestino1));
                            if (origin) {
                                setField('idDestino1', String(origin?.id ?? ''));
                                setField('nombreDestino1', String(origin?.name || origin?.reference || ''));
                                setField('direccionDestino1', String(origin?.DIRECCIÓN || origin?.direccion || ''));
                                setField('ciudadDestino1', String(origin?.CIUDAD || origin?.ciudad || ''));
                                setField('telefonoDestino1', String(origin?.TELÉFONO || origin?.telefono || ''));
                            }
                        }
                    }}
                    placeholder="Escriba el código y presione Enter"
                />
                <FormSelect
                    label="Destino 1"
                    value={formData.idDestino1 === OTHER_ORIGIN_VALUE ? OTHER_ORIGIN_VALUE : formData.idDestino1}
                    onChange={(originValue) => {
                        if (!originValue) {
                            setField('idDestino1', '');
                            setField('nombreDestino1', '');
                            setField('observacionesDestino1', '');
                            setField('direccionDestino1', '');
                            setField('ciudadDestino1', '');
                            setField('telefonoDestino1', '');
                            return;
                        }

                        if (originValue === OTHER_ORIGIN_VALUE) {
                            setField('idDestino1', OTHER_ORIGIN_VALUE);
                            setField('nombreDestino1', '');
                            setField('observacionesDestino1', '');
                            setField('direccionDestino1', '');
                            setField('ciudadDestino1', '');
                            setField('telefonoDestino1', '');
                            return;
                        }

                        const origin = origins.find((o) => normalizeLookupValue(o?.id) === normalizeLookupValue(originValue));
                        if (origin) {
                            setField('idDestino1', String(origin?.id ?? ''));
                            setField('nombreDestino1', String(origin?.name || origin?.reference || ''));
                            setField('direccionDestino1', String(origin?.DIRECCIÓN || origin?.direccion || ''));
                            setField('ciudadDestino1', String(origin?.CIUDAD || origin?.ciudad || ''));
                            setField('telefonoDestino1', String(origin?.TELÉFONO || origin?.telefono || ''));
                        }
                    }}
                    options={originOptions}
                    placeholder="Seleccione un destino..."
                />
                <FormInput
                    label="Nombre de destino 1"
                    value={formData.nombreDestino1}
                    onChange={(v) => setField('nombreDestino1', v)}
                    disabled={formData.idDestino1 !== '' && formData.idDestino1 !== OTHER_ORIGIN_VALUE}
                />
                <FormInput
                    label="Observaciones Destino 1"
                    value={formData.observacionesDestino1}
                    onChange={(v) => setField('observacionesDestino1', v)}
                />
                <FormInput
                    label="Dirección Destino 1"
                    value={formData.direccionDestino1}
                    onChange={(v) => setField('direccionDestino1', v)}
                    disabled={formData.idDestino1 !== '' && formData.idDestino1 !== OTHER_ORIGIN_VALUE}
                />
                <FormInput
                    label="Ciudad Destino 1"
                    value={formData.ciudadDestino1}
                    onChange={(v) => setField('ciudadDestino1', v)}
                    disabled={formData.idDestino1 !== '' && formData.idDestino1 !== OTHER_ORIGIN_VALUE}
                />
                <FormInput
                    label="Teléfono Destino 1"
                    value={formData.telefonoDestino1}
                    onChange={(v) => setField('telefonoDestino1', v)}
                    disabled={formData.idDestino1 !== '' && formData.idDestino1 !== OTHER_ORIGIN_VALUE}
                />
                <FormDateTime label="Fecha Hora Entrega D1" value={formData.fechaHoraEntregaD1} onChange={(v) => setField('fechaHoraEntregaD1', v)} disabled={!hasAmbulanceAssigned} disabledReason={executionFieldsDisabledReason} />
                <FormDateTime label="Fecha Hora Sale D1" value={formData.fechaHoraSaleD1} onChange={(v) => setField('fechaHoraSaleD1', v)} disabled={!hasAmbulanceAssigned} disabledReason={executionFieldsDisabledReason} />
            </div>
        </FormSection>

        {showSecondDestination && (
            <FormSection title="Destino 2">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3">
                    <FormInput
                        label="Id. Destino 2"
                        value={formData.idDestino2}
                        onChange={(v) => setField('idDestino2', v)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                const origin = origins.find((o) => normalizeLookupValue(o?.id) === normalizeLookupValue(formData.idDestino2));
                                if (origin) {
                                    setField('idDestino2', String(origin?.id ?? ''));
                                    setField('nombreDestino2', String(origin?.name || origin?.reference || ''));
                                    setField('direccionDestino2', String(origin?.DIRECCIÓN || origin?.direccion || ''));
                                    setField('ciudadDestino2', String(origin?.CIUDAD || origin?.ciudad || ''));
                                    setField('telefonoDestino2', String(origin?.TELÉFONO || origin?.telefono || ''));
                                }
                            }
                        }}
                        placeholder="Escriba el código y presione Enter"
                    />
                    <FormSelect
                        label="Destino 2"
                        value={formData.idDestino2 === OTHER_ORIGIN_VALUE ? OTHER_ORIGIN_VALUE : formData.idDestino2}
                        onChange={(originValue) => {
                            if (!originValue) {
                                setField('idDestino2', '');
                                setField('nombreDestino2', '');
                                setField('observacionesDestino2', '');
                                setField('direccionDestino2', '');
                                setField('ciudadDestino2', '');
                                setField('telefonoDestino2', '');
                                return;
                            }

                            if (originValue === OTHER_ORIGIN_VALUE) {
                                setField('idDestino2', OTHER_ORIGIN_VALUE);
                                setField('nombreDestino2', '');
                                setField('observacionesDestino2', '');
                                setField('direccionDestino2', '');
                                setField('ciudadDestino2', '');
                                setField('telefonoDestino2', '');
                                return;
                            }

                            const origin = origins.find((o) => normalizeLookupValue(o?.id) === normalizeLookupValue(originValue));
                            if (origin) {
                                setField('idDestino2', String(origin?.id ?? ''));
                                setField('nombreDestino2', String(origin?.name || origin?.reference || ''));
                                setField('direccionDestino2', String(origin?.DIRECCIÓN || origin?.direccion || ''));
                                setField('ciudadDestino2', String(origin?.CIUDAD || origin?.ciudad || ''));
                                setField('telefonoDestino2', String(origin?.TELÉFONO || origin?.telefono || ''));
                            }
                        }}
                        options={originOptions}
                        placeholder="Seleccione un destino..."
                    />
                    <FormInput
                        label="Nombre de destino 2"
                        value={formData.nombreDestino2}
                        onChange={(v) => setField('nombreDestino2', v)}
                        disabled={formData.idDestino2 !== '' && formData.idDestino2 !== OTHER_ORIGIN_VALUE}
                    />
                    <FormInput
                        label="Observaciones Destino 2"
                        value={formData.observacionesDestino2}
                        onChange={(v) => setField('observacionesDestino2', v)}
                    />
                    <FormInput
                        label="Dirección Destino 2"
                        value={formData.direccionDestino2}
                        onChange={(v) => setField('direccionDestino2', v)}
                        disabled={formData.idDestino2 !== '' && formData.idDestino2 !== OTHER_ORIGIN_VALUE}
                    />
                    <FormInput
                        label="Ciudad Destino 2"
                        value={formData.ciudadDestino2}
                        onChange={(v) => setField('ciudadDestino2', v)}
                        disabled={formData.idDestino2 !== '' && formData.idDestino2 !== OTHER_ORIGIN_VALUE}
                    />
                    <FormInput
                        label="Teléfono Destino 2"
                        value={formData.telefonoDestino2}
                        onChange={(v) => setField('telefonoDestino2', v)}
                        disabled={formData.idDestino2 !== '' && formData.idDestino2 !== OTHER_ORIGIN_VALUE}
                    />
                    <FormDateTime label="Fecha Hora Entrega D2" value={formData.fechaHoraEntregaD2} onChange={(v) => setField('fechaHoraEntregaD2', v)} disabled={!hasAmbulanceAssigned} disabledReason={executionFieldsDisabledReason} />
                    <FormDateTime label="Fecha Hora Sale D2" value={formData.fechaHoraSaleD2} onChange={(v) => setField('fechaHoraSaleD2', v)} disabled={!hasAmbulanceAssigned} disabledReason={executionFieldsDisabledReason} />
                </div>
            </FormSection>
        )}
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
    cieLookupState,
    serviceTypeOptions,
    serviceTypesState,
    complexityLookupState,
    onComplexityCodeKeyDown,
    onComplexityPickerChange,
    showSecondDestination,
    originOptions,
    origins,
    originsState,
    originLookupState,
    onOriginCodeKeyDown,
    onOriginPickerChange,
    isManualOrigin,
    hasAmbulanceAssigned,
    executionFieldsDisabledReason,
}) => {
    const scrollContainerRef = useRef(null);

    useEffect(() => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop = 0;
        }
    }, [activeTab]);

    return (
        <div className="flex-1 min-h-0 flex flex-col gap-3 overflow-x-hidden">
            <Tabs activeTab={activeTab} setActiveTab={setActiveTab} />

            <div ref={scrollContainerRef} className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden pr-1 pb-1">
                {activeTab === 'order' && (
                    <OrderTab
                        formData={formData}
                        setField={setField}
                        entityOptions={entityOptions}
                        branchOptions={branchOptions}
                        selectedBranchValue={selectedBranchValue}
                        onEntityChange={onEntityChange}
                        onBranchChange={onBranchChange}
                        serviceTypeOptions={serviceTypeOptions}
                        serviceTypesState={serviceTypesState}
                        complexityLookupState={complexityLookupState}
                        onComplexityCodeKeyDown={onComplexityCodeKeyDown}
                        onComplexityPickerChange={onComplexityPickerChange}
                    />
                )}
                {activeTab === 'transfer' && (
                    <TransferTab
                        formData={formData}
                        setField={setField}
                        cieLookupState={cieLookupState}
                        showSecondDestination={showSecondDestination}
                        originOptions={originOptions}
                        origins={origins}
                        originsState={originsState}
                        originLookupState={originLookupState}
                        onOriginCodeKeyDown={onOriginCodeKeyDown}
                        onOriginPickerChange={onOriginPickerChange}
                        isManualOrigin={isManualOrigin}
                        hasAmbulanceAssigned={hasAmbulanceAssigned}
                        executionFieldsDisabledReason={executionFieldsDisabledReason}
                    />
                )}
            </div>
        </div>
    );
};

const NewServiceModal = ({ isOpen, onClose, clientes = [], onSubmit, getNextReqId, initialData = null, isEditing = false, showToast }) => {
    const [activeTab, setActiveTab] = useState('order');
    const [formData, setFormData] = useState(INITIAL_FORM_DATA);
    const [selectedBranchKey, setSelectedBranchKey] = useState('');
    const [cieLookupState, setCieLookupState] = useState({ loading: false, error: '', success: false });
    const [serviceTypes, setServiceTypes] = useState([]);
    const [serviceTypesState, setServiceTypesState] = useState({ loading: false, error: '' });
    const [complexityLookupState, setComplexityLookupState] = useState({ error: '', success: false });
    const [origins, setOrigins] = useState([]);
    const [originsState, setOriginsState] = useState({ loading: false, error: '' });
    const [originLookupState, setOriginLookupState] = useState({ error: '', success: false });
    const [submitError, setSubmitError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const cieLookupDebounceRef = useRef(null);
    const cieLookupRequestRef = useRef(0);

    // Status change request state
    const [showStatusChangeModal, setShowStatusChangeModal] = useState(false);
    const [selectedStatusReason, setSelectedStatusReason] = useState('');
    const [statusChangeJustification, setStatusChangeJustification] = useState('');
    const [statusChangeSubmitting, setStatusChangeSubmitting] = useState(false);
    const [statusChangeError, setStatusChangeError] = useState('');

    // Restrict execution date/time fields until ambulance is assigned
    const hasAmbulanceAssigned = Boolean(isEditing && initialData?.ambulanciaAsignada);
    const executionFieldsDisabledReason = !hasAmbulanceAssigned ? 'Asignar ambulancia primero' : undefined;

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

    const serviceTypeOptions = useMemo(() => {
        return [...serviceTypes]
            .sort((a, b) => String(a?.Name || '').localeCompare(String(b?.Name || '')))
            .map((serviceType) => ({
                value: String(serviceType?.Id ?? ''),
                label: String(serviceType?.Name || ''),
            }));
    }, [serviceTypes]);

    const serviceTypesByCode = useMemo(() => {
        const map = new Map();
        serviceTypes.forEach((serviceType) => {
            map.set(normalizeLookupValue(serviceType?.Id), serviceType);
        });
        return map;
    }, [serviceTypes]);

    const serviceTypesByName = useMemo(() => {
        const map = new Map();
        serviceTypes.forEach((serviceType) => {
            map.set(normalizeLookupValue(serviceType?.Name), serviceType);
        });
        return map;
    }, [serviceTypes]);

    const originOptions = useMemo(() => {
        const catalogOptions = [...origins]
            .sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || '')))
            .map((origin) => ({
                value: String(origin?.id ?? ''),
                label: String(origin?.name || origin?.reference || origin?.id || ''),
            }));

        return [{ value: OTHER_ORIGIN_VALUE, label: 'Otro' }, ...catalogOptions];
    }, [origins]);

    const originsByCode = useMemo(() => {
        const map = new Map();
        origins.forEach((origin) => {
            map.set(normalizeLookupValue(origin?.id), origin);
        });
        return map;
    }, [origins]);

    const originsByName = useMemo(() => {
        const map = new Map();
        origins.forEach((origin) => {
            const nameKey = normalizeLookupValue(origin?.name || origin?.reference);
            if (nameKey) map.set(nameKey, origin);
        });
        return map;
    }, [origins]);

    const isManualOrigin = useMemo(() => {
        return normalizeLookupValue(formData.idOrigen) === OTHER_ORIGIN_VALUE || (
            !formData.idOrigen && !originsByName.has(normalizeLookupValue(formData.nombreOrigen))
        );
    }, [formData.idOrigen, formData.nombreOrigen, originsByName]);

    const selectedServiceType = useMemo(() => {
        const byCode = serviceTypesByCode.get(normalizeLookupValue(formData.codComplejidad));
        if (byCode) return byCode;
        return serviceTypesByName.get(normalizeLookupValue(formData.complejidad)) || null;
    }, [formData.codComplejidad, formData.complejidad, serviceTypesByCode, serviceTypesByName]);

    const showSecondDestination = !selectedServiceType?.isSencillo;

    useEffect(() => {
        if (!isOpen || typeof document === 'undefined') return undefined;

        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        return () => {
            document.body.style.overflow = prevOverflow;
        };
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return undefined;

        let cancelled = false;

        const loadServiceTypes = async () => {
            setServiceTypesState({ loading: true, error: '' });

            try {
                const snapshot = await getDocs(collection(db, 'ServiceTypes'));
                if (cancelled) return;

                const nextServiceTypes = snapshot.docs
                    .map((doc) => doc.data())
                    .filter((serviceType) => serviceType?.Id !== undefined && serviceType?.Name);

                setServiceTypes(nextServiceTypes);
                setServiceTypesState({ loading: false, error: '' });
            } catch (error) {
                if (cancelled) return;

                setServiceTypes([]);
                setServiceTypesState({
                    loading: false,
                    error: error?.message || 'No se pudo cargar el catálogo de complejidades.',
                });
            }
        };

        loadServiceTypes();

        return () => {
            cancelled = true;
        };
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return undefined;

        let cancelled = false;

        const loadOrigins = async () => {
            setOriginsState({ loading: true, error: '' });

            try {
                const snapshot = await getDocs(collection(db, 'origenes'));
                if (cancelled) return;

                const nextOrigins = snapshot.docs
                    .map((doc) => doc.data())
                    .filter((origin) => origin?.id !== undefined && (origin?.name || origin?.reference));

                setOrigins(nextOrigins);
                setOriginsState({ loading: false, error: '' });
            } catch (error) {
                if (cancelled) return;

                setOrigins([]);
                setOriginsState({
                    loading: false,
                    error: error?.message || 'No se pudo cargar el catálogo de orígenes.',
                });
            }
        };

        loadOrigins();

        return () => {
            cancelled = true;
        };
    }, [isOpen]);

    useEffect(() => {
        if (!selectedServiceType?.isSencillo) return;

        setFormData((prev) => {
            const hasDestination2Data = Object.keys(DESTINATION_2_FIELDS).some(
                (field) => String(prev[field] || '').trim() !== ''
            );

            if (!hasDestination2Data) return prev;

            return {
                ...prev,
                ...DESTINATION_2_FIELDS,
            };
        });
    }, [selectedServiceType]);

    useEffect(() => {
        if (!isOpen) return;

        if (isEditing && initialData) {
            const pacienteInfo = initialData.pacienteInfo || {};
            const solicitanteInfo = initialData.solicitanteInfo || {};
            const entidadInfo = initialData.entidadInfo || {};
            const servicioInfo = initialData.servicioInfo || {};
            const programacionInfo = initialData.programacionInfo || {};
            const diagnosticoInfo = initialData.diagnosticoInfo || {};
            const origenInfo = initialData.origenInfo || {};
            const destino1Info = initialData.destino1Info || {};
            const destino2Info = initialData.destino2Info || {};

            setFormData((prev) => ({
                ...prev,
                clienteId: initialData.clienteId || entidadInfo.idEntidad || '',
                idEntidad: entidadInfo.idEntidad || initialData.idEntidad || '',
                entidadSolicitante: entidadInfo.entidadSolicitante || initialData.entidadSolicitante || '',
                nombreEntidad: entidadInfo.nombreEntidad || initialData.nombreEntidad || '',
                idSucursal: entidadInfo.idSucursal || initialData.idSucursal || '',
                codSucursal: entidadInfo.idSucursal || initialData.idSucursal || '',
                sucursal: entidadInfo.sucursal || initialData.sucursal || '',
                nombreSucursal: entidadInfo.nombreSucursal || initialData.nombreSucursal || '',

                idPacienteHC: pacienteInfo.idPacienteHC || '',
                tipoIdentidad: pacienteInfo.tipoIdentidad || '',
                paciente: pacienteInfo.nombre || initialData.paciente || '',
                sexo: pacienteInfo.sexo || '',
                fechaNacimiento: pacienteInfo.fechaNacimiento || '',
                edad: String(pacienteInfo.edad ?? ''),
                tipoEdad: pacienteInfo.tipoEdad || '',

                idSolicitante: solicitanteInfo.idSolicitante || '',
                solicitante: solicitanteInfo.nombre || initialData.solicitanteNombre || '',
                observacionesSolicita: solicitanteInfo.observaciones || '',

                codComplejidad: servicioInfo.codComplejidad || '',
                complejidad: servicioInfo.complejidad || '',
                confirmaAutorizacion: servicioInfo.confirmaAutorizacion || '',
                numeroAutorizacion: servicioInfo.numeroAutorizacion || '',
                copagoValor: servicioInfo.copagoValor || '',
                esServicioParticular: Boolean(servicioInfo.esServicioParticular),
                servicioParticularValor: servicioInfo.servicioParticularValor || '',

                codCIE: diagnosticoInfo.codCIE || '',
                buscarCIE: diagnosticoInfo.nombreCIE || '',
                observacionesCIE: diagnosticoInfo.observacionesCIE || '',
                estadoClinicoActual: diagnosticoInfo.estadoClinicoActual || '',

                idOrigen: origenInfo.id || '',
                nombreOrigen: origenInfo.nombre || initialData.origenNombre || '',
                observacionesOrigen: origenInfo.observaciones || '',
                direccionOrigen: origenInfo.direccion || '',
                ciudadOrigen: origenInfo.ciudad || '',
                telefonoOrigen: origenInfo.telefono || '',
                fechaHoraContacto: toDateTimeLocalString(origenInfo.fechaHoraContacto),
                fechaHoraSaleOrigen: toDateTimeLocalString(origenInfo.fechaHoraSalida),

                idDestino1: destino1Info.id || '',
                nombreDestino1: destino1Info.nombre || initialData.destinoNombre || '',
                observacionesDestino1: destino1Info.observaciones || '',
                direccionDestino1: destino1Info.direccion || '',
                ciudadDestino1: destino1Info.ciudad || '',
                telefonoDestino1: destino1Info.telefono || '',
                fechaHoraEntregaD1: toDateTimeLocalString(destino1Info.fechaHoraEntrega),
                fechaHoraSaleD1: toDateTimeLocalString(destino1Info.fechaHoraSalida),

                idDestino2: destino2Info.id || '',
                nombreDestino2: destino2Info.nombre || '',
                observacionesDestino2: destino2Info.observaciones || '',
                direccionDestino2: destino2Info.direccion || '',
                ciudadDestino2: destino2Info.ciudad || '',
                telefonoDestino2: destino2Info.telefono || '',
                fechaHoraEntregaD2: toDateTimeLocalString(destino2Info.fechaHoraEntrega),
                fechaHoraSaleD2: toDateTimeLocalString(destino2Info.fechaHoraSalida),

                servicioProgramado: toDateTimeLocalString(programacionInfo.servicioProgramado),
                servicioSolicitado: toDateTimeLocalString(programacionInfo.servicioSolicitado),
                observaciones: initialData.observaciones || '',
            }));

            return;
        }

        const now = new Date();
        const pad = (n) => String(n).padStart(2, '0');
        const fmt = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);

        setFormData((prev) => ({
            ...prev,
            servicioProgramado: fmt(todayStart),
            servicioSolicitado: fmt(now),
        }));
    }, [isOpen, isEditing, initialData]);

    const canSubmit = useMemo(() => {
        const validatorsMap = {
            paciente: Boolean(formData.paciente?.trim()),
            solicitante: Boolean(formData.solicitante?.trim()),
            entidad: Boolean(formData.idEntidad?.trim()),
            complejidad: Boolean(formData.codComplejidad?.trim()),
            confirmaAutorizacion: Boolean(formData.confirmaAutorizacion?.trim()),
            programacionProgramado: Boolean(formData.servicioProgramado?.trim()),
            programacionSolicitado: Boolean(formData.servicioSolicitado?.trim()),
            destinoNombre: Boolean(formData.nombreDestino1?.trim()),
            diagnosticoCIE: Boolean(formData.codCIE?.trim()),
            origenNombre: Boolean(formData.nombreOrigen?.trim()),
        };

        return Object.values(validatorsMap).every(Boolean);
    }, [
        formData.paciente,
        formData.solicitante,
        formData.idEntidad,
        formData.codComplejidad,
        formData.confirmaAutorizacion,
        formData.servicioProgramado,
        formData.servicioSolicitado,
        formData.nombreDestino1,
        formData.codCIE,
        formData.nombreOrigen,
    ]);

    if (!isOpen) return null;
    if (typeof document === 'undefined') return null;

    const { user } = useAuth();

    const setField = (field, value) => {
        let nextValue = value;

        if (typeof nextValue === 'string') {
            if (LETTERS_ONLY_FIELDS.has(field)) {
                nextValue = nextValue
                    .replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s'-]/g, '')
                    .replace(/\s+/g, ' ');
            }

            if (DIGITS_ONLY_FIELDS.has(field)) {
                nextValue = nextValue.replace(/\D/g, '');
            }

            if (AUTH_CODE_FIELDS.has(field)) {
                nextValue = sanitizeAuthorizationCode(nextValue);
            }

            if (MONEY_FIELDS.has(field)) {
                nextValue = nextValue.replace(/[^\d]/g, '');
            }

            if (UPPERCASE_FIELDS.has(field)) {
                nextValue = nextValue.toUpperCase();
            }

            const maxLength = FIELD_MAX_LENGTHS[field] ?? 300;
            nextValue = nextValue.slice(0, maxLength);
        }

        setFormData((prev) => ({ ...prev, [field]: nextValue }));
        if (submitError) setSubmitError('');
        if (field === 'codCIE') {
            setCieLookupState({ loading: false, error: '', success: false });
        }
        if (field === 'codComplejidad' || field === 'complejidad') {
            setComplexityLookupState({ error: '', success: false });
        }
        if (field === 'idOrigen' || field === 'nombreOrigen') {
            setOriginLookupState({ error: '', success: false });
        }
    };

    const applyServiceTypeSelection = (serviceType) => {
        setFormData((prev) => ({
            ...prev,
            codComplejidad: String(serviceType?.Id ?? ''),
            complejidad: String(serviceType?.Name || ''),
            ...(serviceType?.isSencillo ? DESTINATION_2_FIELDS : {}),
        }));
        setComplexityLookupState({ error: '', success: true });
    };

    const handleCieLookup = async ({ cieCodeOverride, showEmptyError = true } = {}) => {
        const cieCode = String(cieCodeOverride ?? formData.codCIE ?? '').trim().toUpperCase();

        if (!cieCode) {
            setCieLookupState({
                loading: false,
                error: showEmptyError ? 'Ingrese un código CIE para buscar.' : '',
                success: false,
            });
            setFormData((prev) => ({ ...prev, buscarCIE: '' }));
            return;
        }

        const requestId = ++cieLookupRequestRef.current;
        setCieLookupState({ loading: true, error: '', success: false });

        try {
            const cieQuery = query(
                collection(db, 'CIE'),
                where('codigo', '==', cieCode),
                limit(1)
            );
            const snapshot = await getDocs(cieQuery);
            if (requestId !== cieLookupRequestRef.current) return;

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
            if (requestId !== cieLookupRequestRef.current) return;
            setFormData((prev) => ({ ...prev, buscarCIE: '' }));
            setCieLookupState({
                loading: false,
                error: error?.message || 'No se pudo consultar el código CIE.',
                success: false,
            });
        }
    };

    useEffect(() => {
        if (!isOpen) return;

        if (cieLookupDebounceRef.current) {
            clearTimeout(cieLookupDebounceRef.current);
        }

        const cieCode = String(formData.codCIE || '').trim().toUpperCase();
        if (!cieCode) {
            setFormData((prev) => (prev.buscarCIE ? { ...prev, buscarCIE: '' } : prev));
            setCieLookupState({ loading: false, error: '', success: false });
            return;
        }

        cieLookupDebounceRef.current = setTimeout(() => {
            handleCieLookup({ cieCodeOverride: cieCode, showEmptyError: false });
        }, 350);

        return () => {
            if (cieLookupDebounceRef.current) {
                clearTimeout(cieLookupDebounceRef.current);
            }
        };
    }, [formData.codCIE, isOpen]);

    const handleComplexityCodeLookup = async () => {
        const complexityCode = normalizeLookupValue(formData.codComplejidad);

        if (!complexityCode) {
            setFormData((prev) => ({ ...prev, complejidad: '' }));
            setComplexityLookupState({ error: 'Ingrese un código de complejidad para buscar.', success: false });
            return;
        }

        if (serviceTypesState.loading) {
            setComplexityLookupState({ error: 'El catálogo de complejidades todavía se está cargando.', success: false });
            return;
        }

        if (serviceTypesState.error) {
            setComplexityLookupState({ error: serviceTypesState.error, success: false });
            return;
        }

        const serviceType = serviceTypesByCode.get(complexityCode);

        if (!serviceType) {
            setFormData((prev) => ({ ...prev, complejidad: '' }));
            setComplexityLookupState({
                error: `No se encontró la complejidad con código ${String(formData.codComplejidad).trim()}.`,
                success: false,
            });
            return;
        }

        applyServiceTypeSelection(serviceType);
    };

    const handleComplexityCodeKeyDown = async (event) => {
        if (event.key !== 'Enter') return;
        event.preventDefault();
        await handleComplexityCodeLookup();
    };

    const handleComplexityPickerChange = (complexityCode) => {
        if (!complexityCode) {
            setFormData((prev) => ({
                ...prev,
                codComplejidad: '',
                complejidad: '',
            }));
            setComplexityLookupState({ error: '', success: false });
            return;
        }

        const serviceType = serviceTypesByCode.get(normalizeLookupValue(complexityCode));

        if (!serviceType) {
            setComplexityLookupState({ error: 'La complejidad seleccionada no es válida.', success: false });
            return;
        }

        applyServiceTypeSelection(serviceType);
    };

    const applyOriginSelection = (origin) => {
        setFormData((prev) => ({
            ...prev,
            idOrigen: String(origin?.id ?? ''),
            nombreOrigen: String(origin?.name || origin?.reference || ''),
            direccionOrigen: String(origin?.DIRECCIÓN || origin?.direccion || ''),
            ciudadOrigen: String(origin?.CIUDAD || origin?.ciudad || ''),
            telefonoOrigen: String(origin?.TELÉFONO || origin?.telefono || ''),
        }));
        setOriginLookupState({ error: '', success: true });
    };

    const handleOriginCodeLookup = async () => {
        const originCode = normalizeLookupValue(formData.idOrigen);

        if (!originCode) {
            setOriginLookupState({ error: 'Ingrese un código de origen para buscar.', success: false });
            return;
        }

        if (originCode === OTHER_ORIGIN_VALUE) {
            setFormData((prev) => ({
                ...prev,
                idOrigen: OTHER_ORIGIN_VALUE,
                nombreOrigen: '',
                observacionesOrigen: '',
                direccionOrigen: '',
                ciudadOrigen: '',
                telefonoOrigen: '',
            }));
            setOriginLookupState({ error: '', success: false });
            return;
        }

        if (originsState.loading) {
            setOriginLookupState({ error: 'El catálogo de orígenes todavía se está cargando.', success: false });
            return;
        }

        if (originsState.error) {
            setOriginLookupState({ error: originsState.error, success: false });
            return;
        }

        const origin = originsByCode.get(originCode);

        if (!origin) {
            setOriginLookupState({
                error: `No se encontró el origen con código ${String(formData.idOrigen).trim()}.`,
                success: false,
            });
            return;
        }

        applyOriginSelection(origin);
    };

    const handleOriginCodeKeyDown = async (event) => {
        if (event.key !== 'Enter') return;
        event.preventDefault();
        await handleOriginCodeLookup();
    };

    const handleOriginPickerChange = (originValue) => {
        if (!originValue) {
            setFormData((prev) => ({
                ...prev,
                idOrigen: '',
                nombreOrigen: '',
                observacionesOrigen: '',
                direccionOrigen: '',
                ciudadOrigen: '',
                telefonoOrigen: '',
            }));
            setOriginLookupState({ error: '', success: false });
            return;
        }

        if (originValue === OTHER_ORIGIN_VALUE) {
            setFormData((prev) => ({
                ...prev,
                idOrigen: OTHER_ORIGIN_VALUE,
                nombreOrigen: '',
                observacionesOrigen: '',
                direccionOrigen: '',
                ciudadOrigen: '',
                telefonoOrigen: '',
            }));
            setOriginLookupState({ error: '', success: false });
            return;
        }

        const origin = originsByCode.get(normalizeLookupValue(originValue));

        if (!origin) {
            setOriginLookupState({ error: 'El origen seleccionado no es válido.', success: false });
            return;
        }

        applyOriginSelection(origin);
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

    // Handle status change request (Fallido, Cancelado, Negado)
    const [justificationTouched, setJustificationTouched] = useState(false);
    const [showStatusChangeConfirm, setShowStatusChangeConfirm] = useState(false);

    // Llama a este para mostrar el modal de confirmación (solo para cancelado/negado)
    // Para fallido se ejecuta directamente
    const handleStatusChangeClick = () => {
        setJustificationTouched(true);
        if (!selectedStatusReason || !statusChangeJustification.trim()) {
            setStatusChangeError('Seleccione una razón y proporcione una justificación');
            return;
        }
        // Fallido no requiere confirmación de gerencia - ejecuta directamente
        if (selectedStatusReason === 'fallido') {
            handleStatusChangeRequest();
            return;
        }
        setShowStatusChangeConfirm(true);
    };


    // Lógica de cambio de estado: 'fallido' directo, otros pasan a revisión y desasignan ambulancia
    const { requestStatusToReview, updateRequestStatusDirect } = useDashboardData();
    const handleStatusChangeRequest = async () => {
        setStatusChangeSubmitting(true);
        setStatusChangeError('');
        try {
            const solicitudId = initialData?.id;
            if (!solicitudId) throw new Error('ID de solicitud no encontrado');

            if (selectedStatusReason === 'fallido') {
                // Cambia a 'Fallido' directamente (sin aprobación de gerencia)
                await updateRequestStatusDirect(solicitudId, 'Fallido');
            } else {
                // Cambia a 'En revisión', guarda justificación y desasigna ambulancia
                await requestStatusToReview(solicitudId, statusChangeJustification.trim());

                // Enviar notificación a gerencia para aprobación
                try {
                    const authToken = user?.getIdToken ? await user.getIdToken() : null;
                    const reasonLabel = STATUS_CHANGE_REASONS.find(r => r.id === selectedStatusReason)?.label || selectedStatusReason;

                    await fetch(STATUS_CHANGE_APPROVAL_URL, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
                        },
                        body: JSON.stringify({
                            solicitudId,
                            razonCambioEstado: reasonLabel,
                            justificacion: statusChangeJustification.trim(),
                            solicitadoPor: user?.email || user?.displayName || 'Usuario desconocido',
                            solicitadoAt: new Date().toISOString(),
                            datosSolicitud: {
                                tipoServicio: initialData?.servicioInfo?.complejidad || '',
                                nombrePaciente: initialData?.pacienteInfo?.nombre || initialData?.paciente || '',
                                idPacienteHC: initialData?.pacienteInfo?.idPacienteHC || '',
                                nombreOrigen: initialData?.origenInfo?.nombre || initialData?.origen || '',
                                direccionOrigen: initialData?.origenInfo?.direccion || '',
                                direccionDestino1: initialData?.destino1Info?.direccion || '',
                                nombreDestino1: initialData?.destino1Info?.nombre || initialData?.destinoNombre || '',
                                direccionDestino2: initialData?.destino2Info?.direccion || '',
                                nombreDestino2: initialData?.destino2Info?.nombre || '',
                                nombreEntidad: initialData?.entidadInfo?.nombreEntidad || initialData?.entidadInfo?.entidadSolicitante || '',
                                estado: initialData?.estado || '',
                            },
                            source: 'lma-status-change-request',
                        }),
                    });
                } catch (webhookError) {
                    // Log but don't fail the operation if webhook fails
                    console.error('Error enviando notificación de cambio de estado:', webhookError);
                }
            }

            setShowStatusChangeModal(false);
            setSelectedStatusReason('');
            setStatusChangeJustification('');

            // Mostrar mensaje de éxito
            if (showToast) {
                showToast('Operación realizada exitosamente', 'success');
            }

            onClose();
        } catch (err) {
            setStatusChangeError(err.message || 'Error al procesar la solicitud');
        } finally {
            setStatusChangeSubmitting(false);
        }
    };

    const handleSubmit = (e) => {
        const sanitizeFormData = (data) => ({
            ...data,
            paciente: sanitizeName(data.paciente),
            solicitante: sanitizeName(data.solicitante),
            codComplejidad: sanitizeText(data.codComplejidad),
            complejidad: sanitizeText(data.complejidad),
            confirmaAutorizacion: sanitizeText(data.confirmaAutorizacion),
            numeroAutorizacion: sanitizeAuthorizationCode(data.numeroAutorizacion),
            copagoValor: sanitizeAmount(data.copagoValor),
            servicioParticularValor: sanitizeAmount(data.servicioParticularValor),
            codCIE: sanitizeText(data.codCIE).toUpperCase(),
            buscarCIE: sanitizeText(data.buscarCIE),
            idOrigen: sanitizeText(data.idOrigen),
            nombreOrigen: sanitizeText(data.nombreOrigen),
            direccionOrigen: sanitizeText(data.direccionOrigen),
            ciudadOrigen: sanitizeText(data.ciudadOrigen),
            telefonoOrigen: sanitizeText(data.telefonoOrigen),
            idDestino1: sanitizeText(data.idDestino1),
            nombreDestino1: sanitizeText(data.nombreDestino1),
            direccionDestino1: sanitizeText(data.direccionDestino1),
            ciudadDestino1: sanitizeText(data.ciudadDestino1),
            telefonoDestino1: sanitizeText(data.telefonoDestino1),
            idEntidad: sanitizeText(data.idEntidad),
            idSucursal: sanitizeText(data.idSucursal),
            observaciones: sanitizeText(data.observaciones),
        });

        const validateFormData = (data) => {
            if (!data.paciente || data.paciente.length < 3) return 'Ingrese un nombre de paciente válido.';
            if (!data.solicitante || data.solicitante.length < 3) return 'Ingrese un solicitante válido.';
            if (!data.idEntidad) return 'Debe seleccionar una entidad.';
            if (!data.idSucursal) return 'Debe seleccionar una sucursal.';
            if (!data.codComplejidad || !data.complejidad) return 'Debe seleccionar una complejidad válida.';
            if (!['Si', 'No'].includes(data.confirmaAutorizacion)) return 'Indique si confirma autorización.';
            if (data.confirmaAutorizacion === 'Si' && !data.numeroAutorizacion) return 'Número de autorización requerido cuando confirma es Sí.';
            if (!data.servicioProgramado || !data.servicioSolicitado) return 'Complete la programación del servicio.';
            if (!data.codCIE || !data.buscarCIE) return 'Debe diligenciar un diagnóstico CIE válido.';
            if (!data.nombreOrigen || data.nombreOrigen.length < 3) return 'Debe diligenciar un origen válido.';
            if (!data.nombreDestino1 || data.nombreDestino1.length < 3) return 'Debe diligenciar un destino válido.';
            if (data.esServicioParticular) {
                if (!data.servicioParticularValor || Number(data.servicioParticularValor) <= 0) return 'El valor de servicio particular debe ser mayor que cero.';
            }
            return '';
        };

        e.preventDefault();
        if (!canSubmit) return;

        const toTimestamp = (v) => {
            if (!v) return null;
            const d = new Date(v);
            return isNaN(d.getTime()) ? null : Timestamp.fromDate(d);
        };

        const sanitized = sanitizeFormData(formData);
        const validationError = validateFormData(sanitized);
        if (validationError) {
            setSubmitError(validationError);
            return;
        }

        const id = isEditing ? initialData?.id : getNextReqId();
        if (!id) return;
        const newRequest = {
            id,
            estado: isEditing ? (initialData?.estado ?? 'Pendiente') : 'Pendiente',
            creadoAt: Timestamp.now(),
            tiempoEsperaMin: 0,

            // Keep summary fields at root for compatibility with current UI.
            paciente: sanitized.paciente,
            clienteId: sanitized.idEntidad || sanitized.clienteId || '',
            origen: sanitized.nombreOrigen || sanitized.direccionOrigen || 'Origen no especificado',
            destino: sanitized.nombreDestino1 || sanitized.direccionDestino1 || 'Destino no especificado',

            pacienteInfo: {
                idPacienteHC: sanitized.idPacienteHC,
                tipoIdentidad: sanitized.tipoIdentidad,
                nombre: sanitized.paciente,
                sexo: sanitized.sexo,
                fechaNacimiento: sanitized.fechaNacimiento,
                edad: sanitized.edad,
                tipoEdad: sanitized.tipoEdad,
            },
            solicitanteInfo: {
                idSolicitante: sanitized.idSolicitante,
                nombre: sanitized.solicitante,
                observaciones: sanitized.observacionesSolicita,
            },
            entidadInfo: {
                idEntidad: sanitized.idEntidad || '',
                nombreEntidad: sanitized.nombreEntidad || sanitized.entidadSolicitante || '',
                entidadSolicitante: sanitized.entidadSolicitante || sanitized.nombreEntidad || '',
                idSucursal: sanitized.idSucursal || sanitized.codSucursal || '',
                nombreSucursal: sanitized.nombreSucursal || sanitized.sucursal || '',
                sucursal: sanitized.sucursal || sanitized.nombreSucursal || '',
            },
            servicioInfo: {
                codComplejidad: sanitized.codComplejidad,
                complejidad: sanitized.complejidad,
                confirmaAutorizacion: sanitized.confirmaAutorizacion,
                numeroAutorizacion: sanitized.numeroAutorizacion,
                copagoValor: sanitized.copagoValor,
                esServicioParticular: sanitized.esServicioParticular,
                servicioParticularValor: sanitized.servicioParticularValor,
            },
            programacionInfo: {
                servicioProgramado: toTimestamp(sanitized.servicioProgramado),
                servicioSolicitado: toTimestamp(sanitized.servicioSolicitado),
            },
            diagnosticoInfo: {
                codCIE: sanitized.codCIE,
                nombreCIE: sanitized.buscarCIE,
                observacionesCIE: sanitized.observacionesCIE,
                estadoClinicoActual: sanitized.estadoClinicoActual,
            },
            origenInfo: {
                id: sanitized.idOrigen,
                nombre: sanitized.nombreOrigen,
                observaciones: sanitized.observacionesOrigen,
                direccion: sanitized.direccionOrigen,
                ciudad: sanitized.ciudadOrigen,
                telefono: sanitized.telefonoOrigen,
                fechaHoraContacto: toTimestamp(sanitized.fechaHoraContacto),
                fechaHoraSalida: toTimestamp(sanitized.fechaHoraSaleOrigen),
            },
            destino1Info: {
                id: sanitized.idDestino1,
                nombre: sanitized.nombreDestino1,
                observaciones: sanitized.observacionesDestino1,
                direccion: sanitized.direccionDestino1,
                ciudad: sanitized.ciudadDestino1,
                telefono: sanitized.telefonoDestino1,
                fechaHoraEntrega: toTimestamp(sanitized.fechaHoraEntregaD1),
                fechaHoraSalida: toTimestamp(sanitized.fechaHoraSaleD1),
            },
            destino2Info: sanitized.idDestino2 ? {
                id: sanitized.idDestino2,
                nombre: sanitized.nombreDestino2,
                observaciones: sanitized.observacionesDestino2,
                direccion: sanitized.direccionDestino2,
                ciudad: sanitized.ciudadDestino2,
                telefono: sanitized.telefonoDestino2,
                fechaHoraEntrega: toTimestamp(sanitized.fechaHoraEntregaD2),
                fechaHoraSalida: toTimestamp(sanitized.fechaHoraSaleD2),
            } : null,
            observaciones: sanitized.observaciones,
        };

        setSubmitting(true);
        Promise.resolve(onSubmit(newRequest))
            .then(() => {
                setFormData(INITIAL_FORM_DATA);
                setSelectedBranchKey('');
                setCieLookupState({ loading: false, error: '', success: false });
                setComplexityLookupState({ error: '', success: false });
                setOriginLookupState({ error: '', success: false });
                setActiveTab('order');
                setSubmitError('');
                onClose();
            })
            .catch((error) => {
                setSubmitError(error?.message || 'No se pudo guardar la solicitud. Intente de nuevo.');
            })
            .finally(() => {
                setSubmitting(false);
            });
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
                        <h2 className="text-base md:text-lg font-bold text-white">{isEditing ? 'Editar orden de servicio' : 'Crear orden de servicio'}</h2>
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
                        cieLookupState={cieLookupState}
                        serviceTypeOptions={serviceTypeOptions}
                        serviceTypesState={serviceTypesState}
                        complexityLookupState={complexityLookupState}
                        onComplexityCodeKeyDown={handleComplexityCodeKeyDown}
                        onComplexityPickerChange={handleComplexityPickerChange}
                        showSecondDestination={showSecondDestination}
                        originOptions={originOptions}
                        origins={origins}
                        originsState={originsState}
                        originLookupState={originLookupState}
                        onOriginCodeKeyDown={handleOriginCodeKeyDown}
                        onOriginPickerChange={handleOriginPickerChange}
                        isManualOrigin={isManualOrigin}
                        hasAmbulanceAssigned={hasAmbulanceAssigned}
                        executionFieldsDisabledReason={executionFieldsDisabledReason}
                    />

                    {submitError && (
                        <p className="text-xs text-red-400 px-1">{submitError}</p>
                    )}

                    {/* Status Change Request Modal */}
                    {showStatusChangeModal && (
                        <>
                        <div className="p-4 border border-amber-500/30 bg-amber-500/10 rounded-lg space-y-3">
                            <div className="flex items-center gap-2 text-amber-400 font-semibold">
                                <AlertTriangle size={18} />
                                <span>Solicitar cambio de estado</span>
                            </div>
                            <p className="text-xs text-slate-400">
                                Esta solicitud será enviada para aprobación. El estado actual no cambiará hasta que sea aprobado.
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                {STATUS_CHANGE_REASONS.map((reason) => (
                                    <button
                                        key={reason.id}
                                        type="button"
                                        onClick={() => setSelectedStatusReason(reason.id)}
                                        className={`p-3 rounded-lg border text-left transition-all ${
                                            selectedStatusReason === reason.id
                                                ? 'border-amber-500 bg-amber-500/20 ring-1 ring-amber-500'
                                                : 'border-slate-600 hover:border-slate-500 bg-slate-800/50'
                                        }`}
                                    >
                                        <span className={`font-semibold text-sm ${
                                            selectedStatusReason === reason.id ? 'text-amber-400' : 'text-slate-200'
                                        }`}>
                                            {reason.label}
                                        </span>
                                        <p className="text-[10px] text-slate-400 mt-1">{reason.description}</p>
                                    </button>
                                ))}
                            </div>
                            <div>
                                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                                    Justificación (requerida)
                                </label>
                                <textarea
                                    value={statusChangeJustification}
                                    onChange={e => {
                                        setStatusChangeJustification(e.target.value);
                                        if (!justificationTouched) setJustificationTouched(true);
                                    }}
                                    onBlur={() => setJustificationTouched(true)}
                                    rows={3}
                                    placeholder="Describa el motivo del cambio de estado..."
                                    className={`w-full px-3 py-2 text-sm rounded-lg border bg-slate-800/50 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500 resize-y ${
                                        justificationTouched && !statusChangeJustification.trim()
                                            ? 'border-red-500'
                                            : 'border-slate-600'
                                    }`}
                                />
                                {justificationTouched && !statusChangeJustification.trim() && (
                                    <p className="text-xs text-red-400 mt-1">La justificación es obligatoria.</p>
                                )}
                            </div>
                            {statusChangeError && (
                                <p className="text-xs text-red-400">{statusChangeError}</p>
                            )}
                            <div className="flex gap-2 justify-end">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowStatusChangeModal(false);
                                        setSelectedStatusReason('');
                                        setStatusChangeJustification('');
                                        setStatusChangeError('');
                                    }}
                                    className="px-3 py-1.5 text-sm rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-700/40"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="button"
                                    onClick={handleStatusChangeClick}
                                    disabled={!selectedStatusReason || !statusChangeJustification.trim() || statusChangeSubmitting}
                                    className="px-3 py-1.5 text-sm rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold inline-flex items-center gap-1.5"
                                >
                                    {statusChangeSubmitting ? 'Enviando...' : 'Enviar solicitud'}
                                </button>
                            </div>
                        </div>
                        {/* Modal de confirmación */}
                        {showStatusChangeConfirm && (
                            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                                <div className="bg-dark-800 border border-slate-700 rounded-2xl shadow-2xl p-6 max-w-sm w-full animate-in fade-in zoom-in-95 duration-200">
                                    <h3 className="text-lg font-bold text-white mb-2">¿Desea confirmar el cambio de estado?</h3>
                                    <p className="text-sm text-slate-300 mb-4">Esto generará una solicitud de confirmación por parte de gerencia, y esta operación no se podrá reversar.</p>
                                    <div className="flex gap-3 justify-end">
                                        <button
                                            type="button"
                                            className="px-4 py-2 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-700/40"
                                            onClick={() => setShowStatusChangeConfirm(false)}
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            type="button"
                                            className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold"
                                            onClick={async () => {
                                                setShowStatusChangeConfirm(false);
                                                await handleStatusChangeRequest();
                                            }}
                                            disabled={statusChangeSubmitting}
                                        >
                                            Sí, confirmar
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                        </>
                    )}

                    <div className="pt-2 border-t border-slate-700 flex flex-col sm:flex-row gap-2 sm:justify-between shrink-0">
                        {/* Left side - Status change button (only when editing) */}
                        <div>
                            {isEditing && !showStatusChangeModal && (
                                <button
                                    type="button"
                                    onClick={() => setShowStatusChangeModal(true)}
                                    className="px-3 py-2 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors inline-flex items-center gap-2 text-sm"
                                >
                                    <Ban size={16} /> Solicitar cambio de estado
                                </button>
                            )}
                        </div>

                        {/* Right side - Cancel and Submit */}
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 rounded-lg border border-slate-600 text-slate-200 hover:bg-slate-700/40 transition-colors"
                            >
                                Cerrar
                            </button>
                            <button
                                type="submit"
                                disabled={!canSubmit || submitting}
                                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold inline-flex items-center justify-center gap-2 transition-colors"
                                title="Requiere: Paciente, Solicitante, Entidad, Complejidad, Autorizaciones, Programación, Diagnóstico CIE, Origen y Destino"
                            >
                                <Send size={16} /> {submitting ? 'Guardando...' : (isEditing ? 'Guardar Cambios' : 'Crear y Enviar a Triage')}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
};

export default NewServiceModal;
