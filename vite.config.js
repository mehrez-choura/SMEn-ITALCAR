import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // ⚠️ IMPORTANT : Remplacez 'NOM_DU_REPO' par le nom exact de votre dépôt GitHub
  // Exemple : si votre URL est https://github.com/votre-nom/mon-projet-energie
  // Alors écrivez : base: '/mon-projet-energie/',
  base: '/SMEn-ITALCAR/', 
  build: {
    outDir: 'dist',
  },
})
