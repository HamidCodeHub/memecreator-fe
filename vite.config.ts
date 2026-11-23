import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Spring Boot (memecreator) runs on 8081. The dev server forwards the backend paths to it, so the browser
// sees one site: the session cookie works and Google/Facebook redirect back to http://localhost:5173.
// The Host header is kept (no changeOrigin) so Spring builds that redirect URL with port 5173.
const backend = 'http://localhost:8081'
const proxied = ['/api', '/oauth2', '/login', '/generated', '/s/']

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: Object.fromEntries(proxied.map((path) => [path, { target: backend }])),
  },
})
