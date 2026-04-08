import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const fixedHost = '127.0.0.1'
const fixedPort = 4173

export default defineConfig({
  plugins: [react()],
  base: '/Stocking/',
  server: {
    host: fixedHost,
    port: fixedPort,
    strictPort: true,
  },
  preview: {
    host: fixedHost,
    port: fixedPort,
    strictPort: true,
  },
})