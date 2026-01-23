FROM oven/bun:slim AS base

# Prune the monorepo to only include worker and its dependencies
FROM base AS pruner
WORKDIR /app
RUN bun add --global turbo
COPY . .
RUN turbo prune worker --docker

# Install dependencies only for pruned workspace
FROM base AS installer
WORKDIR /app

# Copy lockfile and package.json's from pruned workspace
COPY --from=pruner /app/out/json/ .
RUN bun install --frozen-lockfile

# Build the project
COPY --from=pruner /app/out/full/ .
RUN bun run build --filter=worker

# Production image - copy only what's needed to run
FROM base AS runner

# Install curl for healthchecks
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

WORKDIR /app
ENV NODE_ENV=production

# Copy built application
COPY --from=installer /app/apps/worker/dist ./apps/worker/dist
COPY --from=installer /app/apps/worker/package.json ./apps/worker/package.json
COPY --from=installer /app/node_modules ./node_modules
COPY --from=installer /app/packages ./packages

WORKDIR /app/apps/worker

CMD ["bun", "run", "start"]