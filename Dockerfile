FROM node:16

WORKDIR /app

# Copiar package.json y package-lock.json
COPY package*.json ./

# Instalar dependencias
RUN npm install

# Copiar el resto de los archivos
COPY . .

# Dar permisos al directorio
RUN chmod -R 777 /app

# Construir la aplicación
RUN npm run build

EXPOSE 4173

# Comando para ejecutar la aplicación
CMD ["npm", "run", "preview"]
