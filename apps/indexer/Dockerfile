# stage 1: prune workspace with bun
FROM oven/bun:1.4-slim AS pruner
WORKDIR /app
COPY . .
RUN bunx turbo@2.11.3 prune indexer --docker

# stage 2: install dependencies with bun
FROM oven/bun:1.4-slim AS installer
WORKDIR /app
COPY --from=pruner /app/out/bun.lock ./bun.lock
COPY --from=pruner /app/out/json/ .
# turbo prune keeps patchedDependencies in the pruned package.json but does not
# copy patches/, so bun install fails on the missing patch file without this
COPY --from=pruner /app/patches ./patches
RUN --mount=type=cache,target=/root/.bun/install/cache bun install --frozen-lockfile --ignore-scripts
COPY --from=pruner /app/out/full/ .

RUN bun run --filter indexer build

# stage 2b: runtime-only deps, no devDeps
FROM oven/bun:1.4-slim AS prod-deps
WORKDIR /app
COPY --from=pruner /app/out/bun.lock ./bun.lock
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/patches ./patches
RUN --mount=type=cache,target=/root/.bun/install/cache bun install --frozen-lockfile --production --ignore-scripts

# stage 3: run the tsc output with bun; the generated TypeORM models need CommonJS,
# since their circular decorator metadata throws when bun loads src/ as ESM
FROM oven/bun:1.4-slim AS runner
WORKDIR /app/apps/indexer
ENV NODE_ENV=production
COPY --from=installer /app/apps/indexer/lib ./lib
COPY --from=installer /app/apps/indexer/db ./db
COPY --from=installer /app/apps/indexer/package.json ./package.json
COPY --from=prod-deps /app/apps/indexer/node_modules ./node_modules
COPY --from=prod-deps /app/node_modules/.bun /app/node_modules/.bun
COPY --from=installer /app/packages /app/packages
CMD ["bun", "run", "--bun", "start"]
