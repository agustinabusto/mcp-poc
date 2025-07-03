import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],

  // Configuración para desarrollo
  root: 'src/client',
  publicDir: '../../public',

  // Configuración de build
  build: {
    outDir: '../../dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'src/client/index.html')
      }
    }
  },

  // Servidor de desarrollo
  server: {
    port: 3000,
    host: true, // Permite conexiones externas
    cors: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false
      },
      '/health': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false
      },
      '/ws': {
        target: 'ws://localhost:8080',
        ws: true,
        changeOrigin: true
      }
    }
  },

  // Optimizaciones
  optimizeDeps: {
    include: ['react', 'react-dom']
  },

  // Variables de entorno
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version)
  },

  // Configuración para preview
  preview: {
    port: 4173,
    host: true
  }
});