# Build stage - Install ALL dependencies for build
FROM node:20-alpine AS deps
WORKDIR /app

COPY package*.json ./
RUN npm ci

# Builder stage - Build the Next.js app
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set memory limit for Next.js build to prevent memory issues
ENV NODE_OPTIONS="--max-old-space-size=2048"

RUN npm run build

# Production dependencies stage - Install only production deps
FROM node:20-alpine AS prod-deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Production stage
FROM node:20-alpine AS runner
WORKDIR /app

# Install ffmpeg and netcat for health checks
RUN apk add --no-cache ffmpeg netcat-openbsd && \
    rm -rf /var/cache/apk/*

ENV NODE_ENV=production
ENV PORT=3001
# Limit Node.js memory in production
ENV NODE_OPTIONS="--max-old-space-size=512"

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy necessary files - Use production deps only (smaller size)
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/server.js ./server.js
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=builder /app/src/lib/db ./src/lib/db
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=builder /app/docker-entrypoint.sh ./docker-entrypoint.sh

RUN chmod +x docker-entrypoint.sh

# Set proper ownership
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3001

ENTRYPOINT ["./docker-entrypoint.sh"]
