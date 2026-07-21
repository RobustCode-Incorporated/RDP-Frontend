import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'https://rdp-backend-xr8r.onrender.com',
        changeOrigin: true,
        secure: true,
      },
      '/actuator': {
        target: 'https://rdp-backend-xr8r.onrender.com',
        changeOrigin: true,
        secure: true,
      },
    },
  },
})
