# Multi-stage build para optimizar tamaño
FROM node:18-alpine AS base

# Instalar dependencias del sistema
RUN apk add --no-cache     python3     make     g++     sqlite     curl

WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Stage: Development
FROM base AS development
ENV NODE_ENV=development
RUN npm ci --include=dev
COPY . .
EXPOSE 8080 3000
CMD ["npm", "run", "dev"]

# Stage: Build
FROM base AS build
ENV NODE_ENV=production
RUN npm ci --only=production --no-audit
COPY . .
RUN npm run build

# Stage: Production
FROM node:18-alpine AS production
RUN apk add --no-cache sqlite curl
WORKDIR /app

# Crear usuario no-root
RUN addgroup -g 1001 -S nodejs
RUN adduser -S afipmonitor -u 1001

# Copiar archivos de producción
COPY --from=build --chown=afipmonitor:nodejs /app/dist ./dist
COPY --from=build --chown=afipmonitor:nodejs /app/src/server ./src/server
COPY --from=build --chown=afipmonitor:nodejs /app/config ./config
COPY --from=build --chown=afipmonitor:nodejs /app/package*.json ./
COPY --from=build --chown=afipmonitor:nodejs /app/node_modules ./node_modules

# Crear directorios necesarios
RUN mkdir -p data logs && chown -R afipmonitor:nodejs data logs

USER afipmonitor

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3   CMD curl -f http://localhost:8080/health || exit 1

EXPOSE 8080

CMD ["node", "src/server/index.js"]