import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// SMU Kalkulation — selvstændig SMU-app (Small App First) og ejer af
// kalkulationsdomænet (TR-053). Ingen database i dette trin.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 5180 },
  test: {
    environment: 'node',
    // Prismotoren og adgangsreglen testes direkte — aldrig gennem UI.
    include: ['src/**/*.test.ts'],
  },
})
