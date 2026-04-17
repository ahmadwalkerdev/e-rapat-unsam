import { defineConfig } from 'vite'

export default defineConfig({
  // Entry point
  build: {
    // Output directory
    outDir: 'dist',
    
    // Minification
    minify: 'esbuild',
    
    // Source maps (disable untuk production)
    sourcemap: false,
    
    // Rollup options untuk bundle
    rollupOptions: {
      input: {
        main: './index.html'
      },
      output: {
        // Chunk naming
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
        
        // Manual chunk splitting
        manualChunks: {
          // Vendor libraries (CDN di HTML tidak termasuk)
          'firebase-vendor': [],
          
          // App modules
          'app-core': [
            './app-state.js',
            './ui-utils.js',
            './format-utils.js'
          ],
          
          'app-modules': [
            './auth-module.js',
            './attendance-module.js',
            './dashboard-module.js',
            './room-entry-module.js',
            './room-management-module.js',
            './minutes-tools-module.js',
            './settings-module.js',
            './resource-module.js',
            './guest-module.js'
          ]
        }
      }
    },
    
    // Target browser modern
    target: 'es2020',
    
    // Chunk size warning (kb)
    chunkSizeWarningLimit: 500
  },
  
  // Development server
  server: {
    port: 8888,
    open: true
  },
  
  // Preview server (untuk cek build lokal)
  preview: {
    port: 8889
  }
})
