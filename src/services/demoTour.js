import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { DEMO_MODE } from '../firebase/config';

const SEEN_PREFIX = 'lma_demo_tour_';

const baseConfig = {
  showProgress: true,
  allowClose: true,
  overlayColor: 'rgba(2, 6, 23, 0.78)',
  nextBtnText: 'Siguiente →',
  prevBtnText: '← Atrás',
  doneBtnText: '¡Listo!',
  popoverClass: 'lma-demo-popover',
};

// Steps por ruta. Si una clave no existe, no se dispara tour.
// Cada step usa data-tour-id en el DOM. Si el elemento no existe, driver.js
// muestra el popover centrado (sin highlight).
const TOURS = {
  '/': {
    steps: [
      {
        popover: {
          title: '👋 Bienvenido al demo',
          description: 'Te voy a mostrar las funciones principales del panel de operaciones. Puedes cerrar el tour cuando quieras.',
        },
      },
      {
        element: '[data-tour="triage"]',
        popover: {
          title: 'Triage de solicitudes',
          description: 'Aquí ves todas las solicitudes pendientes y en revisión. Las puedes <b>arrastrar</b> hacia una ambulancia disponible para asignarlas.',
          side: 'right',
          align: 'start',
        },
      },
      {
        element: '[data-tour="fleet"]',
        popover: {
          title: 'Estado de la flota',
          description: 'Cada ambulancia muestra su estado en tiempo real: disponible, en servicio, fuera de servicio. Suelta una solicitud sobre una ambulancia para asignarla.',
          side: 'left',
        },
      },
      {
        element: '[data-tour="sidebar"]',
        popover: {
          title: 'Navegación',
          description: 'Desde aquí accedes a Historial, Métricas, Directorio de clientes, Personal y Almacén.',
          side: 'right',
        },
      },
    ],
  },
  '/almacen': {
    steps: [
      {
        popover: {
          title: '📦 Panel de Almacén',
          description: 'Aquí controlas el inventario médico central, despachas a las ambulancias y consultas movimientos.',
        },
      },
      {
        element: '[data-tour="storage-stats"]',
        popover: {
          title: 'Indicadores clave',
          description: 'Total de insumos, stock crítico (bajo mínimo) y productos por vencer en 30 días.',
        },
      },
      {
        element: '[data-tour="storage-inventory"]',
        popover: {
          title: 'Inventario completo',
          description: 'Consulta el stock, registra entradas, salidas o <b>despachos a un móvil específico</b> con un solo click.',
        },
      },
      {
        element: '[data-tour="storage-mobile-overview"]',
        popover: {
          title: 'Inventarios por móvil',
          description: 'Ve el stock actual de cada ambulancia (solo lectura). Los consumos los registra el líder del móvil.',
        },
      },
    ],
  },
  '/lider': {
    steps: [
      {
        popover: {
          title: '🚑 Líder de móvil',
          description: 'Desde tu tablet generas el QR para que la tripulación registre su ingreso, y gestionas el inventario del móvil.',
        },
      },
      {
        element: '[data-tour="leader-qr"]',
        popover: {
          title: 'QR de check-in',
          description: 'Se renueva automáticamente cada 90 segundos. La tripulación lo escanea con su teléfono y valida con GPS que están cerca del móvil.',
          side: 'top',
        },
      },
      {
        element: '[data-tour="leader-inventory-link"]',
        popover: {
          title: 'Inventario del móvil',
          description: 'Click aquí para ver el stock actual del móvil y registrar consumos durante los servicios.',
          side: 'bottom',
        },
      },
    ],
  },
  '/lider/inventario': {
    steps: [
      {
        popover: {
          title: 'Inventario del móvil',
          description: 'Aquí ves el stock que el almacén te ha despachado, y registras los consumos durante los servicios.',
        },
      },
      {
        element: '[data-tour="leader-consume"]',
        popover: {
          title: 'Registrar consumo',
          description: 'Click aquí cuando uses un medicamento o insumo. Puedes asociar el consumo a una solicitud activa para trazabilidad por paciente.',
          side: 'bottom',
        },
      },
    ],
  },
  '/personal': {
    steps: [
      {
        popover: {
          title: '👥 Gestión de personal y turnos',
          description: 'Desde aquí Recursos Humanos administra <b>empleados, turnos y prenómina</b>. Te muestro las 3 secciones.',
        },
      },
      {
        element: '[data-tour="rh-crew-status"]',
        popover: {
          title: 'Tripulación en vivo por móvil',
          description: 'Ves cada ambulancia con su tripulación actual (médico, APH, conductor). Verde = completa · ámbar = incompleta. Se actualiza en tiempo real.',
          side: 'bottom',
        },
      },
      {
        element: '[data-tour="rh-add-shift"]',
        popover: {
          title: 'Programar un turno',
          description: 'Click para asignar un empleado a un móvil en una fecha/hora. El turno queda <b>programado</b>; cuando el tripulante haga check-in con el QR, las horas reales se llenan automáticamente y el estado pasa a "En Turno".',
          side: 'left',
        },
      },
      {
        element: '[data-tour="rh-tabs"]',
        popover: {
          title: 'Tres vistas en una',
          description: '<b>Turnos en Vivo:</b> tabla con todos los turnos, sus horas planeadas vs reales (las reales vienen del QR de check-in/checkout), retrasos y ausencias.<br/><br/><b>Directorio:</b> lista de empleados activos. Desde ahí los editas o añades nuevos con un click.<br/><br/><b>Pre-nómina:</b> cálculo automático de horas ordinarias, nocturnas, extra, dominicales y festivos del mes — listo para enviar al contador.',
          side: 'bottom',
        },
      },
      {
        popover: {
          title: '🔄 Integración con QR de check-in',
          description: 'Cuando un tripulante escanea el QR del líder al subirse al móvil, el sistema registra automáticamente: <b>hora real de inicio</b>, GPS, y vincula el evento al turno programado. Al hacer check-out se cierra el turno. RH no necesita meter horas manualmente.',
        },
      },
    ],
  },
  '/almacen/inventario': {
    steps: [
      {
        popover: {
          title: '📦 Inventario del almacén',
          description: 'Aquí ves el stock completo, registras movimientos y creas nuevos productos.',
        },
      },
      {
        element: '[data-tour="storage-new-product"]',
        popover: {
          title: 'Crear un nuevo producto',
          description: 'Click aquí para registrar un nuevo medicamento, dispositivo, gas o reactivo. El sistema genera automáticamente un <b>código único</b> según la categoría (ej: MED-0011, DIS-0023).',
          side: 'bottom',
        },
      },
      {
        element: '[data-tour="storage-alerts"]',
        popover: {
          title: 'Alertas automáticas',
          description: 'Productos con stock crítico (bajo el mínimo) o próximos a vencer (30 días). Click en cualquiera para ver detalle.',
          side: 'bottom',
        },
      },
      {
        element: '[data-tour="storage-list"]',
        popover: {
          title: 'Lista de inventario',
          description: 'Desde cada producto puedes <b>ajustar el stock</b> (entrada, salida o despacho a un móvil). Al hacer click en "Ajustar" se abre un modal con 3 opciones: entrada (+), salida (−) o <b>"A móvil"</b> — despacha al inventario de una ambulancia específica.',
          side: 'top',
        },
      },
    ],
  },
  '/almacen/consumo': {
    steps: [
      {
        popover: {
          title: '🛒 Reportar consumo de tripulación',
          description: 'Registra el uso de insumos por parte de la tripulación. El consumo se descuenta del stock y queda trazado.',
        },
      },
      {
        element: '[data-tour="consumption-mode"]',
        popover: {
          title: 'Tipo de consumo',
          description: 'Elige si el consumo fue de una <b>ambulancia</b> (queda asociado al móvil para reportes) o <b>personal</b> (uso administrativo). Si es por ambulancia, selecciona el móvil específico.',
          side: 'bottom',
        },
      },
      {
        element: '[data-tour="consumption-search"]',
        popover: {
          title: 'Buscar y agregar al carrito',
          description: 'Escribe el nombre, código o lote del insumo. Click para agregarlo al carrito con cantidad. Puedes añadir varios productos en un solo reporte.',
          side: 'bottom',
        },
      },
      {
        element: '[data-tour="consumption-confirm"]',
        popover: {
          title: 'Confirmar consumo',
          description: 'Al confirmar, todos los productos del carrito se descuentan en una sola transacción atómica. Quedan en el historial de movimientos.',
          side: 'top',
        },
      },
    ],
  },
  '/almacen/moviles': {
    steps: [
      {
        popover: {
          title: '🚑 Consumos por móvil',
          description: 'Aquí <b>almacén y admin</b> consultan el stock e historial de cada ambulancia. Es <b>solo lectura</b> — los consumos los registra el líder del móvil.',
        },
      },
      {
        element: '[data-tour="mobile-overview-list"]',
        popover: {
          title: 'Selecciona un móvil',
          description: 'Click en cualquier móvil para ver: su inventario actual (qué medicamentos tiene y cuántos), y el historial completo de movimientos — qué entró (despachos del almacén), qué salió (consumos del líder con paciente asociado si aplica) y quién lo registró.',
          side: 'top',
        },
      },
    ],
  },
  '/almacen/historial': {
    steps: [
      {
        popover: {
          title: '📜 Historial de movimientos',
          description: 'Auditoría completa: cada entrada, salida, despacho y consumo del almacén con fecha, responsable y motivo.',
        },
      },
    ],
  },
  '/historial': {
    steps: [
      {
        popover: {
          title: '📋 Historial de servicios',
          description: 'Todos los servicios finalizados, fallidos, cancelados o en revisión. Aquí completas la historia clínica y los checklists post-servicio.',
        },
      },
    ],
  },
  '/metricas': {
    steps: [
      {
        popover: {
          title: '📊 Métricas operacionales',
          description: 'KPIs en tiempo real: flota operativa, tiempo promedio de respuesta, servicios del día y tendencias.',
        },
      },
    ],
  },
};

const tourKey = (route) => `${SEEN_PREFIX}${route}`;

export const hasSeenTour = (route) => {
  try { return localStorage.getItem(tourKey(route)) === '1'; }
  catch { return false; }
};

export const markTourSeen = (route) => {
  try { localStorage.setItem(tourKey(route), '1'); } catch { /* ignore */ }
};

export const resetAllTours = () => {
  try {
    Object.keys(TOURS).forEach((route) => localStorage.removeItem(tourKey(route)));
  } catch { /* ignore */ }
};

/**
 * Lanza el tour para la ruta dada si está definido. Si `force` es false (default),
 * solo lo muestra si el usuario no lo ha visto aún para esa ruta.
 */
export const runTourFor = (route, { force = false } = {}) => {
  if (!DEMO_MODE) return;
  const tour = TOURS[route];
  if (!tour) return;
  if (!force && hasSeenTour(route)) return;

  const instance = driver({
    ...baseConfig,
    steps: tour.steps,
    onDestroyed: () => markTourSeen(route),
  });
  // Pequeño delay para que el DOM termine de montarse antes de medir elementos.
  setTimeout(() => instance.drive(), 350);
};

export const hasTourFor = (route) => Boolean(TOURS[route]);
