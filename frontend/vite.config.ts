import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import wasm from 'vite-plugin-wasm'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  base: '/',
  plugins: [wasm(), react()],
  resolve: {
    alias: {
      assert: fileURLToPath(new URL('./src/shims/assert.ts', import.meta.url)),
      'isomorphic-ws': fileURLToPath(new URL('./src/shims/isomorphicWs.ts', import.meta.url)),
    },
  },
  build: {
    target: 'esnext',
    sourcemap: true,
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/main.tsx', 'src/test/**'],
    },
  },
})
