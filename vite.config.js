import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['src/__tests__/**/*.spec.{ts,tsx,js,jsx}', 'test/**/*.spec.{ts,js}'],
    environmentMatchGlobs: [
      ['src/__tests__/**/*.spec.*', 'jsdom']
    ],
    setupFiles: ['test/setup.ts'],
  },
})
