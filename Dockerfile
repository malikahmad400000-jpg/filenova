# ------------------------------------------------------------------------------
# FileNova Production Dockerfile
# Multi-stage build for Next.js App Router with native PDF/Canvas/Sharp dependencies
# ------------------------------------------------------------------------------

# 1. Base Image with Node.js LTS on Debian Bookworm (glibc native binary support)
FROM node:20-bookworm-slim AS base
WORKDIR /app
ENV NODE_ENV=production

# 2. Dependencies stage
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# Install all dependencies (including devDependencies required for Next.js build)
RUN npm ci --include=dev

# 3. Builder stage
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Build-time public environment variables.
# NEXT_PUBLIC_* vars are inlined into the JS bundle at build time by Next.js.
# Railway (and any Docker-based host) must pass these as --build-arg at image build time.
ARG NEXT_PUBLIC_APP_URL=https://filenova.app
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}
ENV NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY}
RUN npm run build

# 4. Production Runner stage
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Create a non-root system user and group for security
RUN groupadd --system --gid 1001 nodejs && \
    useradd --system --uid 1001 nextjs

# Copy runtime assets from builder and deps
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Assign ownership to non-root user
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

# Production start command
CMD ["npm", "start"]
