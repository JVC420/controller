import React, { useMemo, useState } from 'react';
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
import SupportChatbot from './components/SupportChatbot';
import { useDashboardData } from './hooks/useDashboardData';
import { useAuth, ROLES } from './contexts/AuthContext';
import UnauthorizedPage from './components/UnauthorizedPage';
import { ToastContainer, useToast } from './components/ui/Toast';
import { Menu } from 'lucide-react';
import { canAssignRequestToAmbulance } from './utils/fleetStatus';

// Map route paths to tab names for sidebar highlighting
const pathToTab = {
  '/': 'dashboard',
  '/historial': 'historial',
  '/metricas': 'metricas',
  '/directorio': 'directorio',
  '/personal': 'personal',
};

function AppLayout() {
  const location = useLocation();
  const activeRoute = location.pathname;
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
    flotaStatusLog,
    loading,
    getClienteById,
    getNextReqId,
    getNextClientId,
    assignAmbulance,
    addMockAmbulance,
    createRealRequest,
    updateRealRequest,
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
  } = useDashboardData(activeRoute);

  const { hasAccess, role, loading: authLoading } = useAuth();
  const activeTab = pathToTab[location.pathname] || 'dashboard';

  // Compute the default landing page for this role
  const defaultRoute = ROLES[role]?.routes[0] || '/login';

  const [activeDragItem, setActiveDragItem] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRequest, setEditingRequest] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showProgrammedDashboardView, setShowProgrammedDashboardView] = useState(false);
  const { toasts, show: showToast, dismiss: dismissToast } = useToast();

  const toMs = (value) => {
    if (!value) return null;
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;
    if (typeof value?.toDate === 'function') {
      const ms = value.toDate().getTime();
      return Number.isFinite(ms) ? ms : null;
    }
    const ms = new Date(value).getTime();
    return Number.isFinite(ms) ? ms : null;
  };

  const toColombiaDate = (value) => {
    const ms = toMs(value);
    if (ms == null) return 'Sin fecha';
    const d = new Date(ms);
    return new Intl.DateTimeFormat('es-CO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(d);
  };

  const scheduledServicesDashboard = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return solicitudes
      .filter((s) => {
        if (s?.estado === 'Finalizado' || s?.estado === 'En revisión') return true;
        const programmed = s?.programacionInfo?.servicioProgramado;
        if (!programmed) return false;
        const ms = toMs(programmed);
        return ms != null && ms >= today.getTime();
      })
      .sort((a, b) => {
        const aFinal = a?.estado === 'Finalizado';
        const bFinal = b?.estado === 'Finalizado';
        if (aFinal !== bFinal) return aFinal ? 1 : -1;
        const aMs = toMs(a?.programacionInfo?.servicioProgramado) ?? 0;
        const bMs = toMs(b?.programacionInfo?.servicioProgramado) ?? 0;
        return aMs - bMs;
      });
  }, [solicitudes]);

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

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    setActiveDragItem(null);

    if (!over) return;

    if (active.data.current?.type === 'REQUEST' && over.data.current?.type === 'AMBULANCE') {
      const request = active.data.current.request;
      const ambulance = over.data.current.ambulance;
      const canAssign = canAssignRequestToAmbulance(ambulance, turnosHoy);

      if (!canAssign) {
        showToast('No se puede asignar: la ambulancia no tiene la tripulación completa.', 'error');
        return;
      }

      try {
        await assignAmbulance(request.id, ambulance.id);
        showToast('Solicitud asignada exitosamente', 'success');
      } catch (error) {
        showToast(error?.message || 'No se pudo asignar la solicitud.', 'error');
      }
    }
  };

  const handleDragCancel = () => {
    setActiveDragItem(null);
  };

  const handleCreateRequest = () => {
    setEditingRequest(null);
    setIsModalOpen(true);
  };

  const handleEditRequest = (request) => {
    setEditingRequest(request);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingRequest(null);
  };

  const dashboardViewSwitch = (
    <div className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-dark-800 px-2.5 py-1.5">
      <span className="text-[10px] font-semibold text-slate-300 uppercase tracking-wider hidden sm:inline">
        Mostrar en Lista
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={showProgrammedDashboardView}
        onClick={() => setShowProgrammedDashboardView((v) => !v)}
        className={`relative inline-flex h-7 w-14 items-center rounded-full border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-0 ${
          showProgrammedDashboardView
            ? 'bg-emerald-500/80 border-emerald-400/70'
            : 'bg-slate-700 border-slate-600'
        }`}
        title={showProgrammedDashboardView ? 'Turn Off' : 'Turn On'}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200 ${
            showProgrammedDashboardView ? 'translate-x-8' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );

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

        <div className={`fixed inset-y-0 left-0 z-[60] transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 shrink-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <Sidebar
            activeTab={activeTab}
            onMobileClose={() => setIsMobileMenuOpen(false)}
            stats={{ activeRequests: solicitudesActivas.length }}
          />
        </div>

        <div className="flex-1 min-w-0 flex flex-col h-full pt-16 lg:pt-0">
          <Routes>
            <Route path="/" element={guard('/',
              <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#0B1121]">
                {showProgrammedDashboardView ? (
                  <div className="flex-1 overflow-auto p-4 md:p-6">
                    <div className="mb-4 flex justify-end">
                      {dashboardViewSwitch}
                    </div>
                    <div className="bg-dark-800 border border-slate-700 rounded-xl overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="hidden min-[1600px]:table w-full table-auto text-left text-xs md:text-sm">
                          <thead className="text-[11px] text-slate-400 bg-dark-900/60 font-semibold uppercase tracking-wider">
                            <tr>
                              <th className="px-4 py-3 whitespace-nowrap">Fecha de programacion</th>
                              <th className="px-4 py-3 whitespace-nowrap">ID</th>
                              <th className="px-4 py-3 whitespace-nowrap">Movil</th>
                              <th className="px-4 py-3 whitespace-nowrap">Tipo ambulancia</th>
                              <th className="px-4 py-3">Paciente</th>
                              <th className="px-4 py-3">Entidad</th>
                              <th className="px-4 py-3">Origen</th>
                              <th className="px-4 py-3">Destino 1</th>
                              <th className="px-4 py-3">Destino 2</th>
                              <th className="px-4 py-3 whitespace-nowrap">Estado</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/80">
                            {scheduledServicesDashboard.map((s) => {
                              const movil = flota.find((a) => a.id === s.ambulanciaAsignada);
                              return (
                                <tr key={s.id} className="hover:bg-slate-800/20 transition-colors">
                                  <td className="px-4 py-3 text-slate-300 whitespace-nowrap">{toColombiaDate(s?.programacionInfo?.servicioProgramado)}</td>
                                  <td className="px-4 py-3 font-mono text-cyan-300 whitespace-nowrap">{s.id}</td>
                                  <td className="px-4 py-3 text-slate-300 whitespace-nowrap">{s.ambulanciaAsignada || 'Sin asignar'}</td>
                                  <td className="px-4 py-3 text-slate-400 whitespace-nowrap">{movil?.tipo || 'N/A'}</td>
                                  <td className="px-4 py-3 text-slate-300 break-words">{s?.pacienteInfo?.nombre || s.paciente || 'Sin paciente'}</td>
                                  <td className="px-4 py-3 text-slate-400 break-words">{s?.entidadInfo?.nombreEntidad || 'Sin entidad'}</td>
                                  <td className="px-4 py-3 text-slate-400 break-words">{s?.origenInfo?.nombre || s.origen || 'Sin origen'}</td>
                                  <td className="px-4 py-3 text-slate-400 break-words">{s?.destino1Info?.nombre || s.destino || 'Sin destino'}</td>
                                  <td className="px-4 py-3 text-slate-400 break-words">{s?.destino2Info?.nombre || 'No aplica'}</td>
                                  <td className="px-4 py-3 whitespace-nowrap">
                                    {s.changeStatusApproval ? (
                                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                                        ['Cancelado', 'Negado', 'Fallido'].some(st => s.changeStatusApproval.includes(st))
                                          ? 'bg-red-500/10 text-red-400 border-red-500/20'
                                          : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                      }`}>
                                        {s.changeStatusApproval}
                                      </span>
                                    ) : (
                                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                                        s.estado === 'Finalizado'
                                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                          : s.estado === 'En revisión'
                                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse'
                                          : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                      }`}>
                                        {s.estado || 'Sin estado'}
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                            {scheduledServicesDashboard.length === 0 && (
                              <tr>
                                <td colSpan="10" className="px-4 py-10 text-center text-slate-500">No hay servicios programados.</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>

                      <div className="min-[1600px]:hidden p-3 md:p-4 flex flex-col gap-3">
                        {scheduledServicesDashboard.map((s) => {
                          const movil = flota.find((a) => a.id === s.ambulanciaAsignada);
                          return (
                            <div key={s.id} className="bg-dark-900 border border-slate-700/60 rounded-xl p-3 md:p-4 space-y-3">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="text-[11px] text-slate-500 uppercase tracking-wider">Fecha de programacion</p>
                                  <p className="text-sm text-slate-200 font-semibold">{toColombiaDate(s?.programacionInfo?.servicioProgramado)}</p>
                                </div>
                                {s.changeStatusApproval ? (
                                  <span className={`shrink-0 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                                    ['Cancelado', 'Negado', 'Fallido'].some(st => s.changeStatusApproval.includes(st))
                                      ? 'bg-red-500/10 text-red-400 border-red-500/20'
                                      : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                  }`}>
                                    {s.changeStatusApproval}
                                  </span>
                                ) : (
                                  <span className={`shrink-0 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                                    s.estado === 'Finalizado'
                                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                      : s.estado === 'En revisión'
                                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse'
                                      : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                  }`}>
                                    {s.estado || 'Sin estado'}
                                  </span>
                                )}
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                <div className="rounded-lg border border-slate-700/70 bg-slate-800/30 px-2.5 py-2">
                                  <p className="text-slate-500 uppercase tracking-wider mb-1">ID</p>
                                  <p className="font-mono text-cyan-300 break-all">{s.id}</p>
                                </div>
                                <div className="rounded-lg border border-slate-700/70 bg-slate-800/30 px-2.5 py-2">
                                  <p className="text-slate-500 uppercase tracking-wider mb-1">Movil</p>
                                  <p className="text-slate-300">{s.ambulanciaAsignada || 'Sin asignar'}</p>
                                </div>
                                <div className="rounded-lg border border-slate-700/70 bg-slate-800/30 px-2.5 py-2">
                                  <p className="text-slate-500 uppercase tracking-wider mb-1">Tipo ambulancia</p>
                                  <p className="text-slate-400">{movil?.tipo || 'N/A'}</p>
                                </div>
                                <div className="rounded-lg border border-slate-700/70 bg-slate-800/30 px-2.5 py-2">
                                  <p className="text-slate-500 uppercase tracking-wider mb-1">Paciente</p>
                                  <p className="text-slate-300 break-words">{s?.pacienteInfo?.nombre || s.paciente || 'Sin paciente'}</p>
                                </div>
                                <div className="rounded-lg border border-slate-700/70 bg-slate-800/30 px-2.5 py-2 sm:col-span-2">
                                  <p className="text-slate-500 uppercase tracking-wider mb-1">Entidad</p>
                                  <p className="text-slate-400 break-words">{s?.entidadInfo?.nombreEntidad || 'Sin entidad'}</p>
                                </div>
                                <div className="rounded-lg border border-slate-700/70 bg-slate-800/30 px-2.5 py-2 sm:col-span-2">
                                  <p className="text-slate-500 uppercase tracking-wider mb-1">Origen</p>
                                  <p className="text-slate-400 break-words">{s?.origenInfo?.nombre || s.origen || 'Sin origen'}</p>
                                </div>
                                <div className="rounded-lg border border-slate-700/70 bg-slate-800/30 px-2.5 py-2 sm:col-span-2">
                                  <p className="text-slate-500 uppercase tracking-wider mb-1">Destino 1</p>
                                  <p className="text-slate-400 break-words">{s?.destino1Info?.nombre || s.destino || 'Sin destino'}</p>
                                </div>
                                <div className="rounded-lg border border-slate-700/70 bg-slate-800/30 px-2.5 py-2 sm:col-span-2">
                                  <p className="text-slate-500 uppercase tracking-wider mb-1">Destino 2</p>
                                  <p className="text-slate-400 break-words">{s?.destino2Info?.nombre || 'No aplica'}</p>
                                </div>
                              </div>
                            </div>
                          );
                        })}

                        {scheduledServicesDashboard.length === 0 && (
                          <div className="px-4 py-10 text-center text-slate-500">No hay servicios programados.</div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col lg:flex-row h-full overflow-hidden">
                    <TriageBoard
                      solicitudes={solicitudesPendientes}
                      getClienteById={getClienteById}
                      onEditRequest={handleEditRequest}
                      className="flex-none lg:h-full overflow-y-auto"
                    />
                    <main className="flex-1 min-w-0 bg-[#0B1121] shadow-inner lg:h-full overflow-y-auto hidden lg:block">
                      <FleetMonitor
                        flota={flota}
                        solicitudes={solicitudesActivas}
                        turnosHoy={turnosHoy}
                        onAddAmbulance={createRealAmbulance}
                        onAddRequest={handleCreateRequest}
                        onStatusChange={updateAmbulanceStatus}
                        onEditRequest={handleEditRequest}
                        headerControl={dashboardViewSwitch}
                      />
                    </main>
                  </div>
                )}
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
              <MetricsDashboard flota={flota} solicitudes={solicitudes} turnos={turnosHoy} flotaStatusLog={flotaStatusLog} />
            )} />

            <Route path="/directorio" element={guard('/directorio',
              <ClientDirectory clientes={clientes} onCreateClient={createClient} onUpdateClient={updateClient} getNextClientId={getNextClientId} />
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
              />
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
          onClose={handleCloseModal}
          clientes={clientes}
          initialData={editingRequest}
          isEditing={!!editingRequest}
          onSubmit={editingRequest ? updateRealRequest : createRealRequest}
          getNextReqId={getNextReqId}
          showToast={showToast}
        />
      )}
      <SupportChatbot />
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
