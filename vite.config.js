import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  
  // Root directory for the project
  root: 'src/client',

  // Configuración del servidor de desarrollo
  server: {
    host: '0.0.0.0',
    port: 3030,  // Actualizado al puerto 3030
    strictPort: true,

    // Proxy para API calls al servidor backend
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
        ws: true,
        configure: (proxy, options) => {
          console.log('[Proxy] Configurando proxy para /api -> http://localhost:8080');
          
          proxy.on('proxyReq', (proxyReq, req, res) => {
            console.log(`[Proxy] ${req.method} ${req.url} -> ${options.target}${req.url}`);
          });
          
          proxy.on('proxyRes', (proxyRes, req, res) => {
            console.log(`[Proxy Response] ${req.method} ${req.url} -> ${proxyRes.statusCode}`);
          });
          
          proxy.on('error', (err, req, res) => {
            console.error('[Proxy Error]', err);
            if (res && !res.headersSent) {
              res.writeHead(500, { 'Content-Type': 'text/plain' });
              res.end('Proxy error');
            }
          });
        }
      },
      // Proxy para WebSocket connections
      '/ws': {
        target: 'ws://localhost:8080',
        ws: true,
        changeOrigin: true
      }
    },

    // CORS configuration
    cors: {
      origin: ['http://localhost:3030', 'http://localhost:3001', 'http://localhost:8080', 'http://127.0.0.1:3030'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH']
    },
    
    // Configuración adicional
    hmr: {
      protocol: 'ws',
      host: 'localhost'
    }
  },

  // Configuración de build
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,

    // Optimizaciones de build
    rollupOptions: {
      output: {
        manualChunks: {
          // Separar vendor chunks para mejor caching
          vendor: ['react', 'react-dom'],
          lucide: ['lucide-react'],
          // Separar hooks y servicios
          hooks: [
            'src/client/hooks/useMonitoring.js',
            'src/client/hooks/useAlerts.js',
            'src/client/hooks/useCompliance.js'
          ]
        }
      }
    },

    // Configuración de assets
    assetsInlineLimit: 4096, // 4kb
    chunkSizeWarningLimit: 1000,

    // Minimización
    minify: false
  },

  // Resolución de paths
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src/client'),
      '@components': path.resolve(__dirname, 'src/client/components'),
      '@hooks': path.resolve(__dirname, 'src/client/hooks'),
      '@services': path.resolve(__dirname, 'src/client/services'),
      '@config': path.resolve(__dirname, 'src/client/config'),
      '@utils': path.resolve(__dirname, 'src/client/utils')
    }
  },

  // Variables de entorno
  define: {
    __DEV__: process.env.NODE_ENV === 'development',
    __PROD__: process.env.NODE_ENV === 'production',
    __VERSION__: JSON.stringify(process.env.npm_package_version || '1.0.0')
  },

  // Configuración de assets públicos
  publicDir: 'public',

  // Base URL para deployment
  base: '/',

  // Configuración de CSS
  css: {
    devSourcemap: true,
    preprocessorOptions: {
      scss: {
        additionalData: `@import "@/styles/variables.scss";`
      }
    }
  },

  // Optimización de dependencias
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'lucide-react'
    ],
    exclude: [
      // Excluir módulos que causan problemas
    ]
  },

  // Configuración PWA específica
  esbuild: {
    target: 'es2020'
  },

  // Configuración para el preview
  preview: {
    port: 4173,
    strictPort: true,
    host: '0.0.0.0'
  }
});