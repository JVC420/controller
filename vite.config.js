import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/historia-clinica': {
        target: 'https://descargarhistoriaclinica-y25bumqpla-uc.a.run.app',
        changeOrigin: true,
        secure: true,
        rewrite: () => '/',
      },
      '/api/status-change-approval': {
        target: 'https://solicitarcambioestado-y25bumqpla-uc.a.run.app',
        changeOrigin: true,
        secure: true,
        rewrite: () => '/',
      },
      '/api/support-webhook': {
        target: 'https://enviarmensajesoporte-y25bumqpla-uc.a.run.app',
        changeOrigin: true,
        secure: true,
        rewrite: () => '/',
      },
    },
  },
})
