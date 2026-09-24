# Objekt Explorer

A web explorer for [Cosmo](https://cosmo.fans)'s Objekts, focused on the client-side experience. Cosmo is an app by Modhaus Inc. that decentralizes K-pop using blockchain technology; Objekts are its digital photocard NFTs.

Live at **[objekt.top](https://objekt.top)**.

## Features

- Browse and filter every indexed Objekt collection
- Per-profile collections, pins, locks and ownership history
- Time travel: view any profile's collection as it was on a past date
- Trade lists (have/want) with matching between profiles
- Market listings and price tracking
- Live activity feed over WebSockets

## Stack

| Layer       | Technology                                           |
| ----------- | ---------------------------------------------------- |
| Runtime     | Bun 1.4                                              |
| Frontend    | TanStack React Start, Vite, React 19, Tailwind CSS 4 |
| API         | ORPC (type-safe RPC) with Zod                        |
| Database    | PostgreSQL 18, Drizzle ORM                           |
| Auth        | Better Auth                                          |
| Real-time   | WebSockets, Valkey pub-sub                           |
| i18n        | Inlang (Paraglide)                                   |
| Indexer     | Subsquid (EVM processor)                             |
| Lint/Format | oxlint, oxfmt                                        |

## Repository layout

| Path                | Package          | Purpose                                              |
| ------------------- | ---------------- | ---------------------------------------------------- |
| `apps/web`          | `web`            | Frontend, with an embedded WebSocket activity server |
| `apps/worker`       | `worker`         | Background jobs (Croner)                             |
| `apps/indexer`      | `indexer`        | On-chain NFT metadata indexer (Subsquid)             |
| `packages/api`      | `@repo/api`      | ORPC routers and services shared by the server       |
| `packages/db`       | `@repo/db`       | Drizzle schema and migrations for both databases     |
| `packages/lib`      | `@repo/lib`      | Shared utilities and types                           |
| `packages/cosmo`    | `@repo/cosmo`    | Cosmo SDK                                            |
| `packages/lint`     | `@repo/lint`     | Shared oxlint config                                 |
| `packages/tsconfig` | `@repo/tsconfig` | Shared TypeScript configs                            |

Bun workspaces manage the packages, Turbo runs the tasks.

## Getting started

Requirements: [Bun](https://bun.sh) 1.4+, PostgreSQL 18 and a Valkey/Redis instance. `docker-compose.yml` provides all of them if you'd rather not install them locally.

```bash
bun install
cp .env.example .env   # then fill it in
```

All apps read the same root `.env`, so there is nothing to configure per package. The essential variables:

| Variable               | Purpose                              |
| ---------------------- | ------------------------------------ |
| `DATABASE_URL`         | Main PostgreSQL connection           |
| `INDEXER_DATABASE_URL` | Indexer PostgreSQL connection        |
| `REDIS_URL`            | Valkey (Redis-compatible) connection |
| `BETTER_AUTH_SECRET`   | Auth encryption key                  |
| `VITE_SITE_URL`        | Public site URL                      |
| `COSMO_KEY`            | Encrypted API key for the Cosmo SDK  |

See `.env.example` for the full list, including S3 storage, SES mail, OAuth providers and indexer RPC settings.

Push the schema and start everything:

```bash
bun run --filter=@repo/db db:push
bun run dev
```

The web app is then served on <http://localhost:3000>.

## Commands

Run from the repository root; `--filter` takes a package name.

```bash
bun run dev                        # start all dev servers
bun run dev --filter=web           # start one app
bun run build                      # build everything
bun run lint                       # oxlint across the monorepo
bun run lint:fix                   # lint and auto-fix
bun run typecheck                  # type-check everything
bun run format                     # oxfmt across the monorepo
```

Database tasks live in `@repo/db`:

```bash
bun run --filter=@repo/db db:generate   # generate a migration from the schema
bun run --filter=@repo/db db:migrate    # apply migrations
bun run --filter=@repo/db db:studio     # open Drizzle Studio
```

## Docker

`docker-compose.yml` brings up the full stack: web, worker, indexer processor, both PostgreSQL instances with pgbouncer in front, and Valkey.

```bash
docker compose up -d
```

## Contributing

Before opening a pull request, make sure `bun run lint`, `bun run typecheck` and `bun run format` are clean. CI runs the same checks and builds Docker images for any affected service.

## Credit/Acknowledgment

- [teamreflex/cosmo-web](https://github.com/teamreflex/cosmo-web) (Apollo) for Cosmo types, Cosmo utils and the Subsquid indexer. Some features are heavily inspired by Apollo.

## License

[MIT](./LICENSE)

## Contact

- **Discord**: .ryusion
