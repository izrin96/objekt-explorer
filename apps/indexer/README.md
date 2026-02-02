# Indexer

Indexes Cosmo Objekt NFTs.

Forked from [teamreflex/cosmo-web/apps/indexer](https://github.com/teamreflex/cosmo-web/tree/main/apps/indexer) with changes.

## Changes

### Database

- Uses PostgreSQL 18 with UUID v7 primary keys
- Patches `@subsquid/typeorm-store/lib/hot.js` to remove `text[]` cast for UUID support
- Updates migration script to use cascade delete/update

### Real-time

- Publishes updates to Redis for the WebSocket server

### Metadata

- Returns empty metadata if the endpoint fails
- Worker refetches failed metadata later
