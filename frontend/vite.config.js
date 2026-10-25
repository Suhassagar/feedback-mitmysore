import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  build: {
    sourcemap: false,
    chunkSizeWarningLimit: 1000,
  },
  esbuild: {
    // Strip console.* and debugger statements from the minified production bundle
    drop: mode === 'production' ? ['console', 'debugger'] : [],
  },
}))
