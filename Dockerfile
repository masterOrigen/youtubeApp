FROM node:20

WORKDIR /app

# Copiar archivos de dependencias
COPY package.json package-lock.json ./

# Instalar dependencias con permisos adecuados
RUN npm install --unsafe-perm

# Copiar archivos
COPY . .

# Build con permisos adecuados
RUN npm run build

# Variables de entorno
ENV NODE_ENV=production
ENV PORT=$PORT
EXPOSE $PORT

# Comando de inicio
CMD ["npm", "run", "serve"]
