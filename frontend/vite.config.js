import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// In dev, /api/* is forwarded to the Render backend, so the browser makes same-origin
// calls and CORS never comes into play. Change the target to http://localhost:8000
// to test against a local backend.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'https://brandboard.onrender.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})
