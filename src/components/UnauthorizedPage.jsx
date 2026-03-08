import { ShieldX } from 'lucide-react';
import { useAuth, ROLES } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const UnauthorizedPage = () => {
  const { role } = useAuth();
  const navigate = useNavigate();
  const defaultRoute = ROLES[role]?.routes[0] || '/';

  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-[#0B1121] p-8 text-center">
      <div className="w-20 h-20 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center justify-center mb-6">
        <ShieldX size={40} className="text-red-400" />
      </div>
      <h2 className="text-2xl font-bold text-white mb-2">Acceso Restringido</h2>
      <p className="text-slate-400 max-w-md mb-6">
        No tienes permisos para acceder a esta sección. Contacta al administrador si crees que esto es un error.
      </p>
      <button
        onClick={() => navigate(defaultRoute)}
        className="bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 px-6 rounded-xl transition-colors"
      >
        Ir a mi página principal
      </button>
    </div>
  );
};

export default UnauthorizedPage;
