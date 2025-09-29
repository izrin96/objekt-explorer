# syntax=docker.io/docker/dockerfile:1

FROM node:22-alpine AS base

# Install dependencies only when needed
FROM base AS deps
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* .npmrc* ./
RUN \
  if [ -f yarn.lock ]; then yarn --frozen-lockfile; \
  elif [ -f package-lock.json ]; then npm ci; \
  elif [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm i --frozen-lockfile; \
  else echo "Lockfile not found." && exit 1; \
  fi

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
# COPY . .
COPY src ./src
COPY public ./public
COPY messages ./messages
COPY drizzle ./drizzle
COPY tsconfig.json postcss.config.mjs next.config.ts .
COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* .npmrc* ./

# Next.js collects completely anonymous telemetry data about general usage.
# Learn more here: https://nextjs.org/telemetry
# Uncomment the following line in case you want to disable telemetry during the build.
# ENV NEXT_TELEMETRY_DISABLED=1

RUN --mount=type=secret,id=umami_script_url \
    --mount=type=secret,id=umami_website_id \
    --mount=type=secret,id=activity_websocket_url \
    --mount=type=secret,id=better_auth_secret \
    --mount=type=secret,id=discord_client_id \
    --mount=type=secret,id=discord_client_secret \
    --mount=type=secret,id=twitter_client_id \
    --mount=type=secret,id=twitter_client_secret \
    --mount=type=secret,id=browser_cdp_url \
    --mount=type=secret,id=site_url \
    --mount=type=secret,id=database_url \
    --mount=type=secret,id=indexer_database_url \
    --mount=type=secret,id=s3_endpoint \
    --mount=type=secret,id=s3_access_key \
    --mount=type=secret,id=s3_secret_key \
    --mount=type=secret,id=ses_region \
    --mount=type=secret,id=ses_access_key \
    --mount=type=secret,id=ses_secret_key \
    --mount=type=secret,id=ses_mail_from \
    --mount=type=secret,id=live_api_key \
    --mount=type=secret,id=bypass_live_key \
    --mount=type=secret,id=upstash_redis_rest_url \
    --mount=type=secret,id=upstash_redis_rest_token \
    --mount=type=secret,id=privy_app_id \
    --mount=type=secret,id=privy_app_secret \
    --mount=type=secret,id=privy_abs_app_id \
    --mount=type=secret,id=redis_url \
    export NEXT_PUBLIC_UMAMI_SCRIPT_URL=$(cat /run/secrets/umami_script_url) && \
    export NEXT_PUBLIC_UMAMI_WEBSITE_ID=$(cat /run/secrets/umami_website_id) && \
    export NEXT_PUBLIC_ACTIVITY_WEBSOCKET_URL=$(cat /run/secrets/activity_websocket_url) && \
    export BETTER_AUTH_SECRET=$(cat /run/secrets/better_auth_secret) && \
    export DISCORD_CLIENT_ID=$(cat /run/secrets/discord_client_id) && \
    export DISCORD_CLIENT_SECRET=$(cat /run/secrets/discord_client_secret) && \
    export TWITTER_CLIENT_ID=$(cat /run/secrets/twitter_client_id) && \
    export TWITTER_CLIENT_SECRET=$(cat /run/secrets/twitter_client_secret) && \
    export BROWSER_CDP_URL=$(cat /run/secrets/browser_cdp_url) && \
    export NEXT_PUBLIC_SITE_URL=$(cat /run/secrets/site_url) && \
    export DATABASE_URL=$(cat /run/secrets/database_url) && \
    export INDEXER_DATABASE_URL=$(cat /run/secrets/indexer_database_url) && \
    export S3_ENDPOINT=$(cat /run/secrets/s3_endpoint) && \
    export S3_ACCESS_KEY=$(cat /run/secrets/s3_access_key) && \
    export S3_SECRET_KEY=$(cat /run/secrets/s3_secret_key) && \
    export SES_REGION=$(cat /run/secrets/ses_region) && \
    export SES_ACCESS_KEY=$(cat /run/secrets/ses_access_key) && \
    export SES_SECRET_KEY=$(cat /run/secrets/ses_secret_key) && \
    export SES_MAIL_FROM=$(cat /run/secrets/ses_mail_from) && \
    export NEXT_PUBLIC_LIVE_API_KEY=$(cat /run/secrets/live_api_key) && \
    export BYPASS_LIVE_KEY=$(cat /run/secrets/bypass_live_key) && \
    export UPSTASH_REDIS_REST_URL=$(cat /run/secrets/upstash_redis_rest_url) && \
    export UPSTASH_REDIS_REST_TOKEN=$(cat /run/secrets/upstash_redis_rest_token) && \
    export NEXT_PUBLIC_PRIVY_APP_ID=$(cat /run/secrets/privy_app_id) && \
    export PRIVY_APP_SECRET=$(cat /run/secrets/privy_app_secret) && \
    export PRIVY_ABS_APP_ID=$(cat /run/secrets/privy_abs_app_id) && \
    export REDIS_URL=$(cat /run/secrets/redis_url) && \
    if [ -f yarn.lock ]; then yarn build; \
    elif [ -f package-lock.json ]; then npm run build; \
    elif [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm run build; \
    else echo "Lockfile not found." && exit 1; \
    fi

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
# Uncomment the following line in case you want to disable telemetry during runtime.
# ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
USER nextjs

COPY --from=builder /app/public ./public

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

CMD ["node", "server.js"]