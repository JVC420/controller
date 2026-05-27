/* eslint-env node */
/**
 * Datos seed compartidos entre:
 *   - demo/seed.js (script Node contra emulators)
 *   - functions/index.js (Cloud Function de reset en demo hospedado)
 *
 * Solo datos puros. Sin dependencias de firebase-admin.
 */

export const DEMO_PASSWORD = 'demo1234';

export const DEMO_USERS = [
  { uid: 'demo-admin',       email: 'admin@demo.local',       displayName: 'Demo Admin',       claims: { role: 'administrador_general' } },
  { uid: 'demo-controlador', email: 'controlador@demo.local', displayName: 'Demo Controlador', claims: { role: 'controlador' } },
  { uid: 'demo-rh',          email: 'rh@demo.local',          displayName: 'Demo RRHH',        claims: { role: 'recurso_humano' } },
  { uid: 'demo-almacen',     email: 'almacen@demo.local',     displayName: 'Demo Almacén',     claims: { role: 'almacen' } },
  { uid: 'demo-lider',       email: 'lider@demo.local',       displayName: 'Demo Líder Móvil', claims: { role: 'lider_movil', mobileId: 'MOV-01' } },
  { uid: 'demo-tripulante',  email: 'tripulante@demo.local',  displayName: 'Demo Tripulante',  claims: { role: 'tripulante' } },
];

// Las fechas se computan en runtime (no hardcoded en seed) para que cada
// reset deje datos "frescos" relativos al día actual.
export const buildSeedData = () => {
  const today = new Date();
  const todayISO = today.toISOString().split('T')[0];
  const daysAgo = (n) => {
    const d = new Date(today); d.setDate(d.getDate() - n); return d;
  };
  const minutesAgo = (n) => {
    const d = new Date(today); d.setMinutes(d.getMinutes() - n); return d;
  };
  const isoDate = (d) => d.toISOString();

  const CLIENTES = [
    { id: 'CLI-001', nombre: 'EPS Sanitas',        nit: '800251440-6', telefono: '601-3325577', email: 'contacto@sanitas.com.co',     ciudad: 'Bogotá',    activo: true },
    { id: 'CLI-002', nombre: 'Compensar EPS',      nit: '860066942-7', telefono: '601-3077060', email: 'servicio@compensar.com',      ciudad: 'Bogotá',    activo: true },
    { id: 'CLI-003', nombre: 'Nueva EPS',          nit: '900156264-2', telefono: '601-3079019', email: 'contacto@nuevaeps.com.co',    ciudad: 'Bogotá',    activo: true },
    { id: 'CLI-004', nombre: 'Sura EPS',           nit: '800088702-2', telefono: '604-4055656', email: 'info@epssura.com',            ciudad: 'Medellín',  activo: true },
    { id: 'CLI-005', nombre: 'Famisanar',          nit: '830003564-7', telefono: '601-3905566', email: 'sac@famisanar.com.co',        ciudad: 'Bogotá',    activo: true },
    { id: 'CLI-006', nombre: 'Salud Total',        nit: '800130907-4', telefono: '601-4855555', email: 'contacto@saludtotal.com.co',  ciudad: 'Bogotá',    activo: true },
    { id: 'CLI-007', nombre: 'Coomeva EPS',        nit: '805000427-1', telefono: '602-3201010', email: 'info@coomeva.com.co',         ciudad: 'Cali',      activo: false },
    { id: 'CLI-008', nombre: 'Hospital San José',  nit: '860015888-1', telefono: '601-3538000', email: 'urgencias@hospitalsanjose.org', ciudad: 'Bogotá',  activo: true },
    { id: 'CLI-009', nombre: 'Clínica Country',    nit: '860006543-2', telefono: '601-5304000', email: 'admin@clinicacountry.org',    ciudad: 'Bogotá',    activo: true },
    { id: 'CLI-010', nombre: 'Fundación Cardio',   nit: '860015536-3', telefono: '601-3475252', email: 'contacto@cardio.org',         ciudad: 'Bogotá',    activo: true },
  ];

  const FLOTA = [
    { id: 'MOV-01', placa: 'PVC-101', tipo: 'TAB', estado: 'En Servicio',       destino: 'Solicitud Asignada', estadoOperativo: 'in_service' },
    { id: 'MOV-02', placa: 'PVC-202', tipo: 'TAM', estado: 'Disponible',        destino: null,                 estadoOperativo: 'available' },
    { id: 'MOV-03', placa: 'PVC-303', tipo: 'TAB', estado: 'Disponible',        destino: null,                 estadoOperativo: 'available' },
    { id: 'MOV-04', placa: 'PVC-404', tipo: 'TAM', estado: 'Fuera de Servicio', destino: null,                 estadoOperativo: 'out_of_service' },
    { id: 'MOV-05', placa: 'PVC-505', tipo: 'TAB', estado: 'Disponible',        destino: null,                 estadoOperativo: 'incomplete_crew' },
    { id: 'MOV-06', placa: 'PVC-606', tipo: 'TAM', estado: 'En Servicio',       destino: 'Solicitud Asignada', estadoOperativo: 'in_service' },
    { id: 'MOV-07', placa: 'PVC-707', tipo: 'TAB', estado: 'Disponible',        destino: null,                 estadoOperativo: 'available' },
    { id: 'MOV-08', placa: 'PVC-808', tipo: 'TAM', estado: 'Disponible',        destino: null,                 estadoOperativo: 'available' },
  ];

  const EMPLEADOS = [
    { id: 'EMP-001', nombre: 'Carlos Ramírez',  rol: 'Médico',     cedula: '1020304050', telefono: '300-1112233', email: 'cramirez@demo.local',  activo: true },
    { id: 'EMP-002', nombre: 'Laura Méndez',    rol: 'Enfermera',  cedula: '1020304051', telefono: '300-1112234', email: 'lmendez@demo.local',   activo: true },
    { id: 'EMP-003', nombre: 'Juan Pérez',      rol: 'Conductor',  cedula: '1020304052', telefono: '300-1112235', email: 'jperez@demo.local',    activo: true },
    { id: 'EMP-004', nombre: 'María González',  rol: 'APH',        cedula: '1020304053', telefono: '300-1112236', email: 'mgonzalez@demo.local', activo: true },
    { id: 'EMP-005', nombre: 'Pedro Castillo',  rol: 'Conductor',  cedula: '1020304054', telefono: '300-1112237', email: 'pcastillo@demo.local', activo: true },
    { id: 'EMP-006', nombre: 'Ana Torres',      rol: 'Enfermera',  cedula: '1020304055', telefono: '300-1112238', email: 'atorres@demo.local',   activo: true },
    { id: 'EMP-007', nombre: 'Diego Fernández', rol: 'APH',        cedula: '1020304056', telefono: '300-1112239', email: 'dfernandez@demo.local',activo: true },
    { id: 'EMP-008', nombre: 'Sofía Vargas',    rol: 'Médico',     cedula: '1020304057', telefono: '300-1112240', email: 'svargas@demo.local',   activo: true },
  ];

  const TURNOS = [
    { id: 'T-01', empleado: 'EMP-001', email: 'cramirez@demo.local',  movil: 'MOV-01', fecha: todayISO, inicioProgramado: '06:00', horaFin: '18:00', planningStatus: 'scheduled', executionStatus: 'in_progress' },
    { id: 'T-02', empleado: 'EMP-002', email: 'lmendez@demo.local',   movil: 'MOV-01', fecha: todayISO, inicioProgramado: '06:00', horaFin: '18:00', planningStatus: 'scheduled', executionStatus: 'in_progress' },
    { id: 'T-03', empleado: 'EMP-003', email: 'jperez@demo.local',    movil: 'MOV-01', fecha: todayISO, inicioProgramado: '06:00', horaFin: '18:00', planningStatus: 'scheduled', executionStatus: 'in_progress' },
    { id: 'T-04', empleado: 'EMP-004', email: 'mgonzalez@demo.local', movil: 'MOV-02', fecha: todayISO, inicioProgramado: '06:00', horaFin: '18:00', planningStatus: 'scheduled', executionStatus: 'in_progress' },
    { id: 'T-05', empleado: 'EMP-005', email: 'pcastillo@demo.local', movil: 'MOV-02', fecha: todayISO, inicioProgramado: '06:00', horaFin: '18:00', planningStatus: 'scheduled', executionStatus: 'in_progress' },
    { id: 'T-06', empleado: 'EMP-006', email: 'atorres@demo.local',   movil: 'MOV-03', fecha: todayISO, inicioProgramado: '18:00', horaFin: '06:00', planningStatus: 'scheduled', executionStatus: 'scheduled' },
  ];

  const buildSolicitud = (id, estado, clienteId, pacienteNombre, programadoDate, ambulanciaAsignada = null) => ({
    id,
    estado,
    clienteId,
    entidadInfo: { idEntidad: clienteId, nombreEntidad: CLIENTES.find((c) => c.id === clienteId)?.nombre || '' },
    pacienteInfo: {
      idPacienteHC: `HC${id.replace('REQ-', '')}`,
      tipoIdentidad: 'CC',
      nombre: pacienteNombre,
      sexo: 'M',
      fechaNacimiento: '1985-04-12',
      edad: '40',
      tipoEdad: 'Años',
    },
    solicitanteInfo: { nombre: 'Dr. Martínez', cargo: 'Médico tratante', telefono: '300-9998877' },
    servicioInfo: {
      codComplejidad: 'TAB',
      confirmaAutorizacion: 'Si',
      numeroAutorizacion: `AUT-${id}`,
      esServicioParticular: false,
      copagoValor: '',
      servicioParticularValor: '',
    },
    programacionInfo: {
      servicioProgramado: isoDate(programadoDate),
      servicioSolicitado: isoDate(minutesAgo(30)),
    },
    diagnosticoInfo: { codCIE: 'I21.9', descripcionCIE: 'Infarto agudo de miocardio' },
    origenInfo:   { nombre: 'Hospital San José - Urgencias', direccion: 'Cra 19 # 8-32', ciudad: 'Bogotá' },
    destino1Info: { nombre: 'Clínica Country',                direccion: 'Cra 16 # 82-57', ciudad: 'Bogotá' },
    ambulanciaAsignada,
    creadoAt: isoDate(minutesAgo(45)),
  });

  const SOLICITUDES = [
    buildSolicitud('REQ-001', 'En Traslado', 'CLI-001', 'José Hernández',   today,           'MOV-01'),
    buildSolicitud('REQ-002', 'Asignado',    'CLI-002', 'Marta Gutiérrez',  today,           'MOV-06'),
    buildSolicitud('REQ-003', 'Pendiente',   'CLI-003', 'Carlos Pinilla',   today,           null),
    buildSolicitud('REQ-004', 'Pendiente',   'CLI-004', 'Lucía Restrepo',   today,           null),
    buildSolicitud('REQ-005', 'En revisión', 'CLI-005', 'Mario Bautista',   today,           null),
    buildSolicitud('REQ-006', 'Finalizado',  'CLI-001', 'Andrés Lozano',    daysAgo(1),      null),
    buildSolicitud('REQ-007', 'Finalizado',  'CLI-002', 'Beatriz Méndez',   daysAgo(1),      null),
    buildSolicitud('REQ-008', 'Finalizado',  'CLI-003', 'Patricia Soto',    daysAgo(2),      null),
    buildSolicitud('REQ-009', 'Fallido',     'CLI-006', 'Ricardo Ortega',   daysAgo(2),      null),
    buildSolicitud('REQ-010', 'Cancelado',   'CLI-004', 'Sandra Pulido',    daysAgo(3),      null),
    buildSolicitud('REQ-011', 'Finalizado',  'CLI-008', 'Felipe Camargo',   daysAgo(3),      null),
    buildSolicitud('REQ-012', 'Finalizado',  'CLI-009', 'Juliana Reyes',    daysAgo(4),      null),
    buildSolicitud('REQ-013', 'Pendiente',   'CLI-010', 'Tomás Acuña',      today,           null),
  ];

  const PRODUCTS = [
    { id: 'PROD-001', code: 'MED-0001', name: 'Adrenalina 1mg/ml',          category: 'medicamento', stockCurrent: 80,  minStock: 20 },
    { id: 'PROD-002', code: 'MED-0002', name: 'Atropina 1mg/ml',            category: 'medicamento', stockCurrent: 45,  minStock: 15 },
    { id: 'PROD-003', code: 'MED-0003', name: 'Morfina 10mg/ml',            category: 'medicamento', stockCurrent: 30,  minStock: 10 },
    { id: 'PROD-004', code: 'MED-0004', name: 'Diazepam 10mg/2ml',          category: 'medicamento', stockCurrent: 25,  minStock: 10 },
    { id: 'PROD-005', code: 'MED-0005', name: 'Solución Salina 0.9% 500ml', category: 'medicamento', stockCurrent: 120, minStock: 40 },
    { id: 'PROD-006', code: 'DIS-0001', name: 'Catéter venoso 18G',         category: 'dispositivo', stockCurrent: 200, minStock: 50 },
    { id: 'PROD-007', code: 'DIS-0002', name: 'Mascarilla O2 adulto',       category: 'dispositivo', stockCurrent: 75,  minStock: 25 },
    { id: 'PROD-008', code: 'DIS-0003', name: 'Tubo endotraqueal 7.5',      category: 'dispositivo', stockCurrent: 18,  minStock: 8  },
    { id: 'PROD-009', code: 'GAS-0001', name: 'Oxígeno medicinal cilindro', category: 'gas',         stockCurrent: 12,  minStock: 4  },
    { id: 'PROD-010', code: 'REACT-0001', name: 'Tira reactiva glucemia',   category: 'reactivo',    stockCurrent: 300, minStock: 100 },
  ];

  const MOBILE_INVENTORY = {
    'MOV-01': [
      { productId: 'PROD-001', productName: 'Adrenalina 1mg/ml',          code: 'MED-0001', category: 'medicamento', stockCurrent: 6,  minStock: 4 },
      { productId: 'PROD-005', productName: 'Solución Salina 0.9% 500ml', code: 'MED-0005', category: 'medicamento', stockCurrent: 8,  minStock: 5 },
      { productId: 'PROD-006', productName: 'Catéter venoso 18G',         code: 'DIS-0001', category: 'dispositivo', stockCurrent: 12, minStock: 6 },
      { productId: 'PROD-009', productName: 'Oxígeno medicinal cilindro', code: 'GAS-0001', category: 'gas',         stockCurrent: 2,  minStock: 1 },
    ],
    'MOV-02': [
      { productId: 'PROD-002', productName: 'Atropina 1mg/ml',     code: 'MED-0002', category: 'medicamento', stockCurrent: 4,  minStock: 3 },
      { productId: 'PROD-006', productName: 'Catéter venoso 18G',  code: 'DIS-0001', category: 'dispositivo', stockCurrent: 10, minStock: 6 },
      { productId: 'PROD-007', productName: 'Mascarilla O2 adulto',code: 'DIS-0002', category: 'dispositivo', stockCurrent: 5,  minStock: 3 },
    ],
    'MOV-06': [
      { productId: 'PROD-001', productName: 'Adrenalina 1mg/ml',          code: 'MED-0001', category: 'medicamento', stockCurrent: 3, minStock: 4 },
      { productId: 'PROD-005', productName: 'Solución Salina 0.9% 500ml', code: 'MED-0005', category: 'medicamento', stockCurrent: 6, minStock: 5 },
    ],
  };

  const AUDIT_EVENTS = [
    { action: 'login',    entity: 'session', userEmail: 'admin@demo.local',       userRole: 'administrador_general', userId: 'demo-admin',       metadata: { method: 'password' } },
    { action: 'login',    entity: 'session', userEmail: 'controlador@demo.local', userRole: 'controlador',           userId: 'demo-controlador', metadata: { method: 'password' } },
    { action: 'create',   entity: 'request', entityId: 'REQ-013', userEmail: 'controlador@demo.local', userRole: 'controlador', userId: 'demo-controlador' },
    { action: 'business', entity: 'request', entityId: 'REQ-001', userEmail: 'controlador@demo.local', userRole: 'controlador', userId: 'demo-controlador', metadata: { event: 'assign_ambulance', ambulanceId: 'MOV-01' } },
    { action: 'business', entity: 'mobile_inventory', entityId: 'MOV-01/PROD-001', userEmail: 'almacen@demo.local', userRole: 'almacen', userId: 'demo-almacen', metadata: { event: 'warehouse_to_mobile_dispatch', mobileId: 'MOV-01', quantity: 6 } },
  ];

  return {
    CLIENTES, FLOTA, EMPLEADOS, TURNOS, SOLICITUDES, PRODUCTS, MOBILE_INVENTORY, AUDIT_EVENTS,
    daysAgo,
  };
};

// Colecciones que el reset debe borrar antes de re-sembrar (orden importa
// porque subcolecciones se borran junto al doc padre cuando recorremos flota).
export const ROOT_COLLECTIONS_TO_WIPE = [
  'clientes', 'flota', 'empleados', 'turnos', 'solicitudes',
  'products', 'movements', 'counters', 'audit_logs',
  'pacientes_cache', 'qr_activos', 'flotaStatusLog',
];

// Subcolecciones bajo flota/{movilId}
export const FLOTA_SUBCOLLECTIONS = ['inventario', 'movements'];
