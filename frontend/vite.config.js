import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import compression from 'vite-plugin-compression'

export default defineConfig({
  plugins: [
    react(),
    compression({ algorithm: 'gzip', ext: '.gz', threshold: 1024 }),
  ],
  build: {
    outDir: '../backend/static/frontend',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          leaflet: ['leaflet'],
          charts: ['chart.js', 'react-chartjs-2'],
          motion: ['framer-motion'],
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:8001', changeOrigin: true },
      '/ws': { target: 'ws://localhost:8001', ws: true },
    },
  },
})
