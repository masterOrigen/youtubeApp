FROM node:20-alpine

# 1. Configurar directorio de trabajo
WORKDIR /app

# 2. Copiar archivos de dependencias primero para mejor caché
COPY package.json package-lock.json ./

# 3. Instalar dependencias con permisos adecuados
RUN npm install --unsafe-perm --legacy-peer-deps && \
    npm install -g vite && \
    chmod -R 755 node_modules && \
    chmod 755 /app && \
    npm cache clean --force

# 4. Copiar el resto de archivos
COPY . .

# 5. Configurar permisos explícitos para los binarios
RUN chmod -R 755 node_modules/.bin && \
    chown -R node:node /app

# 6. Cambiar a usuario no-root para seguridad
USER node

# 7. Construir la aplicación
RUN npm run build

# 8. Configuración de producción
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

# 9. Usar npx para garantizar la ejecución correcta
CMD ["npx", "vite", "preview", "--host", "0.0.0.0", "--port", "3000"]
