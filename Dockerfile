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
ENV MEDIA_DIR=/app/media
ENV DATA_DIR=/app/data
ENV SQLITE_FILE=/app/data/bommanager.sqlite

COPY server/package*.json ./server/
RUN cd server && npm install --omit=dev

COPY server/ ./server/
COPY demo/ ./demo/
COPY --from=build-client /app/client/dist ./client/dist

RUN mkdir -p /app/media /app/data

EXPOSE 3001

WORKDIR /app/server
CMD ["node", "src/index.js"]
