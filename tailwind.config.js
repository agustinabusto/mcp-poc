/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/client/**/*.{js,jsx,ts,tsx}',
    './src/client/index.html',
  ],

  // Modo oscuro por clase
  darkMode: 'class',

  theme: {
    extend: {
      // Colores personalizados AFIP
      colors: {
        afip: {
          blue: '#0066cc',
          green: '#28a745',
          red: '#dc3545',
          yellow: '#ffc107',
          gray: '#6c757d'
        }
      },

      // Fuentes
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'sans-serif'],
        mono: ['SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'Liberation Mono', 'Courier New', 'monospace']
      },

      // Animaciones
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-in': 'slideIn 0.3s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite'
      },

      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        slideIn: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' }
        }
      },

      // Espaciado
      spacing: {
        '18': '4.5rem',
        '88': '22rem'
      },

      // Breakpoints personalizados
      screens: {
        'xs': '475px',
        '3xl': '1600px'
      }
    },
  },

  plugins: [],

  // Configuración para purgar CSS no usado
  purge: {
    enabled: process.env.NODE_ENV === 'production',
    content: [
      './src/client/**/*.{js,jsx,ts,tsx}',
      './src/client/index.html',
    ],
    options: {
      safelist: [
        'bg-red-100',
        'bg-yellow-100',
        'bg-green-100',
        'bg-blue-100',
        'text-red-800',
        'text-yellow-800',
        'text-green-800',
        'text-blue-800'
      ]
    }
  }
};