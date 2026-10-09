import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  plugins: [react()],
  server: {
    port: 6326,
    strictPort: true,
    allowedHosts: ['admin.dev.retniw.cc'],
    proxy: { '/api': 'http://localhost:6324' },
  },
})
