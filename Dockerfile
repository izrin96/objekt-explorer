# syntax=docker.io/docker/dockerfile:1

FROM node:22-alpine AS base

# Step 1. Rebuild the source code only when needed
FROM base AS builder

WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* .npmrc* ./
# Omit --production flag for TypeScript devDependencies
RUN \
  if [ -f yarn.lock ]; then yarn --frozen-lockfile; \
  elif [ -f package-lock.json ]; then npm ci; \
  elif [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm i; \
  # Allow install without lockfile, so example works even without Node.js installed locally
  else echo "Warning: Lockfile not found. It is recommended to commit lockfiles to version control." && yarn install; \
  fi

COPY src ./src
# COPY public ./public
COPY next.config.ts .
COPY tsconfig.json .

# Environment variables must be present at build time
# https://github.com/vercel/next.js/discussions/14030
ARG INDEXER_PROXY_KEY
ENV INDEXER_PROXY_KEY=${INDEXER_PROXY_KEY}
ARG INDEXER_PROXY_URL
ENV INDEXER_PROXY_URL=${INDEXER_PROXY_URL}
ARG DB_PROXY_KEY
ENV DB_PROXY_KEY=${DB_PROXY_KEY}
ARG DB_PROXY_URL
ENV DB_PROXY_URL=${DB_PROXY_URL}
ARG NEXT_PUBLIC_UMAMI_SCRIPT_URL
ENV NEXT_PUBLIC_UMAMI_SCRIPT_URL=${NEXT_PUBLIC_UMAMI_SCRIPT_URL}
ARG NEXT_PUBLIC_UMAMI_WEBSITE_ID
ENV NEXT_PUBLIC_UMAMI_WEBSITE_ID=${NEXT_PUBLIC_UMAMI_WEBSITE_ID}
ARG NEXT_PUBLIC_ACTIVITY_WEBSOCKET_URL
ENV NEXT_PUBLIC_ACTIVITY_WEBSOCKET_URL=${NEXT_PUBLIC_ACTIVITY_WEBSOCKET_URL}
ARG BETTER_AUTH_SECRET
ENV BETTER_AUTH_SECRET=${BETTER_AUTH_SECRET}
ARG DISCORD_CLIENT_ID
ENV DISCORD_CLIENT_ID=${DISCORD_CLIENT_ID}
ARG DISCORD_CLIENT_SECRET
ENV DISCORD_CLIENT_SECRET=${DISCORD_CLIENT_SECRET}
ARG BROWSER_CDP_URL
ENV BROWSER_CDP_URL=${BROWSER_CDP_URL}
ARG NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL}

# Next.js collects completely anonymous telemetry data about general usage. Learn more here: https://nextjs.org/telemetry
# Uncomment the following line to disable telemetry at build time
# ENV NEXT_TELEMETRY_DISABLED 1

# Build Next.js based on the preferred package manager
RUN \
  if [ -f yarn.lock ]; then yarn build; \
  elif [ -f package-lock.json ]; then npm run build; \
  elif [ -f pnpm-lock.yaml ]; then pnpm build; \
  else npm run build; \
  fi

# Note: It is not necessary to add an intermediate step that does a full copy of `node_modules` here

# Step 2. Production image, copy all the files and run next
FROM base AS runner

WORKDIR /app

# Don't run production as root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
USER nextjs

COPY --from=builder /app/public ./public

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Uncomment the following line to disable telemetry at run time
# ENV NEXT_TELEMETRY_DISABLED 1

# Note: Don't expose ports here, Compose will handle that for us

CMD ["node", "server.js"]