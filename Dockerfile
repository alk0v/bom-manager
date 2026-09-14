# Build Frontend
FROM node:22-alpine AS build-client
WORKDIR /app/client

COPY client/package*.json ./
RUN npm install

COPY client/ ./
RUN npm run build

# Production Server
FROM node:22-alpine AS production
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

COPY server/package*.json ./server/
RUN cd server && npm install --omit=dev

COPY server/ ./server/
COPY --from=build-client /app/client/dist ./client/dist

EXPOSE 3001

WORKDIR /app/server
CMD ["node", "src/index.js"]
