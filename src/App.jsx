import React, { useState } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { DndContext, DragOverlay, pointerWithin, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import LoginPage from './components/LoginPage';
import ProtectedRoute from './components/ProtectedRoute';
import Sidebar from './components/Sidebar';
import TriageBoard from './components/TriageBoard';
import FleetMonitor from './components/FleetMonitor';
import RequestCard, { RequestCardUI } from './components/RequestCard';
import ClientDirectory from './components/ClientDirectory';
import NewServiceModal from './components/NewServiceModal';
import HistoryView from './components/HistoryView';
import MetricsDashboard from './components/MetricsDashboard';
import PersonnelView from './components/PersonnelView';
import { useDashboardData } from './hooks/useDashboardData';
import { useAuth, ROLES } from './contexts/AuthContext';
import UnauthorizedPage from './components/UnauthorizedPage';
import { ToastContainer, useToast } from './components/ui/Toast';
import { Menu } from 'lucide-react';

// Map route paths to tab names for sidebar highlighting
const pathToTab = {
  '/': 'dashboard',
  '/historial': 'historial',
  '/metricas': 'metricas',
  '/directorio': 'directorio',
  '/personal': 'personal',
  '/configuracion': 'configuracion',
};

function AppLayout() {
  const {
    sesionActual,
    metricas,
    empleados,
    turnosHoy,
    prenominaMensual,
    clientes,
    solicitudesActivas,
    solicitudesPendientes,
    historialSolicitudes,
    solicitudes,
    flota,
    loading,
    getClienteById,
    assignAmbulance,
    addMockAmbulance,
    createRealRequest,
    createClient,
    updateClient,
    createRealAmbulance,
    updateServiceChecklist,
    updateAmbulanceStatus,
    closeService,
    addEmpleado,
    updateEmpleado,
    addTurno,
    updateTurno,
    updateFlota,
  } = useDashboardData();

  const { hasAccess, role, loading: authLoading } = useAuth();
  const location = useLocation();
  const activeTab = pathToTab[location.pathname] || 'dashboard';

  // Compute the default landing page for this role
  const defaultRoute = ROLES[role]?.routes[0] || '/login';

  const [activeDragItem, setActiveDragItem] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { toasts, show: showToast, dismiss: dismissToast } = useToast();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  // ── Wait for auth + data to resolve ──
  if (authLoading || loading) {
    return (
      <div className="flex flex-col h-screen bg-dark-900 p-4 gap-4 animate-pulse">
        <div className="h-16 bg-dark-800 rounded-xl w-full flex items-center justify-between px-6 border border-slate-800">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-slate-700/50 rounded-lg"></div>
            <div className="w-32 h-6 bg-slate-700/50 rounded"></div>
          </div>
          <div className="w-24 h-8 bg-slate-700/50 rounded-lg"></div>
        </div>
        <div className="flex-1 flex gap-4 overflow-hidden">
          <div className="w-64 hidden lg:flex flex-col gap-3 h-full">
            {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-12 w-full bg-dark-800 rounded-lg border border-slate-800"></div>)}
          </div>
          <div className="flex-1 flex flex-col lg:flex-row gap-4">
            <div className="w-full lg:w-80 h-full bg-dark-800 rounded-xl border border-slate-800 p-4 space-y-4">
              <div className="w-1/2 h-6 bg-slate-700/50 rounded mb-6"></div>
              {[1, 2, 3].map(i => <div key={i} className="h-32 w-full bg-slate-800/50 rounded-lg"></div>)}
            </div>
            <div className="flex-1 h-full bg-dark-800 rounded-xl border border-slate-800 p-6 flex flex-col gap-6">
              <div className="w-64 h-8 bg-slate-700/50 rounded"></div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map(i => <div key={i} className="h-28 bg-slate-800/50 rounded-xl"></div>)}
              </div>
              <div className="flex-1 bg-slate-800/30 rounded-xl p-4 space-y-3 mt-4">
                {[1, 2, 3, 4].map(i => <div key={i} className="h-16 w-full bg-slate-700/30 rounded-lg"></div>)}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Helper: wrap content with access check — shows UnauthorizedPage if denied
  const guard = (path, content) => hasAccess(path) ? content : <UnauthorizedPage />;

  const handleDragStart = (event) => {
    setActiveDragItem(event.active.data.current);
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    setActiveDragItem(null);

    if (!over) return;

    if (active.data.current?.type === 'REQUEST' && over.data.current?.type === 'AMBULANCE') {
      const request = active.data.current.request;
      const ambulance = over.data.current.ambulance;

      if (ambulance.estado === "Disponible") {
        assignAmbulance(request.id, ambulance.id);
        showToast('Solicitud asignada exitosamente', 'success');
      }
    }
  };

  const handleDragCancel = () => {
    setActiveDragItem(null);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="flex h-screen bg-dark-900 overflow-hidden font-sans text-slate-100 selection:bg-blue-500/30">
        {/* Mobile Header */}
        <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-dark-800 border-b border-slate-700 flex items-center justify-between px-4 z-50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center text-white shadow-lg">
              <span className="font-bold text-lg leading-none">R</span>
            </div>
            <span className="font-bold text-lg text-white tracking-tight">LMA</span>
          </div>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
          >
            <Menu size={24} />
          </button>
        </div>

        {isMobileMenuOpen && (
          <div
            className="lg:hidden fixed inset-0 bg-dark-900/80 backdrop-blur-sm z-50"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        <div className={`fixed inset-y-0 left-0 z-[60] transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <Sidebar
            activeTab={activeTab}
            onMobileClose={() => setIsMobileMenuOpen(false)}
            stats={{ activeRequests: solicitudesActivas.length }}
          />
        </div>

        <div className="flex-1 flex flex-col h-full pt-16 lg:pt-0">
          <Routes>
            <Route path="/" element={guard('/',
              <div className="flex-1 flex flex-col lg:flex-row h-full overflow-hidden">
                <TriageBoard
                  solicitudes={solicitudesPendientes}
                  getClienteById={getClienteById}
                  className="flex-none lg:h-full overflow-y-auto"
                />
                <main className="flex-1 min-w-0 bg-[#0B1121] shadow-inner lg:h-full overflow-y-auto hidden lg:block">
                  <FleetMonitor
                    flota={flota}
                    onAddAmbulance={createRealAmbulance}
                    onAddRequest={() => setIsModalOpen(true)}
                    onStatusChange={updateAmbulanceStatus}
                  />
                </main>
              </div>
            )} />

            <Route path="/historial" element={guard('/historial',
              <HistoryView
                historial={historialSolicitudes}
                getClienteById={getClienteById}
                updateServiceChecklist={updateServiceChecklist}
                closeService={closeService}
              />
            )} />

            <Route path="/metricas" element={guard('/metricas',
              <MetricsDashboard flota={flota} solicitudes={solicitudes} turnos={turnosHoy} />
            )} />

            <Route path="/directorio" element={guard('/directorio',
              <ClientDirectory clientes={clientes} onCreateClient={createClient} onUpdateClient={updateClient} />
            )} />

            <Route path="/personal" element={guard('/personal',
              <PersonnelView
                empleados={empleados}
                turnosHoy={turnosHoy}
                prenominaMensual={prenominaMensual}
                flota={flota}
                addEmpleado={addEmpleado}
                updateEmpleado={updateEmpleado}
                addTurno={addTurno}
                updateTurno={updateTurno}
                updateFlota={updateFlota}
              />
            )} />

            <Route path="/configuracion" element={guard('/configuracion',
              <div className="flex-1 p-10 flex flex-col items-center justify-center bg-[#0B1121] text-slate-500">
                <h2 className="text-2xl font-bold mb-4">Configuración del Sistema</h2>
                <div className="bg-dark-800 border border-slate-700 p-6 rounded-xl max-w-md text-center space-y-4">
                  <h3 className="text-white font-semibold">Base de Datos (Firebase)</h3>
                  <p className="text-sm">Si tu dashboard aparece vacío, significa que tu base de datos de Firestore aún no tiene los registros iniciales de prueba.</p>
                  <button
                    onClick={async () => {
                      const { seedInitialData } = await import('./firebase/config');
                      const success = await seedInitialData();
                      if (success) alert('¡Datos inyectados a Firebase con éxito!');
                      else alert('Error: Revisa la consola para más detalles.');
                    }}
                    className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-4 rounded-lg w-full transition-colors"
                  >
                    Inyectar Datos Iniciales
                  </button>
                </div>
              </div>
            )} />

            {/* Catch-all: unknown paths show unauthorized */}
            <Route path="*" element={<UnauthorizedPage />} />
          </Routes>
        </div>
      </div>

      <DragOverlay dropAnimation={{
        duration: 250,
        easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
      }}>
        {activeDragItem && activeDragItem.type === 'REQUEST' ? (
          <div className="opacity-90 scale-105 rotate-3 w-80 shadow-2xl z-50 pointer-events-none">
            <RequestCardUI
              request={activeDragItem.request}
              client={activeDragItem.client}
              isDragging={true}
            />
          </div>
        ) : null}
      </DragOverlay>

      {isModalOpen && (
        <NewServiceModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          clientes={clientes}
          onSubmit={createRealRequest}
        />
      )}
      <ToastContainer toasts={toasts} dismiss={dismissToast} />
    </DndContext>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/*" element={<AppLayout />} />
      </Route>
    </Routes>
  );
}

export default App;
