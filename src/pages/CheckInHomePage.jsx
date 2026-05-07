import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, ScanLine, UserCircle2, LogIn, LogOut as LogOutShift } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import QrScanner from '../components/checkin/QrScanner';

// Welcome screen for tripulantes. Two actions, both share the same QR;
// the chosen action (in/out) determines which Cloud Function gets called.
const CheckInHomePage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [scannerFor, setScannerFor] = useState(null); // 'in' | 'out' | null

  const handleDetected = (decodedText) => {
    const action = scannerFor;
    setScannerFor(null);
    try {
      const url = new URL(decodedText);
      const token = url.searchParams.get('token');
      if (!token) throw new Error('QR sin token');
      const target = action === 'out' ? '/salida' : '/ingreso';
      navigate(`${target}?token=${encodeURIComponent(token)}`);
    } catch {
      const target = action === 'out' ? '/salida' : '/ingreso';
      navigate(`${target}?token=invalid`);
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
          Escanea el código QR de la tablet del móvil para registrar tu ingreso o tu salida del turno.
        </p>

        <div className="w-full max-w-sm flex flex-col gap-3">
          <button
            type="button"
            onClick={() => setScannerFor('in')}
            className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold py-4 rounded-2xl transition-colors shadow-lg shadow-blue-900/30"
          >
            <LogIn size={20} />
            Registrar ingreso
          </button>
          <button
            type="button"
            onClick={() => setScannerFor('out')}
            className="inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-4 rounded-2xl transition-colors shadow-lg shadow-emerald-900/30"
          >
            <LogOutShift size={20} />
            Registrar salida
          </button>
        </div>
      </main>

      {scannerFor && (
        <QrScanner
          onDetected={handleDetected}
          onClose={() => setScannerFor(null)}
        />
      )}
    </div>
  );
};

export default CheckInHomePage;
