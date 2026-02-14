FROM node:20-alpine
ENV NODE_OPTIONS=--dns-result-order=ipv4first
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "run", "start:prod"]
