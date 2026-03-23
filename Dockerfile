# Base
FROM node:22-alpine AS base
ENV NEXT_TELEMETRY_DISABLED=1

# Dependencies
FROM base AS deps
WORKDIR /app

# Dependency files
COPY package*.json ./
COPY src/server/prisma ./src/server/prisma

# link ssl3 for latest Alpine
RUN sh -c '[ ! -e /lib/libssl.so.3 ] && ln -s /usr/lib/libssl.so.3 /lib/libssl.so.3 || echo "Link already exists"'

# Install dependencies, including dev (release builds should use npm ci)
ENV NODE_ENV=development
RUN npm ci


# Builder
FROM base AS builder
WORKDIR /app

# Deployment type marker
ENV NEXT_PUBLIC_DEPLOYMENT_TYPE=docker

# Optional build version arguments at build time
ARG NEXT_PUBLIC_BUILD_HASH
ENV NEXT_PUBLIC_BUILD_HASH=${NEXT_PUBLIC_BUILD_HASH}
ARG NEXT_PUBLIC_BUILD_REF_NAME
ENV NEXT_PUBLIC_BUILD_REF_NAME=${NEXT_PUBLIC_BUILD_REF_NAME}

# Optional argument to configure GA4 at build time (see: docs/deploy-analytics.md)
ARG NEXT_PUBLIC_GA4_MEASUREMENT_ID
ENV NEXT_PUBLIC_GA4_MEASUREMENT_ID=${NEXT_PUBLIC_GA4_MEASUREMENT_ID}

# Optional argument to configure PostHog at build time (see: docs/deploy-analytics.md)
ARG NEXT_PUBLIC_POSTHOG_KEY
ENV NEXT_PUBLIC_POSTHOG_KEY=${NEXT_PUBLIC_POSTHOG_KEY}

# Copy development deps and source
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# link ssl3 for latest Alpine
RUN sh -c '[ ! -e /lib/libssl.so.3 ] && ln -s /usr/lib/libssl.so.3 /lib/libssl.so.3 || echo "Link already exists"'

# Build the application
ENV NODE_ENV=production
# Provide a placeholder NEXTAUTH_SECRET for build-time (real secret injected at runtime)
ARG NEXTAUTH_SECRET=build-time-placeholder-secret-will-be-replaced-at-runtime
ENV NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
# Provide a placeholder DATABASE_URL for build-time (real database URL injected at runtime)
ARG DATABASE_URL=postgresql://placeholder:placeholder@localhost:5432/placeholder
ENV DATABASE_URL=${DATABASE_URL}
RUN npm run build

# Reduce installed packages to production-only
RUN npm prune --production


# Runner
FROM base AS runner
WORKDIR /app

# Install wget for health checks and link ssl3 for Prisma
RUN apk add --no-cache wget && \
    sh -c '[ ! -e /lib/libssl.so.3 ] && ln -s /usr/lib/libssl.so.3 /lib/libssl.so.3 || echo "Link already exists"'

# As user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy package.json for prisma commands
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json

# Copy Built app
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/src/server/prisma ./src/server/prisma

# Copy standalone worker script for Nephesh workers
COPY --from=builder --chown=nextjs:nodejs /app/standalone-worker.js ./standalone-worker.js

# Minimal ENV for production
ENV NODE_ENV=production
ENV PATH=$PATH:/app/node_modules/.bin

# Run as non-root user
USER nextjs

# Expose port 3000 for the application to listen on
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --retries=3 --start-period=40s \
  CMD wget --quiet --tries=1 --spider http://localhost:3000/api/health || exit 1

# Start the application
CMD ["next", "start"]
