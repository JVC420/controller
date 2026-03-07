import { useState, useEffect } from 'react';
import {
    collection, doc, onSnapshot,
    addDoc, updateDoc, setDoc, deleteDoc
} from 'firebase/firestore';
import { db } from '../firebase/config';

// ─── Fallback metrics (computed locally until analytics module is built) ──────
const STATIC_METRICAS = { flotaOperativa: "85%", tiempoPromedioRespuesta: "18 min", serviciosHoy: 24 };
const SESION_ACTUAL = { usuario: "Carlos", rol: "admin" };

const PRENOMINA_MOCK = [
    { id_empleado: "EMP-01", nombre: "Dr. Ramírez", ordinariasDiurnas: 120, ordinariasNocturnas: 24, hed: 5, hen: 2, dominicalesFestivos: 16, ausencias: 0 },
    { id_empleado: "EMP-02", nombre: "Juan Pérez", ordinariasDiurnas: 130, ordinariasNocturnas: 10, hed: 2, hen: 0, dominicalesFestivos: 8, ausencias: 1 }
];

// ─── Hook ─────────────────────────────────────────────────────────────────────
export const useDashboardData = () => {
    const [sesionActual] = useState(SESION_ACTUAL);
    const [metricas] = useState(STATIC_METRICAS);
    const [prenominaMensual] = useState(PRENOMINA_MOCK);

    const [clientes, setClientes] = useState([]);
    const [flota, setFlota] = useState([]);
    const [solicitudes, setSolicitudes] = useState([]);
    const [empleados, setEmpleados] = useState([]);
    const [turnos, setTurnos] = useState([]);

    const [loading, setLoading] = useState(true);

    // ── Real-time Firestore listeners ─────────────────────────────────────────
    useEffect(() => {
        let resolved = 0;
        const total = 5;
        const tryResolve = () => { resolved++; if (resolved >= total) setLoading(false); };

        const unsubClientes = onSnapshot(collection(db, 'clientes'), snap => {
            setClientes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            tryResolve();
        }, console.error);

        const unsubFlota = onSnapshot(collection(db, 'flota'), snap => {
            setFlota(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            tryResolve();
        }, console.error);

        const unsubSolicitudes = onSnapshot(collection(db, 'solicitudes'), snap => {
            setSolicitudes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            tryResolve();
        }, console.error);

        const unsubEmpleados = onSnapshot(collection(db, 'empleados'), snap => {
            setEmpleados(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            tryResolve();
        }, console.error);

        const unsubTurnos = onSnapshot(collection(db, 'turnos'), snap => {
            setTurnos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            tryResolve();
        }, console.error);

        return () => {
            unsubClientes();
            unsubFlota();
            unsubSolicitudes();
            unsubEmpleados();
            unsubTurnos();
        };
    }, []);

    // ── Helpers ───────────────────────────────────────────────────────────────
    const getClienteById = (id) => clientes.find(c => c.id === id);

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
            update.lastAvailableAt = new Date().toISOString();
        } else if (newStatus === 'Fuera de Servicio') {
            update.destino = null;
        }
        await updateDoc(ref, update);
    };

    // ── SERVICE Operations ────────────────────────────────────────────────────
    const createRealRequest = async (requestObj) => {
        const { id, ...data } = requestObj;
        if (id) {
            await setDoc(doc(db, 'solicitudes', id), data);
        } else {
            await addDoc(collection(db, 'solicitudes'), data);
        }
    };

    const assignAmbulance = async (reqId, ambulanceId) => {
        await updateDoc(doc(db, 'solicitudes', reqId), {
            estado: 'Asignado',
            ambulanciaAsignada: ambulanceId,
            asignadoAt: new Date().toISOString()
        });
        await updateDoc(doc(db, 'flota', ambulanceId), {
            estado: 'En Servicio',
            destino: 'Solicitud Asignada'
        });
    };

    const closeService = async (reqId, ambulanceId) => {
        await updateDoc(doc(db, 'solicitudes', reqId), {
            estado: 'Finalizado',
            finalizadoAt: new Date().toISOString()
        });
        if (ambulanceId) {
            await updateDoc(doc(db, 'flota', ambulanceId), {
                estado: 'Disponible',
                destino: null,
                lastAvailableAt: new Date().toISOString()
            });
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

    // ── Deprecated stubs (kept for API compatibility) ─────────────────────────
    const updateRequestStatus = async () => { };
    const addMockAmbulance = async () => { };

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

        // Derived
        solicitudesPendientes: solicitudes.filter(s => s.estado === 'Pendiente'),
        solicitudesAsignadas: solicitudes.filter(s => s.estado === 'Asignado'),
        solicitudesActivas: solicitudes.filter(s => s.estado === 'Pendiente' || s.estado === 'Asignado'),
        historialSolicitudes: solicitudes.filter(s => s.estado === 'Asignado' || s.estado === 'Finalizado'),
        solicitudes, // Raw list for accurate dashboard metrics

        // Helpers
        getClienteById,

        // Client actions
        createClient,
        updateClient,

        // Fleet actions
        createRealAmbulance,
        updateAmbulanceStatus,
        addMockAmbulance,

        // Service actions
        createRealRequest,
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
    };
};
