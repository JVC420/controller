import { useState, useEffect, useCallback, useMemo } from 'react';
import {
    collection, doc, onSnapshot, query, where,
    addDoc, updateDoc, setDoc, deleteDoc, getDocs,
    writeBatch, serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';

// ─── Normalize Firestore Timestamps to ISO strings on read ───────────────────
const normalizeDoc = (data) => {
    const result = { ...data };
    for (const key of Object.keys(result)) {
        if (result[key] && typeof result[key].toDate === 'function') {
            result[key] = result[key].toDate().toISOString();
        }
    }
    return result;
};

const sanitizeText = (value) => String(value ?? '').replace(/\s+/g, ' ').trim();

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
    if (!esParticular && !(copago >= 0)) {
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

// ─── Optimization: only these states use a real-time listener ─────────────────
const ACTIVE_STATES = ['Pendiente', 'Asignado', 'En Traslado', 'En Punto'];
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
    '/':            { flota: true, solicitudes: true, clientes: true, turnos: true, empleados: false },
    '/historial':   { flota: false, solicitudes: true, clientes: true, turnos: false, empleados: false },
    '/metricas':    { flota: true, solicitudes: true, clientes: false, turnos: true, empleados: false },
    '/directorio':  { flota: false, solicitudes: false, clientes: true, turnos: false, empleados: false },
    '/personal':    { flota: true, solicitudes: false, clientes: false, turnos: true, empleados: true },
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
        const total = (wantFlota ? 1 : 0) + (wantSol ? 2 : 0) + (wantClientes ? 1 : 0)
                    + (wantEmpleados ? 1 : 0) + (wantTurnos ? 1 : 0);
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

        // Solicitudes ACTIVE — real-time for non-finalized states only
        if (wantSol) {
            unsubs.push(onSnapshot(
                query(collection(db, 'solicitudes'), where('estado', 'in', ACTIVE_STATES)),
                snap => {
                    setActiveSolicitudes(snap.docs.map(d => ({ id: d.id, ...normalizeDoc(d.data()) })));
                    tryResolve();
                }, console.error));

            // Solicitudes FINALIZED — one-time fetch
            getDocs(query(collection(db, 'solicitudes'), where('estado', '==', 'Finalizado')))
                .then(snap => {
                    setHistoricalSolicitudes(snap.docs.map(d => ({ id: d.id, ...normalizeDoc(d.data()) })));
                    tryResolve();
                })
                .catch(err => { console.error('Error fetching historical solicitudes:', err); tryResolve(); });
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

        return () => unsubs.forEach(fn => fn());
    }, [role, activeRoute]);

    // ── Helpers (memoized) ────────────────────────────────────────────────────
    const clientesMap = useMemo(() => {
        const m = new Map();
        clientes.forEach(c => m.set(c.id, c));
        return m;
    }, [clientes]);
    const getClienteById = useCallback((id) => clientesMap.get(id), [clientesMap]);

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
        } else if (newStatus === 'Fuera de Servicio') {
            update.destino = null;
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
        if (id) {
            await setDoc(doc(db, 'solicitudes', id), data);
        } else {
            await addDoc(collection(db, 'solicitudes'), data);
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
        const batch = writeBatch(db);
        batch.update(doc(db, 'solicitudes', reqId), {
            estado: 'Asignado',
            ambulanciaAsignada: ambulanceId,
            asignadoAt: serverTimestamp()
        });
        batch.update(doc(db, 'flota', ambulanceId), {
            estado: 'En Servicio',
            destino: 'Solicitud Asignada'
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
                lastAvailableAt: serverTimestamp()
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
        data.creadoAt = serverTimestamp();
        if (id) {
            await setDoc(doc(db, 'turnos', id), data);
        } else {
            const ref = await addDoc(collection(db, 'turnos'), data);
            return ref.id;
        }
    };

    const updateTurno = async (turnoId, changes) => {
        await updateDoc(doc(db, 'turnos', turnoId), changes);
    };

    const updateFlota = async (flotaId, changes) => {
        await updateDoc(doc(db, 'flota', flotaId), changes);
    };

    // ── Deprecated stubs (kept for API compatibility) ─────────────────────────
    const updateRequestStatus = async () => { };
    const addMockAmbulance = async () => { };

    // ── Memoized derived lists ────────────────────────────────────────────────
    const solicitudesPendientes = useMemo(() => solicitudes.filter(s => s.estado === 'Pendiente'), [solicitudes]);
    const solicitudesAsignadas = useMemo(() => solicitudes.filter(s => s.estado === 'Asignado'), [solicitudes]);
    const solicitudesActivas = useMemo(() => solicitudes.filter(s => s.estado === 'Pendiente' || s.estado === 'Asignado'), [solicitudes]);
    const historialSolicitudesDerived = useMemo(() => solicitudes.filter(s => s.estado === 'Asignado' || s.estado === 'Finalizado'), [solicitudes]);

    return {
        // State
        sesionActual,
        metricas,
        prenominaMensual,
        clientes,
        flota,
        empleados,
        turnosHoy: turnos,   // alias kept so PersonnelView doesn't need changes
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

        // Employee actions
        addEmpleado,
        updateEmpleado,

        // Shift actions
        addTurno,
        updateTurno,
        updateFlota,
    };
};
