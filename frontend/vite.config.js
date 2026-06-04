import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:8080',
      '/calculos': 'http://localhost:8080',
      '/simulacoes': 'http://localhost:8080',
      // '/cenarios' é endpoint do backend E rota do app. O bypass faz a
      // navegação do browser (F5/deep-link) cair no app (index.html), enquanto
      // as chamadas fetch/XHR continuam sendo proxiadas pro backend.
      '/cenarios': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        bypass(req) {
          if (req.headers.accept && req.headers.accept.includes('text/html')) {
            return '/index.html'
          }
        },
      },
    },
  },
})
