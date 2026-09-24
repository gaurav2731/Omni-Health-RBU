import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'
import { defineConfig } from 'vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Inject the production API base (Firebase Functions URL) as a build-time
  // constant instead of using import.meta.env inside api.js — jest/babel
  // cannot transform import.meta, and this keeps api.js test-safe.
  // Local dev: unset → api.js falls back to http://localhost:3001.
  define: {
    __OMNI_API_BASE__: JSON.stringify(process.env.VITE_API_BASE || ''),
  },
  resolve: {
    alias: {
      // Shared parser/filter modules live at the project root, outside frontend/.
      shared: path.resolve(__dirname, '..', 'shared'),
    },
  },
  server: {
    fs: {
      // Allow the dev server to serve the shared/ directory.
      allow: [path.resolve(__dirname, '..')],
    },
    // Local dev: /api/* proxies to the Express backend on :3001 (path prefix
    // stripped — backend routes are unprefixed). Mirrors the production
    // Vercel serverless function at the same /api/* origin.
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api/, '') || '/',
      },
    },
  },
})
