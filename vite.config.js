import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '')

  return {
    // Inject environment variables into the code
    define: {
      __DEV_PIN__: JSON.stringify(env.__DEV_PIN__ || null),
      __firebase_config: JSON.stringify(env.__firebase_config || null),
      __app_id: JSON.stringify(env.__app_id || 'unsam-erapat-v2')
    },
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
 }
})
