import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, writeBatch, doc, collection } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyDQ2eENUbC_MTCM6A9D9_ec-blrZSFpnYY",
    authDomain: "contratoslma-62f5a.firebaseapp.com",
    projectId: "contratoslma-62f5a",
    storageBucket: "contratoslma-62f5a.firebasestorage.app",
    messagingSenderId: "210132231622",
    appId: "1:210132231622:web:feba0623237ff21ad33ec7"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// ─── Seed utility (run once from Configuración tab) ────────────────────────
export const seedInitialData = async () => {
    const today = new Date().toISOString().split('T')[0];

    const INITIAL_DATA = {
        clientes: [
            {
                id: "CLI-001", nombre: "Colsubsidio", tipo: "EPS / Convenio",
                ranking: "VIP", nivelPrioridad: 1,
                checklistTemplate: ["Firma médico remisor", "Copia documento identidad", "Soporte de triage", "Autorización validada"]
            },
            {
                id: "CLI-002", nombre: "Fundación Cardio Infantil", tipo: "Clínica Nivel IV",
                ranking: "Estratégico", nivelPrioridad: 2,
                checklistTemplate: ["Resumen clínico", "Autorización EPS", "Firma médico"]
            },
            {
                id: "CLI-003", nombre: "Particular", tipo: "Pago Directo",
                ranking: "Estándar", nivelPrioridad: 3,
                checklistTemplate: ["Confirmación de transferencia/efectivo", "Firma consentimiento informado"]
            }
        ],
        flota: [
            { id: "TAM-02", tipo: "Medicalizada", estado: "Disponible", destino: null },
            { id: "TAB-01", tipo: "Básica", estado: "Disponible", destino: null },
            { id: "TAB-02", tipo: "Básica", estado: "Disponible", destino: null }
        ],
        solicitudes: [
            {
                id: "SRV-901", clienteId: "CLI-001", movil: "TAM-02",
                ambulanciaAsignada: "TAM-02", estado: "En Traslado",
                asignadoAt: new Date(Date.now() - 160 * 60000).toISOString()
            },
            {
                id: "SRV-902", clienteId: "CLI-003", movil: "TAB-01",
                ambulanciaAsignada: "TAB-01", estado: "En Punto",
                asignadoAt: new Date(Date.now() - 45 * 60000).toISOString()
            }
        ],
        empleados: [
            { id: "EMP-01", cedula: "1234567890", nombre: "Dr. Ramírez", cargo: "Médico", estado: "Activo" },
            { id: "EMP-02", cedula: "0987654321", nombre: "Juan Pérez", cargo: "Conductor", estado: "Activo" },
            { id: "EMP-03", cedula: "1122334455", nombre: "Ana López", cargo: "Paramédico", estado: "Activo" }
        ],
        turnos: [
            {
                id: "TRN-101", id_empleado: "EMP-01", cedula: "1234567890",
                nombre: "Dr. Ramírez", cargo: "Médico", movil: "TAM-02",
                fecha: today, inicioProgramado: "06:00", horaFin: "18:00",
                inicioReal: "05:55", horaFinReal: null, serviciosHoy: 3
            },
            {
                id: "TRN-102", id_empleado: "EMP-02", cedula: "0987654321",
                nombre: "Juan Pérez", cargo: "Conductor", movil: "TAM-02",
                fecha: today, inicioProgramado: "06:00", horaFin: "18:00",
                inicioReal: "06:25", horaFinReal: null, serviciosHoy: 3
            },
            {
                id: "TRN-103", id_empleado: "EMP-03", cedula: "1122334455",
                nombre: "Ana López", cargo: "Paramédico", movil: "Sin Asignar",
                fecha: today, inicioProgramado: "08:00", horaFin: "20:00",
                inicioReal: null, horaFinReal: null, serviciosHoy: 0
            }
        ]
    };

    try {
        const batch = writeBatch(db);

        // Seed each collection
        const collections = ['clientes', 'flota', 'solicitudes', 'empleados', 'turnos'];
        for (const colName of collections) {
            for (const item of INITIAL_DATA[colName]) {
                const { id, ...data } = item;
                const ref = doc(collection(db, colName), id);
                batch.set(ref, data);
            }
        }

        await batch.commit();
        console.log("✅ Datos iniciales migrados a Firestore exitosamente!");
        return true;
    } catch (error) {
        console.error("❌ Error migrando datos:", error);
        return false;
    }
};
