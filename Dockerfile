# Build stage
FROM node:20-alpine AS deps
WORKDIR /app

# Install build dependencies for better-sqlite3
RUN apk add --no-cache python3 make g++

COPY package*.json ./
COPY prisma ./prisma
RUN npm ci
RUN npx prisma generate

# Builder stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine AS runner
WORKDIR /app

# Install ffmpeg for video thumbnail generation
RUN apk add --no-cache ffmpeg

ENV NODE_ENV=production
ENV PORT=3001

# Copy necessary files
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/server.js ./server.js
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/add-position-column.js ./add-position-column.js
COPY --from=builder /app/create-quick-reply-table.js ./create-quick-reply-table.js
COPY --from=builder /app/fix-room-unique-constraint.js ./fix-room-unique-constraint.js
COPY --from=builder /app/fix-message-columns.js ./fix-message-columns.js

# Create data directory for SQLite
RUN mkdir -p /app/data

EXPOSE 3001

CMD ["node", "server.js"]
