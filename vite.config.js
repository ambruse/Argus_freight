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
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
      },
      '/_next': {
        target: 'http://127.0.0.1:3002',
        ws: true,
      },
      '/login': 'http://127.0.0.1:3002',
      '/register': 'http://127.0.0.1:3002',
      '/dashboard': 'http://127.0.0.1:3002',
      '/customer': 'http://127.0.0.1:3002',
      '/admin': 'http://127.0.0.1:3002',
      '/confirmed': 'http://127.0.0.1:3002',
      '/contacts': 'http://127.0.0.1:3002',
      '/rfq': 'http://127.0.0.1:3002',
      '/sales': 'http://127.0.0.1:3002',
      '/settings': 'http://127.0.0.1:3002',
      '/summary': 'http://127.0.0.1:3002',
      '/calling-agent': 'http://127.0.0.1:3002',
    }
  }
})
