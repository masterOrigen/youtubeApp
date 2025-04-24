FROM node:20-alpine

# Configuración inicial
WORKDIR /app

# 1. Copiar solo los archivos necesarios para instalar dependencias
COPY package.json package-lock.json ./

# 2. Instalar dependencias correctamente
RUN npm install --unsafe-perm --legacy-peer-deps && \
    npm cache clean --force && \
    chown -R node:node /app

# 3. Cambiar a usuario no-root para mayor seguridad
USER node

# 4. Copiar el resto de archivos con los permisos correctos
COPY --chown=node:node . .

# 5. Construir la aplicación
RUN npm run build

# 6. Configuración para producción
ENV NODE_ENV=production
ENV PORT=$PORT
EXPOSE $PORT

# 7. Comando de inicio optimizado
CMD ["npm", "run", "serve"]
