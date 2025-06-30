import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: [
      '@dnd-kit/core',
      '@dnd-kit/sortable',
      '@dnd-kit/utilities'
    ]
  },
  preview: {
    host: '0.0.0.0',
    port: 10000,
    allowedHosts: ['taskly-frontend-8ll9.onrender.com']
  }
})
