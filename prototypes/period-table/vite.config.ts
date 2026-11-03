import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

// PROTOTYPE (issue #9): throwaway, deleted before the merge.
export default defineConfig({
  plugins: [vue(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@examples': path.resolve(__dirname, '../../docs/examples'),
    },
  },
})
