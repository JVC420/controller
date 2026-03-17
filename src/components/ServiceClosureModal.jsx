import React, { useState, useEffect } from 'react';
import { X, CheckCircle, FileCheck } from 'lucide-react';

const HISTORIA_CLINICA_URL = import.meta.env.DEV
    ? '/api/historia-clinica/'
    : 'https://descargarhistoriaclinica-y25bumqpla-uc.a.run.app';

const ServiceClosureModal = ({ isOpen, onClose, servicio, cliente, onCerrarServicio }) => {
    const [checklistItems, setChecklistItems] = useState({});
    const [historiaClinicaChecked, setHistoriaClinicaChecked] = useState(false);
    const [historiaClinicaValidated, setHistoriaClinicaValidated] = useState(false);
    const [historiaClinicaLoading, setHistoriaClinicaLoading] = useState(false);
    const [historiaClinicaError, setHistoriaClinicaError] = useState('');

    // Initialize checklist state when modal opens or service changes
    useEffect(() => {
        if (isOpen && cliente?.documentos?.length) {
            const initialChecklist = {};
            cliente.documentos.forEach(item => {
                initialChecklist[item] = false;
            });
            setChecklistItems(initialChecklist);
        } else if (isOpen) {
            setChecklistItems({});
        }

        if (isOpen) {
            setHistoriaClinicaChecked(false);
            setHistoriaClinicaValidated(false);
            setHistoriaClinicaLoading(false);
            setHistoriaClinicaError('');
        }
    }, [isOpen, cliente]);

    if (!isOpen || !servicio || !cliente) return null;

    const allDocumentsChecked = Object.values(checklistItems).every(Boolean);
    const allChecked = allDocumentsChecked && historiaClinicaValidated && historiaClinicaChecked;

    const handleToggle = (item) => {
        setChecklistItems(prev => ({
            ...prev,
            [item]: !prev[item]
        }));
    };

    const normalizeIsoDate = (value) => {
        if (!value) return '';
        // Handle Firestore Timestamp objects
        let d;
        if (typeof value.toDate === 'function') {
            // It's a Firestore Timestamp
            d = value.toDate();
        } else {
            // It's a string or number
            d = new Date(value);
        }
        if (Number.isNaN(d.getTime())) return '';
        
        return formatBogotaLocal(d);
    };

    const formatBogotaLocal = (value) => {
        if (!value) return '';
        const d = typeof value.toDate === 'function' ? value.toDate() : new Date(value);
        if (Number.isNaN(d.getTime())) return '';
    
        const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Bogota',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
        }).formatToParts(d);
    
        const get = (type) => parts.find((p) => p.type === type)?.value || '';
    
        return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}:${get('second')}`;
    };

    const buildHistoriaClinicaPayload = () => {
        const pacienteInfo = servicio?.pacienteInfo || {};
        const origenInfo = servicio?.origenInfo || {};
        const destino1Info = servicio?.destino1Info || {};
        const destino2Info = servicio?.destino2Info || {};
        const idPaciente =
            pacienteInfo.idPacienteHC ||
            servicio?.solicitanteInfo?.idSolicitante ||
            servicio?.idPacienteHC ||
            servicio?.idSolicitante ||
            '';
        const startDate = normalizeIsoDate(origenInfo.fechaHoraContacto || servicio?.fechaHoraContacto);
        const endDate = normalizeIsoDate(destino2Info.fechaHoraSalida || destino1Info.fechaHoraSalida);
        console.log('Payload para historia clínica:', { idPaciente, startDate, endDate });
        return {
            idPaciente,
            startDate,
            endDate,
            status: '7'
        };
    };

    const handleValidateHistoriaClinica = async () => {
        const payload = buildHistoriaClinicaPayload();

        if (!payload.idPaciente || !payload.startDate || !payload.endDate) {
            setHistoriaClinicaValidated(false);
            setHistoriaClinicaChecked(false);
            setHistoriaClinicaError('No se pudo validar historia clínica: faltan datos (idPaciente, startDate o endDate).');
            return;
        }

        setHistoriaClinicaLoading(true);
        setHistoriaClinicaError('');

        try {
            const response = await fetch(HISTORIA_CLINICA_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const rawBody = await response.text();
            let json = {};
            if (rawBody) {
                try {
                    json = JSON.parse(rawBody);
                } catch {
                    json = { message: rawBody };
                }
            }

            if (!response.ok) {
                const backendMessage =
                    json?.message ||
                    json?.error ||
                    rawBody ||
                    `Error HTTP ${response.status}`;
                throw new Error(backendMessage);
            }

            if (json?.success !== true) {
                throw new Error('La respuesta de historia clínica no retornó success=true.');
            }

            setHistoriaClinicaValidated(true);
            setHistoriaClinicaChecked(true);
            setHistoriaClinicaError('');
        } catch (err) {
            setHistoriaClinicaValidated(false);
            setHistoriaClinicaChecked(false);
            setHistoriaClinicaError(err?.message || 'Falló la validación de historia clínica.');
        } finally {
            setHistoriaClinicaLoading(false);
        }
    };

    const handleConfirm = async () => {
        if (allChecked) {
            await onCerrarServicio(servicio.id, servicio.ambulanciaAsignada);
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 bg-dark-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-dark-800 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-700 flex justify-between items-center bg-dark-900/50">
                    <div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <FileCheck size={20} className="text-emerald-500" />
                            Cierre de Servicio
                        </h2>
                        <p className="text-xs text-slate-400 mt-1">
                            Requisitos obligatorios para <strong className="text-slate-300">{cliente.nombre}</strong>
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Form Body */}
                <div className="p-6">
                    <div className="mb-6 p-3 bg-dark-900 rounded-lg border border-slate-700 flex justify-between items-center">
                        <span className="text-sm text-slate-400">Servicio ID:</span>
                        <span className="font-mono font-bold text-white">{servicio.id}</span>
                    </div>

                    <h3 className="text-sm font-semibold text-slate-300 mb-4">Validación Documental Requerida</h3>

                    <div className="space-y-3 mb-8">
                        {cliente.documentos && cliente.documentos.length > 0 ? (
                            cliente.documentos.map((item, index) => (
                                <label key={index} className="flex items-start gap-3 cursor-pointer group">
                                    <div className="relative flex items-center justify-center mt-0.5">
                                        <input
                                            type="checkbox"
                                            className="peer sr-only"
                                            checked={!!checklistItems[item]}
                                            onChange={() => handleToggle(item)}
                                        />
                                        <div className="w-5 h-5 rounded border-2 border-slate-600 bg-dark-900 peer-checked:bg-emerald-500 peer-checked:border-emerald-500 transition-colors"></div>
                                        <CheckCircle size={14} className="absolute text-white opacity-0 peer-checked:opacity-100 transition-opacity" />
                                    </div>
                                    <span className="text-sm text-slate-300 group-hover:text-white select-none transition-colors">
                                        {item}
                                    </span>
                                </label>
                            ))
                        ) : (
                            <p className="text-sm text-slate-500 italic">No hay requisitos de cierre configurados para este cliente.</p>
                        )}
                    </div>

                    <div className="mb-6 p-3 bg-dark-900 rounded-lg border border-slate-700">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <h4 className="text-sm font-semibold text-slate-300">Historia clínica</h4>
                                <p className="text-xs text-slate-500 mt-1">Debe validar success=true para habilitar el cierre.</p>
                            </div>
                            <button
                                type="button"
                                onClick={handleValidateHistoriaClinica}
                                disabled={historiaClinicaLoading}
                                className={`px-3 py-2 rounded-md text-xs font-bold transition-colors ${historiaClinicaLoading
                                    ? 'bg-slate-700 text-slate-400 cursor-wait'
                                    : 'bg-blue-600 hover:bg-blue-500 text-white'
                                    }`}
                            >
                                {historiaClinicaLoading ? 'Validando...' : 'Validar historia clínica'}
                            </button>
                        </div>

                        <label className="mt-3 flex items-start gap-3 cursor-pointer group">
                            <div className="relative flex items-center justify-center mt-0.5">
                                <input
                                    type="checkbox"
                                    className="peer sr-only"
                                    checked={historiaClinicaChecked}
                                    disabled={!historiaClinicaValidated}
                                    onChange={() => setHistoriaClinicaChecked(v => !v)}
                                />
                                <div className="w-5 h-5 rounded border-2 border-slate-600 bg-dark-900 peer-checked:bg-emerald-500 peer-checked:border-emerald-500 transition-colors"></div>
                                <CheckCircle size={14} className="absolute text-white opacity-0 peer-checked:opacity-100 transition-opacity" />
                            </div>
                            <span className="text-sm text-slate-300 group-hover:text-white select-none transition-colors">
                                Confirmo validación de historia clínica
                            </span>
                        </label>

                        {historiaClinicaValidated && (
                            <p className="text-xs text-emerald-400 mt-2">Historia clínica validada correctamente (success=true).</p>
                        )}
                        {historiaClinicaError && (
                            <p className="text-xs text-red-400 mt-2">{historiaClinicaError}</p>
                        )}
                    </div>

                    {/* Footer Actions */}
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 px-4 py-2.5 bg-dark-900 hover:bg-slate-700 border border-slate-600 rounded-lg text-slate-300 font-semibold transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleConfirm}
                            disabled={!allChecked || historiaClinicaLoading}
                            className={`flex-1 px-4 py-2.5 rounded-lg font-bold flex justify-center items-center gap-2 transition-all shadow-lg ${allChecked
                                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/30'
                                : 'bg-slate-700 text-slate-500 cursor-not-allowed border border-slate-600'
                                }`}
                        >
                            <FileCheck size={18} />
                            Finalizar Servicio
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ServiceClosureModal;
