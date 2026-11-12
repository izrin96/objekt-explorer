FROM oven/bun:1.4-slim AS base

FROM base AS pruner
WORKDIR /app
COPY . .
RUN bunx turbo@2.11.10 prune migrate --docker

FROM base AS installer
WORKDIR /app
COPY --from=pruner /app/out/bun.lock ./bun.lock
COPY --from=pruner /app/out/json/ .
# turbo prune keeps patchedDependencies in the pruned package.json but does not
# copy patches/, so bun install fails on the missing patch file without this
COPY --from=pruner /app/patches ./patches
RUN --mount=type=cache,target=/root/.bun/install/cache bun install --frozen-lockfile
COPY --from=pruner /app/out/full/ .
RUN bun run build --filter=migrate

# keeps the repo layout so the bundle finds packages/db/migrations by its relative path
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=installer /app/apps/migrate/dist ./apps/migrate/dist
COPY --from=pruner /app/packages/db/migrations ./packages/db/migrations
USER bun
CMD ["bun", "apps/migrate/dist/index.js"]
