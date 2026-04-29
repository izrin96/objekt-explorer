FROM oven/bun:1.3.13-slim AS base

FROM base AS pruner
WORKDIR /app
COPY . .
ENV TURBO_TELEMETRY_DISABLED=1
RUN bunx turbo@2.9.6 prune website --docker

FROM base AS builder
WORKDIR /app

ARG VITE_SITE_URL
ARG VITE_UMAMI_SCRIPT_URL
ARG VITE_UMAMI_WEBSITE_ID
ARG VITE_ACTIVITY_WEBSOCKET_URL
ARG VITE_LIVE_API_KEY

ENV VITE_SITE_URL=$VITE_SITE_URL
ENV VITE_UMAMI_SCRIPT_URL=$VITE_UMAMI_SCRIPT_URL
ENV VITE_UMAMI_WEBSITE_ID=$VITE_UMAMI_WEBSITE_ID
ENV VITE_ACTIVITY_WEBSOCKET_URL=$VITE_ACTIVITY_WEBSOCKET_URL
ENV VITE_LIVE_API_KEY=$VITE_LIVE_API_KEY

COPY --from=pruner /app/out/bun.lock ./bun.lock
COPY --from=pruner /app/out/json/ .
RUN bun install --frozen-lockfile
COPY --from=pruner /app/out/full/ .
RUN bun run --filter website build:prod

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