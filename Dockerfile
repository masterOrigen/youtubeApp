FROM node:20
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

ENV NODE_ENV production
EXPOSE $PORT
CMD ["npm", "run", "preview"] 
