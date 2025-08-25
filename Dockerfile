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

COPY . .
# COPY src ./src
# COPY public ./public
# COPY next.config.ts .
# COPY tsconfig.json .

# Environment variables must be present at build time
# https://github.com/vercel/next.js/discussions/14030

RUN --mount=type=secret,id=indexer_proxy_key \
    --mount=type=secret,id=indexer_proxy_url \
    --mount=type=secret,id=umami_script_url \
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
    export INDEXER_PROXY_KEY=$(cat /run/secrets/indexer_proxy_key) && \
    export INDEXER_PROXY_URL=$(cat /run/secrets/indexer_proxy_url) && \
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
    if [ -f yarn.lock ]; then yarn build; \
    elif [ -f package-lock.json ]; then npm run build; \
    elif [ -f pnpm-lock.yaml ]; then pnpm build; \
    else npm run build; \
    fi

# Next.js collects completely anonymous telemetry data about general usage. Learn more here: https://nextjs.org/telemetry
# Uncomment the following line to disable telemetry at build time
# ENV NEXT_TELEMETRY_DISABLED 1

# Note: It is not necessary to add an intermediate step that does a full copy of `node_modules` here

# Step 2. Production image, copy all the files and run next
FROM base AS runner

WORKDIR /app

# Don't run production as root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
USER nextjs

# COPY --from=builder /app/public ./public

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Uncomment the following line to disable telemetry at run time
# ENV NEXT_TELEMETRY_DISABLED 1

# Note: Don't expose ports here, Compose will handle that for us

CMD ["node", "server.js"]