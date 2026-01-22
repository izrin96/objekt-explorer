# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Objekt Tracker - A web application for exploring digital collectibles (Objekts) from Cosmo, a K-pop blockchain app by Modhaus Inc. Currently undergoing major refactoring from Next.js to TanStack React Start.

## Architecture

**Monorepo Structure** (Bun workspaces + Turbo):

- `apps/web` - Main frontend (Next.js)
- `apps/website` - Main frontend (TanStack React Start + Vite)
- `apps/server` - WebSocket activity server (Hono)
- `apps/worker` - Background job worker (Croner)
- `apps/indexer` - NFT metadata indexer
- `packages/db` - Database schema (Drizzle ORM + PostgreSQL)
- `packages/lib` - Shared utilities
- `packages/cosmo` - Cosmo SDK (from teamreflex/cosmo-web)
- `packages/env` - Environment variables

**Key Technologies**:

- Runtime: Bun 1.3.6
- Frontend: Next.js, TanStack React Start, React 19, Tailwind CSS 4
- API: ORPC (type-safe RPC) with Zod validation
- Database: PostgreSQL 18 with Drizzle ORM
- State: React Query (server), Zustand (client)
- Real-time: Redis pub-sub, WebSockets

**Database Schema** (`packages/db/src/schema/`):

- Uses `citext` for case-insensitive fields
- Relations defined with Drizzle relations
- Key tables: user, user_address, lists, profile_list, pins, locked_objekts

## Code Style

- Formatter: oxfmt (configured in `.oxfmtrc.json`)
- Linter: oxlint (configured in `.oxlintrc.json`)
- TypeScript strict mode enabled
- Path alias: `@/*` maps to `src/`
