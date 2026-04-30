import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, ScanLine, UserCircle2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import QrScanner from '../components/checkin/QrScanner';

// Welcome screen shown to a tripulante after Google login.
// One primary action: open scanner → on detect → navigate to /ingreso?token=...
const CheckInHomePage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showScanner, setShowScanner] = useState(false);

  const handleDetected = (decodedText) => {
    setShowScanner(false);
    try {
      const url = new URL(decodedText);
      const token = url.searchParams.get('token');
      if (!token) throw new Error('QR sin token');
      navigate(`/ingreso?token=${encodeURIComponent(token)}`);
    } catch {
      // If the QR isn't a URL we recognize, surface a soft error via query
      navigate('/ingreso?token=invalid');
    }
  };

  return (
    <div className="min-h-screen bg-dark-900 flex flex-col">
      <header className="flex items-center justify-between p-4 border-b border-slate-800">
        <div className="flex items-center gap-2 text-white">
          <UserCircle2 size={22} />
          <span className="text-sm font-semibold truncate max-w-[60vw]">
            {user?.displayName || user?.email || 'Tripulante'}
          </span>
        </div>
        <button
          type="button"
          onClick={logout}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs"
        >
          <LogOut size={14} />
          Salir
        </button>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-6 gap-6 text-center">
        <div className="w-20 h-20 rounded-2xl bg-blue-600/15 border border-blue-500/30 flex items-center justify-center text-blue-300">
          <ScanLine size={40} />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">Bienvenido</h1>
          <p className="text-slate-300 mt-1">{user?.displayName || user?.email}</p>
        </div>
        <p className="text-slate-400 text-sm max-w-sm">
          Para registrar tu ingreso al turno, escanea el código QR que está en la tablet de tu móvil.
        </p>

        <button
          type="button"
          onClick={() => setShowScanner(true)}
          className="w-full max-w-sm inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold py-4 rounded-2xl transition-colors shadow-lg shadow-blue-900/30"
        >
          <ScanLine size={20} />
          Registrar asistencia
        </button>
      </main>

      {showScanner && (
        <QrScanner
          onDetected={handleDetected}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  );
};

export default CheckInHomePage;
