import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    watch: {
      usePolling: true,
      interval: 500
    },
    proxy: {
      '^/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/_next': {
        target: 'http://localhost:3002',
        ws: true,
      },
      '/login': 'http://localhost:3002',
      '/register': 'http://localhost:3002',
      '/dashboard': 'http://localhost:3002',
      '/customer': 'http://localhost:3002',
      '/admin': 'http://localhost:3002',
      '/confirmed': 'http://localhost:3002',
      '/contacts': 'http://localhost:3002',
      '/rfq': 'http://localhost:3002',
      '/sales': 'http://localhost:3002',
      '/settings': 'http://localhost:3002',
      '/summary': 'http://localhost:3002',
      '/calling-agent': 'http://localhost:3002',
    }
  }
})
