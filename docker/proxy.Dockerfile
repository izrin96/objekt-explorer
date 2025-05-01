FROM oven/bun AS builder

WORKDIR /app

COPY bun.lockb package.json ./
RUN bun install --production
COPY . .

RUN bun build ./src/http-proxy.ts --outdir ./dist --target bun

FROM oven/bun AS runtime

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./

ENV NODE_ENV production

CMD ["bun", "run", "dist/http-proxy.js"]