import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: './', // relative paths so the build works on GitHub Pages under /flyertorecipe/
  resolve: {
    // Flyer Meal (flyermeal/) reuses Flyer2Recipes' deal matching and flyer clips.
    alias: { '@f2r': resolve(import.meta.dirname, 'src') },
  },
  build: {
    rolldownOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        flyermeal: resolve(import.meta.dirname, 'flyermeal/index.html'),
      },
    },
  },
})
