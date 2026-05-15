FROM oven/bun:1.3.13-slim AS base

FROM base AS pruner
WORKDIR /app
COPY . .
ENV TURBO_TELEMETRY_DISABLED=1
RUN bunx turbo@2.9.14 prune website --docker

FROM base AS builder
WORKDIR /app

COPY --from=pruner /app/out/bun.lock ./bun.lock
COPY --from=pruner /app/out/json/ .
RUN --mount=type=cache,target=/root/.bun/install/cache bun install --frozen-lockfile
COPY --from=pruner /app/out/full/ .
RUN --mount=type=secret,id=VITE_SITE_URL \
    --mount=type=secret,id=VITE_UMAMI_SCRIPT_URL \
    --mount=type=secret,id=VITE_UMAMI_WEBSITE_ID \
    --mount=type=secret,id=VITE_ACTIVITY_WEBSOCKET_URL \
    --mount=type=secret,id=VITE_LIVE_API_KEY \
    export VITE_SITE_URL=$(cat /run/secrets/VITE_SITE_URL) && \
    export VITE_UMAMI_SCRIPT_URL=$(cat /run/secrets/VITE_UMAMI_SCRIPT_URL) && \
    export VITE_UMAMI_WEBSITE_ID=$(cat /run/secrets/VITE_UMAMI_WEBSITE_ID) && \
    export VITE_ACTIVITY_WEBSOCKET_URL=$(cat /run/secrets/VITE_ACTIVITY_WEBSOCKET_URL) && \
    export VITE_LIVE_API_KEY=$(cat /run/secrets/VITE_LIVE_API_KEY) && \
    bun run --filter website build:prod

# Compile server.ts into a standalone binary
FROM base AS compiler
WORKDIR /app
COPY --from=builder /app/apps/website/dist ./apps/website/dist
COPY --from=builder /app/apps/website/server.ts ./apps/website/server.ts
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/apps/website/package.json ./apps/website/package.json
COPY --from=builder /app/apps/website/node_modules ./apps/website/node_modules

RUN bun build ./apps/website/server.ts \
  --compile \
  --outfile /app/server \
  --target bun \
  --minify

# Minimal runtime image
FROM debian:bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*

# Only the binary and static assets
COPY --from=compiler /app/server ./server
COPY --from=builder /app/apps/website/dist ./dist

EXPOSE 3000/tcp
CMD ["./server"]