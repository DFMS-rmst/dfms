FROM node:22-alpine AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json
COPY blockchain/package.json blockchain/package.json
RUN npm ci --workspace backend --include-workspace-root
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=dependencies /app/node_modules ./node_modules
COPY backend ./backend
WORKDIR /app/backend
RUN npx prisma generate
EXPOSE 3000
CMD ["node", "src/server.js"]
