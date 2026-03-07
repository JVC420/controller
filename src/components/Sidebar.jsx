import React from 'react';
import { LayoutDashboard, History, Users, Settings, Activity, BarChart, UserCog } from 'lucide-react';

const Sidebar = ({ activeTab, setActiveTab, stats, sesionActual }) => {
    const isAdmin = sesionActual?.rol === 'admin';
    return (
        <aside className="w-20 lg:w-64 bg-dark-800 border-r border-slate-700 h-screen flex flex-col items-center lg:items-start py-6 transition-all duration-300">
            <div className="px-0 lg:px-6 mb-10 w-full flex justify-center lg:justify-start">
                <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-red-900/50">
                    <Activity size={24} />
                </div>
                <span className="hidden lg:block ml-3 font-bold text-xl tracking-tight text-white mt-1">LMA</span>
            </div>

            <nav className="flex-1 w-full">
                <ul className="space-y-2">
                    <NavItem
                        icon={<LayoutDashboard size={24} />}
                        label="Dashboard"
                        active={activeTab === 'dashboard'}
                        onClick={() => setActiveTab('dashboard')}
                        badge={stats?.activeRequests}
                    />
                    <NavItem icon={<History size={24} />} label="Historial" active={activeTab === 'historial'} onClick={() => setActiveTab('historial')} />

                    {isAdmin && (
                        <>
                            <NavItem icon={<BarChart size={24} />} label="Métricas (KPI)" active={activeTab === 'metricas'} onClick={() => setActiveTab('metricas')} />
                            <NavItem icon={<Users size={24} />} label="Directorio" active={activeTab === 'directorio'} onClick={() => setActiveTab('directorio')} />
                            <NavItem icon={<UserCog size={24} />} label="Personal" active={activeTab === 'personal'} onClick={() => setActiveTab('personal')} />
                            <NavItem icon={<Settings size={24} />} label="Configuración" active={activeTab === 'configuracion'} onClick={() => setActiveTab('configuracion')} />
                        </>
                    )}
                </ul>
            </nav>

            <div className="mt-auto px-0 lg:px-6 w-full flex justify-center lg:justify-start">
                <div className="w-10 h-10 rounded-full bg-slate-700 border-2 border-slate-600 flex items-center justify-center font-bold text-slate-300 uppercase">
                    {sesionActual?.usuario?.charAt(0) || 'U'}
                </div>
                <div className="hidden lg:block ml-3">
                    <p className="text-sm font-semibold text-white">{sesionActual?.usuario || 'Usuario'}</p>
                    <p className="text-xs text-slate-400 capitalize">{sesionActual?.rol || 'Rol Desconocido'}</p>
                </div>
            </div>
        </aside>
    );
};

const NavItem = ({ icon, label, active, onClick, badge }) => (
    <li>
        <button onClick={onClick} className={`w-full flex items-center justify-between px-0 lg:px-6 py-3 cursor-pointer transition-colors ${active ? 'bg-blue-500/10 text-blue-400 border-r-4 border-blue-500' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
            <div className="flex items-center justify-center lg:justify-start">
                {icon}
                <span className="hidden lg:block ml-4 font-medium">{label}</span>
            </div>
            {badge > 0 && (
                <span className="hidden lg:flex ml-auto bg-blue-600 text-white text-xs font-bold px-2 py-0.5 rounded-full mr-2">
                    {badge}
                </span>
            )}
        </button>
    </li>
);

export default Sidebar;
