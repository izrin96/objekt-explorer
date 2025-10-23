FROM node:24-alpine AS base
WORKDIR /app
RUN apk update
RUN apk add --no-cache libc6-compat

FROM base AS pnpm
RUN corepack enable
RUN pnpm config set store-dir ~/.pnpm-store

FROM pnpm AS prune
RUN npm install -g turbo@latest
COPY . .
ENV TURBO_TELEMETRY_DISABLED=1
RUN turbo prune server --docker

# prod and dev dependencies
FROM pnpm AS dev
COPY --from=prune /app/out/json/ .
COPY tsconfig.base.json .
RUN --mount=type=cache,id=pnpm,target=~/.pnpm-store \
    pnpm install --frozen-lockfile

# prod only dependencies
FROM dev AS prod
ENV CI=true
RUN --mount=type=cache,id=pnpm,target=~/.pnpm-store \
    pnpm install --frozen-lockfile --prod

# build
FROM dev AS build
ENV TURBO_TELEMETRY_DISABLED=1
COPY --from=prune /app/out/full/ .
RUN pnpm run build

# runner
FROM base AS runner

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 app
USER app

COPY --from=prod --chown=app:nodejs /app/ .
COPY --from=build --chown=app:nodejs /app/apps/server/dist ./apps/server/dist

EXPOSE 3000/tcp

CMD ["node", "apps/server/dist/index.js"]