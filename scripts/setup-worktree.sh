#!/usr/bin/env bash
# Brings a fresh git worktree of the main checkout up: the shared root .env and .env.local,
# dependencies and the git hooks. Orca runs it through orca.yaml; any other worktree runs it by hand. It may run
# again, so every step is idempotent. There is no per-worktree database: every app reads the
# Postgres named in .env, or in .env.local when that overrides it.

set -euo pipefail

worktree="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$worktree"

# The main checkout owns the gitignored env files. In a worktree --git-common-dir points at the
# main .git; in the main checkout it points at its own, so the copies are no-ops there.
main_checkout="$(dirname "$(git rev-parse --path-format=absolute --git-common-dir)")"
if [ ! -f .env ]; then
  if [ "$main_checkout" != "$worktree" ] && [ -f "$main_checkout/.env" ]; then
    cp "$main_checkout/.env" .env
  else
    cp .env.example .env
  fi
fi

# Without .env.local a worktree would fall through to the database in the root .env.
if [ ! -f .env.local ] && [ "$main_checkout" != "$worktree" ] && [ -f "$main_checkout/.env.local" ]; then
  cp "$main_checkout/.env.local" .env.local
fi

bun install
bunx lefthook install

echo
echo "Worktree ready"
echo "  web   bun run dev --filter=web"
