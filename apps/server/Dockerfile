FROM node:24-alpine AS base
WORKDIR /app

FROM base AS builder
RUN npm install -g turbo@latest
COPY . .
ENV TURBO_TELEMETRY_DISABLED=1
RUN turbo prune server --docker

FROM base AS installer
COPY --from=builder /app/out/json/ .
COPY tsconfig.base.json .
RUN corepack enable pnpm
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

COPY --from=builder /app/out/full/ .
RUN --mount=type=cache,target=/root/.cache/turbo \
    pnpm run build

FROM base AS runner

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 app
USER app

COPY --from=installer --chown=app:nodejs /app ./

EXPOSE 3000/tcp

CMD node apps/server/dist/index.js