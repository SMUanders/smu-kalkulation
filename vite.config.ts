import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { readFileSync } from 'node:fs'

// SMU Kalkulation — selvstændig SMU-app (Small App First) og ejer af
// kalkulationsdomænet (TR-053). Ingen database i dette trin.
// Menneskelig PRODUKTVERSION — eneste sandhedskilde er package.json "version".
// Indlejres som __APP_PRODUCT_VERSION__ og vises diskret i UI. Adskilt fra et
// teknisk build-id, som denne app ikke har (se src/lib/version.ts).
const PRODUCT_VERSION = JSON.parse(readFileSync('./package.json', 'utf-8')).version as string

export default defineConfig({
  define: {
    __APP_PRODUCT_VERSION__: JSON.stringify(PRODUCT_VERSION),
  },
  plugins: [react(), tailwindcss()],
  server: { port: 5180 },
  test: {
    environment: 'node',
    // Prismotoren og adgangsreglen testes direkte — aldrig gennem UI.
    include: ['src/**/*.test.ts'],
  },
})
