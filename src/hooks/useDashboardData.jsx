import { useState, useEffect, useCallback, useMemo } from 'react';
import {
    collection, doc, getDoc, onSnapshot, query, where,
    addDoc, updateDoc, setDoc, deleteDoc,
    writeBatch, serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import {
    AMBULANCE_OPERATIONAL_STATUS,
    canAssignRequestToAmbulance,
    getAmbulanceOperationalStatus,
} from '../utils/fleetStatus';
import { getShiftTimeSemantics } from '../utils/shiftOperations';

// ─── Normalize Firestore Timestamps to ISO strings on read ───────────────────
const normalizeDoc = (data) => {
    if (!data || typeof data !== 'object') return data;
    if (typeof data.toDate === 'function') {
        return data.toDate().toISOString();
    }
    if (Array.isArray(data)) {
        return data.map(normalizeDoc);
    }
    const result = {};
    for (const key of Object.keys(data)) {
        result[key] = normalizeDoc(data[key]);
    }
    return result;
};

const sanitizeText = (value) => String(value ?? '').replace(/\s+/g, ' ').trim();
const buildPatientCacheId = (tipoIdentidad, idPacienteHC) => {
    const tipo = sanitizeText(tipoIdentidad).toUpperCase();
    const id = sanitizeText(idPacienteHC).replace(/\s+/g, '').toUpperCase();
    if (!tipo || !id) return '';
    return `${tipo}_${id}`;
};

const upsertPatientCache = async ({ solicitudId, pacienteInfo }) => {
    const cacheId = buildPatientCacheId(pacienteInfo?.tipoIdentidad, pacienteInfo?.idPacienteHC);
    if (!cacheId) return;

    const ref = doc(db, 'pacientes_cache', cacheId);
    const current = await getDoc(ref);

    const payload = {
        idPacienteHC: sanitizeText(pacienteInfo?.idPacienteHC),
        tipoIdentidad: sanitizeText(pacienteInfo?.tipoIdentidad).toUpperCase(),
        nombre: sanitizeText(pacienteInfo?.nombre),
        sexo: sanitizeText(pacienteInfo?.sexo),
        fechaNacimiento: sanitizeText(pacienteInfo?.fechaNacimiento),
        edad: sanitizeText(pacienteInfo?.edad),
        tipoEdad: sanitizeText(pacienteInfo?.tipoEdad),
        updatedAt: serverTimestamp(),
        lastSolicitudId: sanitizeText(solicitudId),
    };

    if (!current.exists()) {
        payload.createdAt = serverTimestamp();
    }

    await setDoc(ref, payload, { merge: true });
};

const assertValidRequestPayload = (data) => {
    const paciente = sanitizeText(data?.pacienteInfo?.nombre || data?.paciente);
    const solicitante = sanitizeText(data?.solicitanteInfo?.nombre);
    const idEntidad = sanitizeText(data?.entidadInfo?.idEntidad || data?.clienteId);
    const codComplejidad = sanitizeText(data?.servicioInfo?.codComplejidad);
    const confirmaAutorizacion = sanitizeText(data?.servicioInfo?.confirmaAutorizacion);
    const codCIE = sanitizeText(data?.diagnosticoInfo?.codCIE);
    const nombreOrigen = sanitizeText(data?.origenInfo?.nombre || data?.origen);
    const nombreDestino = sanitizeText(data?.destino1Info?.nombre || data?.destino);

    if (!paciente || paciente.length < 3) throw new Error('Paciente inválido.');
    if (!solicitante || solicitante.length < 3) throw new Error('Solicitante inválido.');
    if (!idEntidad) throw new Error('Entidad inválida.');
    if (!codComplejidad) throw new Error('Complejidad inválida.');
    if (!['Si', 'No'].includes(confirmaAutorizacion)) throw new Error('Confirma autorización inválido.');
    if (confirmaAutorizacion === 'Si' && !sanitizeText(data?.servicioInfo?.numeroAutorizacion)) {
        throw new Error('Número de autorización requerido.');
    }
    if (!data?.programacionInfo?.servicioProgramado || !data?.programacionInfo?.servicioSolicitado) {
        throw new Error('Programación del servicio incompleta.');
    }
    if (!codCIE) throw new Error('Diagnóstico CIE inválido.');
    if (!nombreOrigen || nombreOrigen.length < 3) throw new Error('Origen inválido.');
    if (!nombreDestino || nombreDestino.length < 3) throw new Error('Destino inválido.');

    const esParticular = Boolean(data?.servicioInfo?.esServicioParticular);
    const copago = Number(String(data?.servicioInfo?.copagoValor ?? '').replace(/[^\d.-]/g, ''));
    const valorParticular = Number(String(data?.servicioInfo?.servicioParticularValor ?? '').replace(/[^\d.-]/g, ''));
    if (esParticular && !(valorParticular > 0)) {
        throw new Error('Valor de servicio particular inválido.');
    }
    if (!esParticular && data?.servicioInfo?.copagoValor !== '' && !Number.isNaN(copago) && copago < 0) {
        throw new Error('Copago inválido.');
    }
};

// ─── Fallback metrics (computed locally until analytics module is built) ──────
const STATIC_METRICAS = { flotaOperativa: "85%", tiempoPromedioRespuesta: "18 min", serviciosHoy: 24 };
const SESION_ACTUAL = { usuario: "Carlos", rol: "admin" };

const PRENOMINA_MOCK = [
    { id_empleado: "EMP-01", nombre: "Dr. Ramírez", ordinariasDiurnas: 120, ordinariasNocturnas: 24, hed: 5, hen: 2, dominicalesFestivos: 16, ausencias: 0 },
    { id_empleado: "EMP-02", nombre: "Juan Pérez", ordinariasDiurnas: 130, ordinariasNocturnas: 10, hed: 2, hen: 0, dominicalesFestivos: 8, ausencias: 1 }
];

const TERMINAL_HISTORY_STATES = ['Finalizado', 'Fallido', 'Cancelado', 'Negado'];

// ─── Optimization: only these states use a real-time listener ─────────────────
const ACTIVE_STATES = ['Pendiente', 'Asignado', 'En Traslado', 'En Punto', 'En revisión'];
// How many days of turnos to keep in real-time listener
const TURNOS_LOOKBACK_DAYS = 90;

// ─── localStorage cache helpers ──────────────────────────────────────────────
const CACHE_PREFIX = 'lma_cache_';
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

const readCache = (key) => {
    try {
        const raw = localStorage.getItem(CACHE_PREFIX + key);
        if (!raw) return null;
        const { data, ts } = JSON.parse(raw);
        if (Date.now() - ts > CACHE_TTL_MS) { localStorage.removeItem(CACHE_PREFIX + key); return null; }
        return data;
    } catch { return null; }
};

const writeCache = (key, data) => {
    try { localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ data, ts: Date.now() })); }
    catch { /* quota exceeded — ignore */ }
};

// ─── Route → required collections mapping ────────────────────────────────────
// Each route declares which Firestore collections it needs active listeners for.
const ROUTE_NEEDS = {
    '/':            { flota: true, solicitudes: true, clientes: true, turnos: true, empleados: false, statusLog: false },
    '/historial':   { flota: false, solicitudes: true, clientes: true, turnos: false, empleados: false, statusLog: false },
    '/metricas':    { flota: true, solicitudes: true, clientes: false, turnos: true, empleados: false, statusLog: true },
    '/directorio':  { flota: false, solicitudes: false, clientes: true, turnos: false, empleados: false, statusLog: false },
    '/personal':    { flota: true, solicitudes: false, clientes: false, turnos: true, empleados: true, statusLog: false },
};

// ─── Hook ─────────────────────────────────────────────────────────────────────
export const useDashboardData = (activeRoute = '/') => {
    const { role } = useAuth();
    const needs = ROUTE_NEEDS[activeRoute] || ROUTE_NEEDS['/'];
    const [sesionActual] = useState(SESION_ACTUAL);
    const [metricas] = useState(STATIC_METRICAS);
    const [prenominaMensual] = useState(PRENOMINA_MOCK);

    const [clientes, setClientes] = useState(() => readCache('clientes') || []);
    const [flota, setFlota] = useState([]);
    // Solicitudes: active (real-time) + historical (one-time fetch) + session-closed
    const [activeSolicitudes, setActiveSolicitudes] = useState([]);
    const [historicalSolicitudes, setHistoricalSolicitudes] = useState([]);
    const [sessionFinalized, setSessionFinalized] = useState([]);
    const [empleados, setEmpleados] = useState([]);
    const [turnos, setTurnos] = useState([]);
    const [flotaStatusLog, setFlotaStatusLog] = useState([]);

    const [loading, setLoading] = useState(true);

    // ── Merge all solicitudes sources into a single list ──────────────────────
    const solicitudes = useMemo(() => {
        const map = new Map();
        activeSolicitudes.forEach(s => map.set(s.id, s));
        sessionFinalized.forEach(s => { if (!map.has(s.id)) map.set(s.id, s); });
        historicalSolicitudes.forEach(s => { if (!map.has(s.id)) map.set(s.id, s); });
        return Array.from(map.values());
    }, [activeSolicitudes, sessionFinalized, historicalSolicitudes]);

    // ── Role-based collection access ──────────────────────────────────────────
    const canReadClientes = role === 'controlador' || role === 'administrador_general';
    const canReadEmpleados = role === 'recurso_humano' || role === 'administrador_general';
    const canReadTurnos = role === 'recurso_humano' || role === 'administrador_general';
    // flota and solicitudes are accessible to all authenticated roles

    // ── Route-aware Firestore listeners ─────────────────────────────────────────
    // Listeners subscribe/unsubscribe as the user navigates between routes.
    // This dramatically reduces reads when the user is on a route that doesn't need
    // certain collections (e.g. /personal doesn't need solicitudes).
    useEffect(() => {
        if (!role) return;

        const unsubs = [];
        let resolved = 0;

        // Count how many async sources we expect before marking loading=false
        const wantClientes   = canReadClientes && needs.clientes;
        const wantFlota       = needs.flota;
        const wantSol         = needs.solicitudes;
        const wantEmpleados   = canReadEmpleados && needs.empleados;
        const wantTurnos      = canReadTurnos && needs.turnos;
        const wantStatusLog   = needs.statusLog;
        const total = (wantFlota ? 1 : 0) + (wantSol ? 2 : 0) + (wantClientes ? 1 : 0)
                    + (wantEmpleados ? 1 : 0) + (wantTurnos ? 1 : 0) + (wantStatusLog ? 1 : 0);
        // If nothing is needed, resolve immediately
        if (total === 0) { setLoading(false); return; }
        const tryResolve = () => { resolved++; if (resolved >= total) setLoading(false); };

        // Clientes — small & stable, cached in localStorage
        if (wantClientes) {
            unsubs.push(onSnapshot(collection(db, 'clientes'), snap => {
                const data = snap.docs.map(d => ({ id: d.id, ...normalizeDoc(d.data()) }));
                setClientes(data);
                writeCache('clientes', data);
                tryResolve();
            }, console.error));
        }

        // Flota — small & stable
        if (wantFlota) {
            unsubs.push(onSnapshot(collection(db, 'flota'), snap => {
                setFlota(snap.docs.map(d => ({ id: d.id, ...normalizeDoc(d.data()) })));
                tryResolve();
            }, console.error));
        }

        // Solicitudes ACTIVE — real-time for operational states
        if (wantSol) {
            unsubs.push(onSnapshot(
                query(collection(db, 'solicitudes'), where('estado', 'in', ACTIVE_STATES)),
                snap => {
                    setActiveSolicitudes(snap.docs.map(d => ({ id: d.id, ...normalizeDoc(d.data()) })));
                    tryResolve();
                }, console.error));

            // Solicitudes terminales — real-time para historial/lista (Finalizado/Fallido/Cancelado/Negado)
            unsubs.push(onSnapshot(
                query(collection(db, 'solicitudes'), where('estado', 'in', TERMINAL_HISTORY_STATES)),
                snap => {
                    setHistoricalSolicitudes(snap.docs.map(d => ({ id: d.id, ...normalizeDoc(d.data()) })));
                    tryResolve();
                },
                (err) => {
                    console.error('Error listening terminal solicitudes:', err);
                    tryResolve();
                }
            ));
        }

        // Empleados
        if (wantEmpleados) {
            unsubs.push(onSnapshot(collection(db, 'empleados'), snap => {
                setEmpleados(snap.docs.map(d => ({ id: d.id, ...normalizeDoc(d.data()) })));
                tryResolve();
            }, console.error));
        }

        // Turnos — date-filtered: only last TURNOS_LOOKBACK_DAYS days
        if (wantTurnos) {
            const cutoff = new Date();
            cutoff.setDate(cutoff.getDate() - TURNOS_LOOKBACK_DAYS);
            const cutoffStr = cutoff.toISOString().split('T')[0];
            unsubs.push(onSnapshot(
                query(collection(db, 'turnos'), where('fecha', '>=', cutoffStr)),
                snap => {
                    setTurnos(snap.docs.map(d => ({ id: d.id, ...normalizeDoc(d.data()) })));
                    tryResolve();
                }, console.error));
        }

        // Fleet Status Log — date-filtered for metrics
        if (wantStatusLog) {
            const cutoff = new Date();
            cutoff.setDate(cutoff.getDate() - TURNOS_LOOKBACK_DAYS);
            unsubs.push(onSnapshot(
                query(collection(db, 'flotaStatusLog'), where('timestamp', '>=', cutoff)),
                snap => {
                    setFlotaStatusLog(snap.docs.map(d => ({ id: d.id, ...normalizeDoc(d.data()) })));
                    tryResolve();
                }, console.error));
        }

        return () => unsubs.forEach(fn => fn());
    }, [role, activeRoute]);

    // ── Helpers (memoized) ────────────────────────────────────────────────────
    const clientesMap = useMemo(() => {
        const m = new Map();
        clientes.forEach(c => m.set(c.id, c));
        return m;
    }, [clientes]);
    const getClienteById = useCallback((id) => clientesMap.get(id), [clientesMap]);

    const syncAmbulanceOperationalFields = useCallback(async (ambulance, turnosOverride) => {
        if (!ambulance?.id) return;

        const turnosToUse = turnosOverride || turnos;
        const nextOperationalStatus = getAmbulanceOperationalStatus(ambulance, turnosToUse);
        const currentOperationalStatus = ambulance.estadoOperativo || '';
        if (currentOperationalStatus === nextOperationalStatus) return;

        const patch = {
            estadoOperativo: nextOperationalStatus,
            estadoOperativoActualizadoAt: serverTimestamp(),
        };

        if (nextOperationalStatus === AMBULANCE_OPERATIONAL_STATUS.INCOMPLETE_CREW) {
            patch.tripulacionIncompletaDesde = serverTimestamp();
            patch.listaAsignacionDesde = null;
        } else if (nextOperationalStatus === AMBULANCE_OPERATIONAL_STATUS.AVAILABLE) {
            patch.lastAvailableAt = serverTimestamp();
            patch.listaAsignacionDesde = serverTimestamp();
            patch.tripulacionIncompletaDesde = null;
        } else {
            patch.listaAsignacionDesde = null;
            patch.tripulacionIncompletaDesde = null;
        }

        await updateDoc(doc(db, 'flota', ambulance.id), patch);
    }, [turnos]);

    // ── CLIENT Operations ─────────────────────────────────────────────────────
    const createClient = async (clientObj) => {
        const { id, ...data } = clientObj;
        if (id) {
            await setDoc(doc(db, 'clientes', id), data);
        } else {
            await addDoc(collection(db, 'clientes'), data);
        }
    };

    const updateClient = async (clientObj) => {
        const { id, ...data } = clientObj;
        if (!id) return;
        await updateDoc(doc(db, 'clientes', id), data);
    };

    // ── FLEET Operations ──────────────────────────────────────────────────────
    const createRealAmbulance = async (ambulanceObj) => {
        const { id, ...data } = ambulanceObj;
        if (!data.estado) {
            data.estado = 'Disponible';
        }
        data.estadoOperativo = AMBULANCE_OPERATIONAL_STATUS.INCOMPLETE_CREW;
        data.estadoOperativoActualizadoAt = serverTimestamp();
        data.tripulacionIncompletaDesde = serverTimestamp();
        data.listaAsignacionDesde = null;
        if (id) {
            await setDoc(doc(db, 'flota', id), data);
        } else {
            await addDoc(collection(db, 'flota'), data);
        }
    };

    const updateAmbulanceStatus = async (ambulanceId, newStatus) => {
        const ref = doc(db, 'flota', ambulanceId);
        const update = { estado: newStatus };
        if (newStatus === 'Disponible') {
            update.destino = null;
            update.lastAvailableAt = serverTimestamp();
            update.estadoOperativo = AMBULANCE_OPERATIONAL_STATUS.AVAILABLE;
            update.estadoOperativoActualizadoAt = serverTimestamp();
            update.listaAsignacionDesde = serverTimestamp();
            update.tripulacionIncompletaDesde = null;
        } else if (newStatus === 'Fuera de Servicio') {
            update.destino = null;
            update.estadoOperativo = AMBULANCE_OPERATIONAL_STATUS.OUT_OF_SERVICE;
            update.estadoOperativoActualizadoAt = serverTimestamp();
            update.listaAsignacionDesde = null;
            update.tripulacionIncompletaDesde = null;
        }
        await updateDoc(ref, update);
    };

    // ── Sequential REQ-ID generator ────────────────────────────────────────────
    const getNextReqId = useCallback(() => {
        const maxNum = solicitudes.reduce((max, s) => {
            const m = (s.id || '').match(/^REQ-(\d+)$/);
            return m ? Math.max(max, parseInt(m[1], 10)) : max;
        }, 0);
        return `REQ-${String(maxNum + 1).padStart(3, '0')}`;
    }, [solicitudes]);

    // ── Sequential CLI-ID generator ────────────────────────────────────────────
    const getNextClientId = useCallback(() => {
        const maxNum = clientes.reduce((max, c) => {
            const m = (c.id || '').match(/^CLI-(\d+)$/);
            return m ? Math.max(max, parseInt(m[1], 10)) : max;
        }, 0);
        return `CLI-${String(maxNum + 1).padStart(3, '0')}`;
    }, [clientes]);

    // ── SERVICE Operations ────────────────────────────────────────────────────
    const createRealRequest = async (requestObj) => {
        const { id, ...data } = requestObj;
        assertValidRequestPayload(data);
        data.creadoAt = serverTimestamp();
        let solicitudId = id;
        if (id) {
            await setDoc(doc(db, 'solicitudes', id), data);
        } else {
            const createdRef = await addDoc(collection(db, 'solicitudes'), data);
            solicitudId = createdRef.id;
        }

        try {
            await upsertPatientCache({
                solicitudId,
                pacienteInfo: data?.pacienteInfo || {},
            });
        } catch (error) {
            console.warn('No se pudo actualizar pacientes_cache:', error);
        }
    };

    const updateRealRequest = async (requestObj) => {
        const { id, ...data } = requestObj;
        if (!id) return;
        assertValidRequestPayload(data);
        data.actualizadoAt = serverTimestamp();
        await updateDoc(doc(db, 'solicitudes', id), data);
    };

    const assignAmbulance = async (reqId, ambulanceId) => {
        const ambulance = flota.find((a) => a.id === ambulanceId);
        if (!ambulance) {
            throw new Error('Ambulancia no encontrada.');
        }
        if (!canAssignRequestToAmbulance(ambulance, turnos)) {
            throw new Error('No se puede asignar: la ambulancia no tiene la tripulación completa.');
        }

        const batch = writeBatch(db);
        batch.update(doc(db, 'solicitudes', reqId), {
            estado: 'Asignado',
            ambulanciaAsignada: ambulanceId,
            asignadoAt: serverTimestamp()
        });
        batch.update(doc(db, 'flota', ambulanceId), {
            estado: 'En Servicio',
            destino: 'Solicitud Asignada',
            estadoOperativo: AMBULANCE_OPERATIONAL_STATUS.IN_SERVICE,
            estadoOperativoActualizadoAt: serverTimestamp(),
            listaAsignacionDesde: null,
            tripulacionIncompletaDesde: null,
        });
        await batch.commit();
    };

    const closeService = async (reqId, ambulanceId) => {
        // Capture current state before Firestore removes it from active listener
        const currentSol = activeSolicitudes.find(s => s.id === reqId);

        const batch = writeBatch(db);
        batch.update(doc(db, 'solicitudes', reqId), {
            estado: 'Finalizado',
            finalizadoAt: serverTimestamp()
        });
        if (ambulanceId) {
            batch.update(doc(db, 'flota', ambulanceId), {
                estado: 'Disponible',
                destino: null,
                lastAvailableAt: serverTimestamp(),
                estadoOperativo: AMBULANCE_OPERATIONAL_STATUS.AVAILABLE,
                estadoOperativoActualizadoAt: serverTimestamp(),
                listaAsignacionDesde: serverTimestamp(),
                tripulacionIncompletaDesde: null,
            });
        }
        await batch.commit();

        // Track locally for instant UI feedback (service stays visible as Finalizado)
        if (currentSol) {
            setSessionFinalized(prev => [...prev, {
                ...currentSol,
                estado: 'Finalizado',
                finalizadoAt: new Date().toISOString()
            }]);
        }
    };

    const updateServiceChecklist = async (reqId, checklist) => {
        await updateDoc(doc(db, 'solicitudes', reqId), { checklist });
    };

    // Cambia estado a 'En revisión', guarda justificación y desasigna ambulancia si aplica
    const requestStatusToReview = async (reqId, justification) => {
        // Obtener la solicitud actual
        const req = solicitudes.find(s => s.id === reqId);
        if (!req) throw new Error('Solicitud no encontrada');

        const batch = writeBatch(db);

        // Actualizar solicitud: estado, justificación, bloquear edición y desasignar ambulancia
        const solicitudUpdate = {
            estado: 'En revisión',
            justificacionCambioEstado: justification,
            puedeEditar: false,
            actualizadoAt: serverTimestamp(),
        };

        // Si tiene ambulancia asignada, incluir desasignación en el mismo update
        if (req.ambulanciaAsignada) {
            solicitudUpdate.ambulanciaAsignada = null;

            // Liberar la ambulancia
            batch.update(doc(db, 'flota', req.ambulanciaAsignada), {
                estado: 'Disponible',
                destino: null,
                lastAvailableAt: serverTimestamp(),
                estadoOperativo: AMBULANCE_OPERATIONAL_STATUS.AVAILABLE,
                estadoOperativoActualizadoAt: serverTimestamp(),
                listaAsignacionDesde: serverTimestamp(),
                tripulacionIncompletaDesde: null,
            });
        }

        batch.update(doc(db, 'solicitudes', reqId), solicitudUpdate);
        await batch.commit();
    };

    // Marca solicitud como fallida.
    // Si está asignada, se devuelve a triage (Pendiente) y se libera la ambulancia.
    const markRequestAsFailed = async (reqId, justification) => {
        const req = solicitudes.find(s => s.id === reqId);
        if (!req) throw new Error('Solicitud no encontrada');

        const batch = writeBatch(db);
        const hasAssignedAmbulance = Boolean(req.ambulanciaAsignada);

        const solicitudUpdate = {
            estado: 'Fallido',
            justificacionCambioEstado: justification,
            puedeEditar: hasAssignedAmbulance,
            ambulanciaAsignada: null,
            asignadoAt: null,
            actualizadoAt: serverTimestamp(),
        };

        if (hasAssignedAmbulance) {
            batch.update(doc(db, 'flota', req.ambulanciaAsignada), {
                estado: 'Disponible',
                destino: null,
                lastAvailableAt: serverTimestamp(),
                estadoOperativo: AMBULANCE_OPERATIONAL_STATUS.AVAILABLE,
                estadoOperativoActualizadoAt: serverTimestamp(),
                listaAsignacionDesde: serverTimestamp(),
                tripulacionIncompletaDesde: null,
            });
        }

        batch.update(doc(db, 'solicitudes', reqId), solicitudUpdate);
        await batch.commit();
    };

    // ── EMPLOYEE Operations ───────────────────────────────────────────────────
    const addEmpleado = async (empObj) => {
        const { id, ...data } = empObj;
        if (id) {
            await setDoc(doc(db, 'empleados', id), data);
        } else {
            await addDoc(collection(db, 'empleados'), data);
        }
    };

    const updateEmpleado = async (empId, changes) => {
        await updateDoc(doc(db, 'empleados', empId), changes);
    };

    // ── SHIFT Operations ──────────────────────────────────────────────────────
    const addTurno = async (turnoObj) => {
        const { id, ...data } = turnoObj;
        const semantics = getShiftTimeSemantics(data);
        data.finProgramado = data.finProgramado || data.horaFin || '';
        data.planningStatus = data.planningStatus || semantics.planningStatus;
        data.executionStatus = data.executionStatus || semantics.executionStatus;
        data.incidentFlags = Array.isArray(data.incidentFlags) ? data.incidentFlags : semantics.incidentFlags;
        data.creadoAt = serverTimestamp();
        let turnoId = id;
        if (id) {
            await setDoc(doc(db, 'turnos', id), data);
        } else {
            const ref = await addDoc(collection(db, 'turnos'), data);
            turnoId = ref.id;
        }

        const movilId = data.movil;
        if (movilId && movilId !== 'Sin Asignar') {
            const ambulance = flota.find((a) => a.id === movilId);
            if (ambulance) {
                // Build updated turnos list including the new turno
                const newTurno = { id: turnoId, ...data, creadoAt: new Date().toISOString() };
                const updatedTurnos = [...turnos, newTurno];
                await syncAmbulanceOperationalFields(ambulance, updatedTurnos);
            }
        }

        return turnoId;
    };

    const updateTurno = async (turnoId, changes) => {
        const existingTurno = turnos.find((t) => t.id === turnoId);
        const mergedTurno = { ...existingTurno, ...changes };
        const semantics = getShiftTimeSemantics(mergedTurno);

        const enrichedChanges = {
            ...changes,
            finProgramado: mergedTurno.finProgramado || mergedTurno.horaFin || '',
            planningStatus: semantics.planningStatus,
            executionStatus: semantics.executionStatus,
            incidentFlags: semantics.incidentFlags,
        };

        await updateDoc(doc(db, 'turnos', turnoId), enrichedChanges);

        // Only re-evaluate operational fleet state when crew composition can change.
        const crewAffectingFields = [
            'movil',
            'inicioProgramado',
            'horaFin',
            'finProgramado',
            'inicioReal',
            'horaFinReal',
            'finReal',
            'cancelado',
            'ausenciaConfirmada',
        ];
        const shouldSyncFleetState = crewAffectingFields.some((field) => Object.prototype.hasOwnProperty.call(changes || {}, field));
        if (!shouldSyncFleetState) return;

        // Build updated turnos list with the changes applied
        const updatedTurnos = turnos.map((t) =>
            t.id === turnoId ? { ...t, ...changes } : t
        );

        const impactedMoviles = new Set();
        if (existingTurno?.movil && existingTurno.movil !== 'Sin Asignar') {
            impactedMoviles.add(existingTurno.movil);
        }
        if (changes?.movil && changes.movil !== 'Sin Asignar') {
            impactedMoviles.add(changes.movil);
        }

        for (const movilId of impactedMoviles) {
            const ambulance = flota.find((a) => a.id === movilId);
            if (ambulance) {
                // eslint-disable-next-line no-await-in-loop
                await syncAmbulanceOperationalFields(ambulance, updatedTurnos);
            }
        }
    };

    const updateFlota = async (flotaId, changes) => {
        await updateDoc(doc(db, 'flota', flotaId), changes);
    };

    // ── Simple status update (no full payload validation) ─────────────────────
    const updateRequestStatusDirect = async (reqId, newStatus, extraFields = {}) => {
        await updateDoc(doc(db, 'solicitudes', reqId), {
            estado: newStatus,
            actualizadoAt: serverTimestamp(),
            ...extraFields,
        });
    };

    // ── Deprecated stubs (kept for API compatibility) ─────────────────────────
    const updateRequestStatus = async () => { };
    const addMockAmbulance = async () => { };

    // ── Memoized derived lists ────────────────────────────────────────────────
    const solicitudesPendientes = useMemo(() => solicitudes.filter(s => s.estado === 'Pendiente' || s.estado === 'En revisión'), [solicitudes]);
    const solicitudesAsignadas = useMemo(() => solicitudes.filter(s => s.estado === 'Asignado'), [solicitudes]);
    const solicitudesActivas = useMemo(() => solicitudes.filter(s => s.estado === 'Pendiente' || s.estado === 'Asignado'), [solicitudes]);
    const historialSolicitudesDerived = useMemo(
        () => solicitudes.filter((s) => s.estado === 'Asignado' || s.estado === 'En revisión' || TERMINAL_HISTORY_STATES.includes(s.estado)),
        [solicitudes]
    );

    return {
        // State
        sesionActual,
        metricas,
        prenominaMensual,
        clientes,
        flota,
        empleados,
        turnosHoy: turnos,   // alias kept so PersonnelView doesn't need changes
        flotaStatusLog,
        loading,

        // Derived (memoized via useMemo below)
        solicitudesPendientes,
        solicitudesAsignadas,
        solicitudesActivas,
        historialSolicitudes: historialSolicitudesDerived,
        solicitudes, // Raw list for accurate dashboard metrics

        // Helpers
        getClienteById,
        getNextReqId,
        getNextClientId,

        // Client actions
        createClient,
        updateClient,

        // Fleet actions
        createRealAmbulance,
        updateAmbulanceStatus,
        addMockAmbulance,

        // Service actions
        createRealRequest,
        updateRealRequest,
        assignAmbulance,
        closeService,
        updateServiceChecklist,
        updateRequestStatus,
        updateRequestStatusDirect,

        // Estado revisión y desasignación
        requestStatusToReview,
        markRequestAsFailed,

        // Employee actions
        addEmpleado,
        updateEmpleado,

        // Shift actions
        addTurno,
        updateTurno,
        updateFlota,
    };
};
