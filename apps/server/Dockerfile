FROM oven/bun:alpine AS base

# Prune the monorepo to only include server and its dependencies
FROM base AS pruner
WORKDIR /app
RUN bun add --global turbo
COPY . .
RUN turbo prune server --docker

# Install dependencies only for pruned workspace
FROM base AS installer
WORKDIR /app

# Copy lockfile and package.json's from pruned workspace
COPY --from=pruner /app/out/json/ .
RUN bun install

# Build the project
COPY --from=pruner /app/out/full/ .
RUN bun run build --filter=server

# Production image - copy only what's needed to run
FROM base AS runner

# Install curl for healthchecks
RUN apk add --no-cache curl

WORKDIR /app
ENV NODE_ENV=production

# Copy built application
COPY --from=installer /app/apps/server/dist ./apps/server/dist
COPY --from=installer /app/apps/server/package.json ./apps/server/package.json
COPY --from=installer /app/node_modules ./node_modules
COPY --from=installer /app/packages ./packages

WORKDIR /app/apps/server

EXPOSE 3000/tcp

CMD ["bun", "run", "start"]