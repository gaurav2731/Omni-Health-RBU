import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'
import { defineConfig } from 'vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
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
  },
})
