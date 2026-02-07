FROM oven/bun:alpine AS base

# Prune the monorepo to only include worker and its dependencies
FROM base AS pruner
WORKDIR /app
COPY . .
RUN bunx turbo@2.8.3 prune worker --docker

# Install dependencies only for pruned workspace
FROM base AS installer
WORKDIR /app

# Copy lockfile and package.json's from pruned workspace
COPY --from=pruner /app/out/bun.lock ./bun.lock
COPY --from=pruner /app/out/json/ .
RUN bun install

# Build the project
COPY --from=pruner /app/out/full/ .
RUN bun run build --filter=worker

# Production image - copy only the bundle
FROM base AS runner

# Install curl for healthchecks
RUN apk add --no-cache curl

WORKDIR /app/apps/worker
ENV NODE_ENV=production

# Only the bundled output is needed - bun build bundles all deps
COPY --from=installer /app/apps/worker/dist ./dist

CMD ["bun", "run", "dist/index.js"]
