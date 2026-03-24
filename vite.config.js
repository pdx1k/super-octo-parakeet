import { defineConfig } from 'vite'

export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
          codemirror: [
            '@codemirror/view',
            '@codemirror/state',
            '@codemirror/lang-javascript',
            '@codemirror/theme-one-dark',
            'codemirror',
          ],
        },
      },
    },
  },
})
