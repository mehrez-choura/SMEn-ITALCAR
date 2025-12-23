import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Remplacez 'NOM_DU_REPO' par le nom exact de votre dépôt GitHub
export default defineConfig({
  plugins: [react()],
  base: '/SMEn-ITALCAR/', 
})
