import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // Set base path for GitHub Pages deployment under /vpix2/
  base: '/vpix2/',
  plugins: [react()],
  test: {
    environment: 'node',
    include: [
      'src/__tests__/**/*.spec.{ts,tsx,js,jsx}',
      'test/**/*.spec.{ts,js}',
      'src/components/**/*.spec.{ts,tsx,js,jsx}'
    ],
    environmentMatchGlobs: [
      ['src/__tests__/**/*.spec.*', 'jsdom'],
      ['src/components/**/*.spec.*', 'jsdom']
    ],
    setupFiles: ['test/setup.ts'],
  },
})
