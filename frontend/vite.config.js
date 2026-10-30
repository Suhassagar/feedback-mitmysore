import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  build: {
    sourcemap: false,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-charts': ['recharts'],
          'vendor-xlsx': ['xlsx'],
          'vendor-pdf': ['jspdf', 'jspdf-autotable'],
          'vendor-motion': ['framer-motion'],
          'vendor-icons': ['lucide-react'],
          'vendor-ui': ['react-hot-toast', 'zustand', 'axios', 'socket.io-client', 'react-markdown']
        }
      }
    }
  },
  esbuild: {
    // Strip console.* and debugger statements from the minified production bundle
    drop: mode === 'production' ? ['console', 'debugger'] : [],
  },
}))
