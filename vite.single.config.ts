/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'
import { viteSingleFile } from 'vite-plugin-singlefile'
import { fileURLToPath, URL } from 'node:url'

// Single-file build: everything inlined into one HTML file that runs from a double-click (file://) in any browser.
export default defineConfig({
  plugins: [preact(), viteSingleFile({ removeViteModuleLoader: true })],
  base: './',
  define: { 'import.meta.env.SINGLE': 'true' },
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  build: { target: 'es2022', outDir: 'release/single', emptyOutDir: true, rollupOptions: { output: { inlineDynamicImports: true } } },
})
