import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// GitHub Pages serves the site from /<repo-name>/
export default defineConfig({
  base: '/talk-german/',
  plugins: [react()],
})
