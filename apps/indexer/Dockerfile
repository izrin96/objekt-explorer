# stage 1: prune workspace with bun
FROM oven/bun:canary-slim AS pruner
WORKDIR /app
COPY . .
RUN bunx turbo@2.10.1 prune indexer --docker

# stage 2: install dependencies with bun
FROM oven/bun:canary-slim AS installer
WORKDIR /app
COPY --from=pruner /app/out/bun.lock ./bun.lock
COPY --from=pruner /app/out/json/ .
RUN --mount=type=cache,target=/root/.bun/install/cache bun install --frozen-lockfile --ignore-scripts
COPY --from=pruner /app/out/full/ .

RUN bun run --filter indexer build

# stage 2b: runtime-only deps, no devDeps
FROM oven/bun:canary-slim AS prod-deps
WORKDIR /app
COPY --from=pruner /app/out/bun.lock ./bun.lock
COPY --from=pruner /app/out/json/ .
RUN --mount=type=cache,target=/root/.bun/install/cache bun install --frozen-lockfile --production --ignore-scripts

# stage 3: run with node due to the subsquid SDK not working in bun
FROM node:22-slim AS runner
WORKDIR /app/apps/indexer
ENV NODE_ENV=production
COPY --from=installer /app/apps/indexer/lib ./lib
COPY --from=installer /app/apps/indexer/db ./db
COPY --from=installer /app/apps/indexer/package.json ./package.json
COPY --from=installer /app/apps/indexer/commands.json ./commands.json
COPY --from=prod-deps /app/apps/indexer/node_modules ./node_modules
COPY --from=prod-deps /app/node_modules/.bun /app/node_modules/.bun
COPY --from=installer /app/packages /app/packages
RUN npm install -g @subsquid/commands && mv $(which squid-commands) /usr/local/bin/sqd
CMD ["sqd", "process:prod"]