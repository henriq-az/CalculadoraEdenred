import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:8080',
      '/calculos': 'http://localhost:8080',
      '/cenarios': 'http://localhost:8080',
    },
  },
})
