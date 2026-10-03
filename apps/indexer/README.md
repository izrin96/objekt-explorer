# Indexer

Indexes Cosmo Objekt NFTs.

Forked from [teamreflex/cosmo-web/apps/indexer](https://github.com/teamreflex/cosmo-web/tree/main/apps/indexer) with changes.

## Changes

### Runtime

- Runs on Bun: `tsc` compiles to CommonJS in `lib/` and `bun lib/main.js` runs it. Running `src/` directly fails, since Bun loads it as ESM and the generated models' circular decorator metadata throws
- Patches `@subsquid/http-client` to drop `compress: true`, which makes Bun's fetch gzip request bodies the SQD gateway cannot read

### Database

- Uses PostgreSQL 18 with UUID v7 primary keys
- Patches `@subsquid/typeorm-store/lib/hot.js` to remove `text[]` cast for UUID support
- Updates migration script to use cascade delete/update
- `src/model/generated/` is hand-maintained (column types and lengths, plus columns added through drizzle migrations), so the squid codegen is removed: regenerating would drop them. `schema.graphql` is kept as a reference only

### Real-time

- Publishes updates to Redis for the WebSocket server

### Metadata

- Returns empty metadata if the endpoint fails
- Worker refetches failed metadata later
