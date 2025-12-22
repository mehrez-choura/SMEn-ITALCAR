import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: 'SMEn-ITALCAR', // ⚠️ REMPLACEZ PAR LE NOM DE VOTRE REPO GITHUB
})
