import React from 'react';
import { logEvent } from '../services/auditService';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    logEvent({
      action: 'error',
      entity: 'app',
      success: false,
      errorMessage: error?.message || String(error),
      metadata: {
        source: 'react_error_boundary',
        stack: error?.stack ? String(error.stack).slice(0, 2000) : null,
        componentStack: info?.componentStack ? String(info.componentStack).slice(0, 2000) : null,
      },
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-dark-900 text-slate-200 p-6">
          <div className="max-w-md w-full bg-dark-800 border border-slate-700 rounded-xl p-6 text-center space-y-4">
            <h1 className="text-xl font-semibold text-red-400">Ocurrió un error inesperado</h1>
            <p className="text-sm text-slate-400">
              El equipo técnico ha sido notificado. Recarga la página para continuar.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold"
            >
              Recargar
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

let globalHandlersInstalled = false;
export const installGlobalErrorHandlers = () => {
  if (globalHandlersInstalled || typeof window === 'undefined') return;
  globalHandlersInstalled = true;

  window.addEventListener('error', (event) => {
    logEvent({
      action: 'error',
      entity: 'app',
      success: false,
      errorMessage: event?.message || 'window_error',
      metadata: {
        source: 'window_error',
        filename: event?.filename || null,
        lineno: event?.lineno || null,
        colno: event?.colno || null,
        stack: event?.error?.stack ? String(event.error.stack).slice(0, 2000) : null,
      },
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event?.reason;
    logEvent({
      action: 'error',
      entity: 'app',
      success: false,
      errorMessage: reason?.message || String(reason || 'unhandled_rejection'),
      metadata: {
        source: 'unhandled_rejection',
        stack: reason?.stack ? String(reason.stack).slice(0, 2000) : null,
      },
    });
  });
};

export default ErrorBoundary;
