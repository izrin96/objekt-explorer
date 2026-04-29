FROM oven/bun:1.3.13-slim AS base

# Prune the monorepo to only include server and its dependencies
FROM base AS pruner
WORKDIR /app
COPY . .
RUN bunx turbo@2.9.6 prune server --docker

# Install dependencies only for pruned workspace
FROM base AS installer
WORKDIR /app

# Copy lockfile and package.json's from pruned workspace
COPY --from=pruner /app/out/bun.lock ./bun.lock
COPY --from=pruner /app/out/json/ .
RUN --mount=type=cache,target=/root/.bun/install/cache bun install --frozen-lockfile

# Build the project
COPY --from=pruner /app/out/full/ .
RUN bun run build --filter=server

# Production image - copy only the bundle
FROM base AS runner

# Install curl for healthchecks
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*

WORKDIR /app/apps/server
ENV NODE_ENV=production

# Only the bundled output is needed - bun build bundles all deps
COPY --from=installer /app/apps/server/dist ./dist

EXPOSE 3000/tcp

CMD ["bun", "run", "dist/index.js"]
