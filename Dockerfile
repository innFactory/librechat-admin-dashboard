# syntax=docker/dockerfile:1.4

# =============================================================================
# AI Metrics Dashboard - Multi-stage Dockerfile
# Optimized for production with security best practices
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1: Dependencies
# Install all dependencies including devDependencies for build
# -----------------------------------------------------------------------------
FROM node:22-alpine AS deps

# Install security updates and add labels
RUN apk update && apk upgrade && rm -rf /var/cache/apk/*

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies with clean install for reproducibility
RUN npm ci --include=dev

# -----------------------------------------------------------------------------
# Stage 2: Builder
# Build the Next.js application
# -----------------------------------------------------------------------------
FROM node:22-alpine AS builder

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build arguments for configuration
ARG MONGODB_URI
ARG MONGODB_DB_NAME
ARG NEXT_PUBLIC_BASE_PATH=""
ARG NEXT_PUBLIC_API_BACKEND_BASE_URL_NODE=""

# Set environment variables for build
ENV MONGODB_URI=${MONGODB_URI}
ENV MONGODB_DB_NAME=${MONGODB_DB_NAME}
ENV NEXT_PUBLIC_BASE_PATH=${NEXT_PUBLIC_BASE_PATH}
ENV NEXT_PUBLIC_API_BACKEND_BASE_URL_NODE=${NEXT_PUBLIC_API_BACKEND_BASE_URL_NODE}
ENV NEXT_TELEMETRY_DISABLED=1

# Build the application
RUN npm run build

# -----------------------------------------------------------------------------
# Stage 3: Runner (Production)
# Minimal production image with only necessary files
# -----------------------------------------------------------------------------
FROM node:22-alpine AS runner

# Add metadata labels
LABEL org.opencontainers.image.title="AI Metrics Dashboard"
LABEL org.opencontainers.image.description="Dashboard for monitoring LibreChat AI usage metrics"
LABEL org.opencontainers.image.vendor="innFactory"
LABEL org.opencontainers.image.licenses="MIT"

WORKDIR /app

# Install security updates and create non-root user
RUN apk update && apk upgrade && rm -rf /var/cache/apk/* \
    && addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

# Set production environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Copy necessary files from builder
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Security: Run as non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Set port environment variable
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Health check for Kubernetes
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Start the application
CMD ["node", "server.js"]