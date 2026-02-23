import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],

  // GitHub Pages base path (must match your repo name exactly)
  base: '/reflex_aware_chat_engine_demo/',

  // Allow importing shared/ from the repo root during dev
  server: {
    fs: {
      allow: ['..'],
    },
  },
})