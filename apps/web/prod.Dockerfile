FROM imbios/bun-node:25-slim AS base
WORKDIR /app

# prune monorepo
FROM base AS prune
COPY . .
RUN bun install turbo --global
ENV TURBO_TELEMETRY_DISABLED=1
RUN turbo prune web --docker

# dependencies & build
FROM base AS build
COPY --from=prune /app/out/json/ .
RUN bun install
COPY --from=prune /app/out/full/ .

ENV NEXT_TELEMETRY_DISABLED=1
ENV TURBO_TELEMETRY_DISABLED=1
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
    --mount=type=secret,id=redis_url \
    NEXT_PUBLIC_UMAMI_SCRIPT_URL=$(cat /run/secrets/umami_script_url) \
    NEXT_PUBLIC_UMAMI_WEBSITE_ID=$(cat /run/secrets/umami_website_id) \
    NEXT_PUBLIC_ACTIVITY_WEBSOCKET_URL=$(cat /run/secrets/activity_websocket_url) \
    BETTER_AUTH_SECRET=$(cat /run/secrets/better_auth_secret) \
    DISCORD_CLIENT_ID=$(cat /run/secrets/discord_client_id) \
    DISCORD_CLIENT_SECRET=$(cat /run/secrets/discord_client_secret) \
    TWITTER_CLIENT_ID=$(cat /run/secrets/twitter_client_id) \
    TWITTER_CLIENT_SECRET=$(cat /run/secrets/twitter_client_secret) \
    BROWSER_CDP_URL=$(cat /run/secrets/browser_cdp_url) \
    NEXT_PUBLIC_SITE_URL=$(cat /run/secrets/site_url) \
    DATABASE_URL=$(cat /run/secrets/database_url) \
    INDEXER_DATABASE_URL=$(cat /run/secrets/indexer_database_url) \
    S3_ENDPOINT=$(cat /run/secrets/s3_endpoint) \
    S3_ACCESS_KEY=$(cat /run/secrets/s3_access_key) \
    S3_SECRET_KEY=$(cat /run/secrets/s3_secret_key) \
    SES_REGION=$(cat /run/secrets/ses_region) \
    SES_ACCESS_KEY=$(cat /run/secrets/ses_access_key) \
    SES_SECRET_KEY=$(cat /run/secrets/ses_secret_key) \
    SES_MAIL_FROM=$(cat /run/secrets/ses_mail_from) \
    NEXT_PUBLIC_LIVE_API_KEY=$(cat /run/secrets/live_api_key) \
    BYPASS_LIVE_KEY=$(cat /run/secrets/bypass_live_key) \
    REDIS_URL=$(cat /run/secrets/redis_url) \
    bun run build

# runner
FROM base AS runner

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1002 app
RUN adduser --system --uid 1002 nextjs
USER nextjs

COPY --from=build --chown=nextjs:app /app/apps/web/.next/standalone ./
COPY --from=build --chown=nextjs:app /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=nextjs:app /app/apps/web/public ./apps/web/public

EXPOSE 3000/tcp

CMD ["bun", "run", "--bun", "apps/web/server.js"]