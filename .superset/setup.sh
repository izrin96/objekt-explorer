#!/usr/bin/env bash
# Brings a fresh Superset workspace (a git worktree of the main checkout) up: the shared root
# .env and dependencies. Superset re-runs this, so every step is idempotent. There is no
# per-workspace database: every app reads the one Postgres named in .env.

set -euo pipefail

worktree="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$worktree"

# The main checkout owns the gitignored .env. In a worktree --git-common-dir points at the main
# .git; in the main checkout it points at its own, so the copy is a no-op there.
main_checkout="$(dirname "$(git rev-parse --path-format=absolute --git-common-dir)")"
if [ ! -f .env ]; then
  if [ "$main_checkout" != "$worktree" ] && [ -f "$main_checkout/.env" ]; then
    cp "$main_checkout/.env" .env
  else
    cp .env.example .env
  fi
fi

bun install

echo
echo "Workspace ready"
echo "  web   bun run dev --filter=web"
