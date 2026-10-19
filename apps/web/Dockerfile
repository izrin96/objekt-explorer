# check=skip=SecretsUsedInArgOrEnv
FROM oven/bun:1.4-slim AS base

FROM base AS pruner
WORKDIR /app
COPY . .
ENV TURBO_TELEMETRY_DISABLED=1
RUN bunx turbo@2.11.7 prune web --docker

FROM base AS builder
WORKDIR /app

COPY --from=pruner /app/out/bun.lock ./bun.lock
COPY --from=pruner /app/out/json/ .
# turbo prune keeps patchedDependencies in the pruned package.json but does not
# copy patches/, so bun install fails on the missing patch file without this
COPY --from=pruner /app/patches ./patches
RUN --mount=type=cache,target=/root/.bun/install/cache bun install --frozen-lockfile
COPY --from=pruner /app/out/full/ .
# public values Vite inlines into the client bundle, so build args rather than secrets
ARG VITE_UMAMI_SCRIPT_URL=""
ARG VITE_UMAMI_WEBSITE_ID=""
ARG VITE_LIVE_API_KEY=""
# source map upload: off unless the token, org, project and release are set; only the token is a secret
ARG SENTRY_URL=""
ARG SENTRY_ORG=""
ARG SENTRY_PROJECT=""
ARG SENTRY_RELEASE=""
RUN --mount=type=secret,id=SENTRY_AUTH_TOKEN \
    export SENTRY_AUTH_TOKEN=$(cat /run/secrets/SENTRY_AUTH_TOKEN 2>/dev/null) && \
    bun run --filter web build:prod

# Bundle server.ts only: it imports dist/server/server.js at runtime, so a --compile
# binary would carry the Bun runtime but not the app, and share no layers with the base image
RUN bun build ./apps/web/server.ts \
  --outfile /app/server.js \
  --target bun \
  --minify

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/server.js ./server.js
COPY --from=builder /app/apps/web/dist ./dist

USER bun
EXPOSE 3000/tcp
CMD ["bun", "server.js"]
