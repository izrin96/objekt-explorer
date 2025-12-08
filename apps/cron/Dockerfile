FROM imbios/bun-node:25-slim AS base
WORKDIR /app

# prune monorepo
FROM base AS prune
COPY . .
RUN bun install turbo --global
ENV TURBO_TELEMETRY_DISABLED=1
RUN turbo prune cron --docker

# dependencies
FROM base AS deps
RUN mkdir -p /temp/dev
RUN mkdir -p /temp/prod
COPY --from=prune /app/out/json/ /temp/dev
COPY --from=prune /app/out/json/ /temp/prod
RUN cd /temp/dev && bun install --frozen-lockfile
RUN cd /temp/prod && bun install --frozen-lockfile --production

# build
FROM base AS build
COPY --from=deps /temp/dev/ .
COPY --from=prune /app/out/full/ .
ENV TURBO_TELEMETRY_DISABLED=1
RUN bun run build

# runner
FROM base AS runner

ENV NODE_ENV=production

RUN addgroup --system --gid 1002 app
RUN adduser --system --uid 1002 app
USER app

COPY --from=deps --chown=app:app /temp/prod/ .
COPY --from=build --chown=app:app /app/apps/cron/dist ./apps/cron/dist

EXPOSE 3000/tcp

CMD ["bun", "run", "--bun", "apps/cron/dist/index.mjs"]