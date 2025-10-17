FROM node:24-alpine AS base
WORKDIR /app
RUN apk update
RUN apk add --no-cache libc6-compat

FROM base AS pnpm
RUN corepack enable
RUN pnpm config set store-dir ~/.pnpm-store

FROM pnpm AS builder
RUN npm install -g turbo@latest
COPY . .
ENV TURBO_TELEMETRY_DISABLED=1
RUN turbo prune server --docker

FROM pnpm AS installer-prod
COPY --from=builder /app/out/json/ .
COPY tsconfig.base.json .
RUN --mount=type=cache,id=pnpm,target=~/.pnpm-store \
    pnpm install --frozen-lockfile --prod

FROM pnpm AS installer
COPY --from=builder /app/out/json/ .
COPY tsconfig.base.json .
RUN --mount=type=cache,id=pnpm,target=~/.pnpm-store \
    pnpm install --frozen-lockfile

ENV TURBO_TELEMETRY_DISABLED=1
COPY --from=builder /app/out/full/ .
RUN pnpm run build

FROM base AS runner

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 app
USER app

COPY --from=installer-prod --chown=app:nodejs /app/ .
COPY --from=installer --chown=app:nodejs /app/apps/server/dist ./apps/server/dist

EXPOSE 3000/tcp

CMD ["node", "apps/server/dist/index.js"]