import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'
import { resolve } from 'node:path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        dashboard: resolve(import.meta.dirname, 'index.html'),
        popup: resolve(import.meta.dirname, 'popup.html'),
        options: resolve(import.meta.dirname, 'options.html'),
        background: resolve(import.meta.dirname, 'src/extension/background.ts'),
        content: resolve(import.meta.dirname, 'src/extension/content.ts'),
      },
      output: {
        entryFileNames: (chunk) =>
          ['background', 'content'].includes(chunk.name) ? '[name].js' : 'assets/[name]-[hash].js',
      },
    },
  },
  test: {
    environment: 'node',
  },
})
