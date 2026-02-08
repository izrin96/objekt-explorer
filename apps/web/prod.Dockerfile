FROM oven/bun:alpine AS base
WORKDIR /app

# prune monorepo
FROM base AS prune
COPY . .
ENV TURBO_TELEMETRY_DISABLED=1
RUN bunx turbo@2.8.3 prune web --docker

# dependencies & build
FROM base AS build
COPY --from=prune /app/out/bun.lock ./bun.lock
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
    NEXT_PUBLIC_UMAMI_SCRIPT_URL=$(cat /run/secrets/umami_script_url 2>/dev/null || echo "") \
    NEXT_PUBLIC_UMAMI_WEBSITE_ID=$(cat /run/secrets/umami_website_id 2>/dev/null || echo "") \
    NEXT_PUBLIC_ACTIVITY_WEBSOCKET_URL=$(cat /run/secrets/activity_websocket_url 2>/dev/null || echo "") \
    BETTER_AUTH_SECRET=$(cat /run/secrets/better_auth_secret 2>/dev/null || echo "") \
    DISCORD_CLIENT_ID=$(cat /run/secrets/discord_client_id 2>/dev/null || echo "") \
    DISCORD_CLIENT_SECRET=$(cat /run/secrets/discord_client_secret 2>/dev/null || echo "") \
    TWITTER_CLIENT_ID=$(cat /run/secrets/twitter_client_id 2>/dev/null || echo "") \
    TWITTER_CLIENT_SECRET=$(cat /run/secrets/twitter_client_secret 2>/dev/null || echo "") \
    NEXT_PUBLIC_SITE_URL=$(cat /run/secrets/site_url 2>/dev/null || echo "") \
    DATABASE_URL=$(cat /run/secrets/database_url 2>/dev/null || echo "") \
    INDEXER_DATABASE_URL=$(cat /run/secrets/indexer_database_url 2>/dev/null || echo "") \
    S3_ENDPOINT=$(cat /run/secrets/s3_endpoint 2>/dev/null || echo "") \
    S3_ACCESS_KEY=$(cat /run/secrets/s3_access_key 2>/dev/null || echo "") \
    S3_SECRET_KEY=$(cat /run/secrets/s3_secret_key 2>/dev/null || echo "") \
    SES_REGION=$(cat /run/secrets/ses_region 2>/dev/null || echo "") \
    SES_ACCESS_KEY=$(cat /run/secrets/ses_access_key 2>/dev/null || echo "") \
    SES_SECRET_KEY=$(cat /run/secrets/ses_secret_key 2>/dev/null || echo "") \
    SES_MAIL_FROM=$(cat /run/secrets/ses_mail_from 2>/dev/null || echo "") \
    NEXT_PUBLIC_LIVE_API_KEY=$(cat /run/secrets/live_api_key 2>/dev/null || echo "") \
    BYPASS_LIVE_KEY=$(cat /run/secrets/bypass_live_key 2>/dev/null || echo "") \
    REDIS_URL=$(cat /run/secrets/redis_url 2>/dev/null || echo "") \
    bun run --filter web build:prod

# runner
FROM base AS runner

# Install curl for healthchecks
RUN apk add --no-cache curl

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=build /app/apps/web/.next/standalone ./
COPY --from=build /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build /app/apps/web/public ./apps/web/public

EXPOSE 3000/tcp
ENV HOSTNAME=0.0.0.0

CMD ["bun", "run", "--bun", "apps/web/server.js"]