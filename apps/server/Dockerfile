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

FROM pnpm AS installer
COPY --from=builder /app/out/json/ .
COPY tsconfig.base.json .
RUN --mount=type=cache,id=pnpm,target=~/.pnpm-store \
    pnpm install --frozen-lockfile

COPY --from=builder /app/out/full/ .
RUN pnpm run build

ENV CI=true
RUN rm -rf node_modules
RUN --mount=type=cache,id=pnpm,target=~/.pnpm-store \
    pnpm install --prod --frozen-lockfile
RUN pnpm store prune
RUN rm -rf ./**/*/src

FROM base AS runner

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 app
USER app

COPY --from=installer --chown=app:nodejs /app ./

EXPOSE 3000/tcp

CMD node apps/server/dist/index.js