import React, { useState, useEffect } from 'react';
import { X, CheckCircle, FileCheck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { storage } from '../firebase/config';

const HISTORIA_CLINICA_URL = '/api/historia-clinica';

const ServiceClosureModal = ({
    isOpen,
    onClose,
    servicio,
    cliente,
    onCerrarServicio,
    onSaveHistoriaClinicaFile,
    onClearHistoriaClinicaFile,
}) => {
    const { user } = useAuth();
    const [checklistItems, setChecklistItems] = useState({});
    const [historiaClinicaChecked, setHistoriaClinicaChecked] = useState(false);
    const [historiaClinicaValidated, setHistoriaClinicaValidated] = useState(false);
    const [historiaClinicaLoading, setHistoriaClinicaLoading] = useState(false);
    const [historiaClinicaError, setHistoriaClinicaError] = useState('');
    const [uploadingFile, setUploadingFile] = useState(false);
    const [removingFile, setRemovingFile] = useState(false);
    const [uploadedDoc, setUploadedDoc] = useState(null);

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
            setUploadingFile(false);
            setRemovingFile(false);
            setUploadedDoc(servicio?.historiaClinicaArchivo || null);
        }
    }, [isOpen, cliente, servicio]);

    if (!isOpen || !servicio || !cliente) return null;

    const allDocumentsChecked = Object.values(checklistItems).every(Boolean);
    const hasUploadedHistoriaClinica = Boolean(uploadedDoc?.url);
    const historiaClinicaReady = hasUploadedHistoriaClinica || (historiaClinicaValidated && historiaClinicaChecked);
    const allChecked = allDocumentsChecked && historiaClinicaReady;
    const isFinalized = String(servicio?.estado || '').trim() === 'Finalizado';

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
        
        return d.toISOString();
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

    const buildHistoriaClinicaStorageKey = () => {
        const pacienteInfo = servicio?.pacienteInfo || {};
        const idPaciente =
            pacienteInfo.idPacienteHC ||
            servicio?.solicitanteInfo?.idSolicitante ||
            servicio?.idPacienteHC ||
            servicio?.idSolicitante ||
            'SINPACIENTE';

        const raw = `${servicio?.id || 'SIN_SOLICITUD'}_${idPaciente}`;
        return raw.replace(/[^a-zA-Z0-9_-]/g, '_');
    };

    const sanitizeFileName = (fileName) => String(fileName || 'historia_clinica').replace(/[^a-zA-Z0-9._-]/g, '_');

    const handleUploadHistoriaClinica = async (event) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) return;

        if (isFinalized) {
            setHistoriaClinicaError('No se puede actualizar el documento porque el servicio ya está finalizado.');
            return;
        }

        setUploadingFile(true);
        setHistoriaClinicaError('');
        let uploadedPath = '';

        try {
            const folderKey = buildHistoriaClinicaStorageKey();
            const safeName = sanitizeFileName(file.name);
            const filePath = `historias_clinicas/${folderKey}/${Date.now()}_${safeName}`;
            uploadedPath = filePath;
            const storageRef = ref(storage, filePath);

            const uploadSnapshot = await uploadBytes(storageRef, file);
            const downloadUrl = await getDownloadURL(uploadSnapshot.ref);

            if (uploadedDoc?.path) {
                try {
                    await deleteObject(ref(storage, uploadedDoc.path));
                } catch (cleanupErr) {
                    console.warn('No se pudo eliminar el archivo anterior de historia clínica:', cleanupErr);
                }
            }

            const metadata = {
                path: filePath,
                url: downloadUrl,
                name: file.name,
                contentType: file.type || 'application/octet-stream',
                size: file.size || 0,
                uploadedBy: user?.uid || 'anonymous',
            };

            await onSaveHistoriaClinicaFile?.(servicio.id, metadata);
            setUploadedDoc(metadata);
        } catch (err) {
            if (uploadedPath) {
                try {
                    await deleteObject(ref(storage, uploadedPath));
                } catch {
                    // Ignore cleanup errors.
                }
            }
            setHistoriaClinicaError(err?.message || 'No se pudo subir la historia clínica.');
        } finally {
            setUploadingFile(false);
        }
    };

    const handleRemoveHistoriaClinica = async () => {
        if (!uploadedDoc?.path) return;

        if (isFinalized) {
            setHistoriaClinicaError('No se puede eliminar el documento porque el servicio ya está finalizado.');
            return;
        }

        setRemovingFile(true);
        setHistoriaClinicaError('');

        try {
            await deleteObject(ref(storage, uploadedDoc.path));
            await onClearHistoriaClinicaFile?.(servicio.id);
            setUploadedDoc(null);
        } catch (err) {
            setHistoriaClinicaError(err?.message || 'No se pudo eliminar la historia clínica.');
        } finally {
            setRemovingFile(false);
        }
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
            const authToken = await user?.getIdToken?.();
            const response = await fetch(HISTORIA_CLINICA_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {})
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
        <div className="fixed inset-0 bg-dark-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 modal-overlay-enter">
            <div className="bg-dark-800 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden modal-panel-enter">
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
                                <p className="text-xs text-slate-500 mt-1">Puedes validar o subir archivo.</p>
                            </div>
                            <button
                                type="button"
                                onClick={handleValidateHistoriaClinica}
                                disabled={historiaClinicaLoading || isFinalized}
                                className={`px-3 py-2 rounded-md text-xs font-bold transition-colors ${historiaClinicaLoading
                                    ? 'bg-slate-700 text-slate-400 cursor-wait'
                                    : 'bg-blue-600 hover:bg-blue-500 text-white'
                                    }`}
                            >
                                {historiaClinicaLoading ? 'Validando...' : 'Validar historia clínica'}
                            </button>
                        </div>

                        <div className="mt-3 rounded-lg border border-slate-700/70 bg-slate-800/20 p-3">
                            <div className="flex items-center justify-between gap-3 flex-wrap">
                                <div>
                                    <p className="text-xs font-semibold text-slate-300">Documento de cierre</p>
                                </div>

                                {!isFinalized && (
                                    <label className="inline-flex items-center gap-2 px-3 py-2 rounded-md text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer transition-colors">
                                        {uploadingFile ? 'Subiendo...' : (uploadedDoc ? 'Subir nuevo archivo' : 'Subir archivo')}
                                        <input
                                            type="file"
                                            accept=".pdf,.jpg,.jpeg,.png,.webp"
                                            className="hidden"
                                            disabled={uploadingFile || removingFile}
                                            onChange={handleUploadHistoriaClinica}
                                        />
                                    </label>
                                )}
                            </div>

                            {uploadedDoc ? (
                                <div className="mt-3">
                                    <a
                                        href={uploadedDoc.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-xs text-emerald-400 hover:text-emerald-300 underline break-all"
                                    >
                                        {uploadedDoc.name || 'Documento cargado'}
                                    </a>
                                    <div className="mt-2 flex items-center gap-2">
                                        <span className="text-[11px] text-emerald-400">Archivo cargado correctamente.</span>
                                        {!isFinalized && (
                                            <button
                                                type="button"
                                                onClick={handleRemoveHistoriaClinica}
                                                disabled={uploadingFile || removingFile}
                                                className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/30"
                                            >
                                                {removingFile ? 'Eliminando...' : 'Eliminar'}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <p className="text-[11px] text-slate-500 mt-3">No hay documento cargado.</p>
                            )}

                            {isFinalized && (
                                <p className="text-[11px] text-amber-400 mt-2">Servicio finalizado: la historia clínica ya no se puede actualizar.</p>
                            )}
                        </div>

                        <label className="mt-3 flex items-start gap-3 cursor-pointer group">
                            <div className="relative flex items-center justify-center mt-0.5">
                                <input
                                    type="checkbox"
                                    className="peer sr-only"
                                    checked={historiaClinicaChecked}
                                    disabled={!historiaClinicaValidated || hasUploadedHistoriaClinica}
                                    onChange={() => setHistoriaClinicaChecked(v => !v)}
                                />
                                <div className="w-5 h-5 rounded border-2 border-slate-600 bg-dark-900 peer-checked:bg-emerald-500 peer-checked:border-emerald-500 transition-colors"></div>
                                <CheckCircle size={14} className="absolute text-white opacity-0 peer-checked:opacity-100 transition-opacity" />
                            </div>
                            <span className="text-sm text-slate-300 group-hover:text-white select-none transition-colors">
                                Confirmo validación de historia clínica
                            </span>
                        </label>

                        {hasUploadedHistoriaClinica && (
                            <p className="text-xs text-emerald-400 mt-2">Cierre habilitado por documento cargado en Storage.</p>
                        )}

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
                            disabled={!allChecked || historiaClinicaLoading || uploadingFile || removingFile}
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
