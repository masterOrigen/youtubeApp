FROM node:20-alpine

WORKDIR /app

# Copiar archivos de dependencias primero para mejor caching
COPY package.json package-lock.json ./

# Instalar dependencias
RUN npm install --production

# Copiar el resto de los archivos
COPY . .

# Build de la aplicación
RUN npm run build

# Limpiar caché innecesaria
RUN npm cache clean --force

# Variables de entorno
ENV NODE_ENV=production
ENV PORT=$PORT
EXPOSE $PORT

# Comando de inicio para producción
CMD ["npm", "run", "serve"]
