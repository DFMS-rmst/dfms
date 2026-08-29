FROM node:22-alpine AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json
COPY blockchain/package.json blockchain/package.json
COPY backend/prisma backend/prisma
RUN npm ci --workspace backend --include-workspace-root
RUN npm run prisma:generate --workspace backend
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=dependencies /app/backend/node_modules ./backend/node_modules
COPY backend ./backend
WORKDIR /app/backend
EXPOSE 3000
CMD ["node", "src/server.js"]
