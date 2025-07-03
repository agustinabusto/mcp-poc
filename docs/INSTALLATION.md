# Guía de Instalación - AFIP Monitor MCP

## Requisitos Previos

- Node.js 18+
- npm 9+
- Git

## Instalación Rápida

```bash
# 1. Clonar o descargar el proyecto
git clone <repository-url>
cd afip-monitor-mcp

# 2. Instalar dependencias
npm install

# 3. Crear estructura de directorios (si no existe)
npm run setup:dirs

# 4. Configurar variables de entorno
cp .env.example .env
# Editar .env con tus configuraciones

# 5. Ejecutar migraciones iniciales
npm run migrate

# 6. Poblar datos de prueba (opcional)
npm run seed

# 7. Iniciar en modo desarrollo
npm run dev
```

## Verificación de Instalación

1. **Servidor**: http://localhost:8080/health
2. **Cliente**: http://localhost:3000
3. **API Docs**: http://localhost:8080/docs

## Configuración para Producción

Ver [DEPLOYMENT.md](DEPLOYMENT.md) para instrucciones detalladas.

## Solución de Problemas

Ver [troubleshooting.md](guides/troubleshooting.md) para problemas comunes.
