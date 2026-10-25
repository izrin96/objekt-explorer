// PreToolUse hook (Bash): the root .env is production, so schema writes run only
// when .env.local points DATABASE_URL at a local host. The indexer database is
// production in every setup, so its writes are always blocked. Exit 2 blocks.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const input = await Bun.stdin.json().catch(() => ({}));
const command: string = input.tool_input?.command ?? "";

const indexerWrite =
  /db:migrate:indexer|drizzle-kit\s+(migrate|push)\b[^\n;&|]*drizzle-indexer\.config/.test(command);
const appWrite = !indexerWrite && /db:(migrate|push)\b|drizzle-kit\s+(migrate|push)\b/.test(command);

function block(reason: string): never {
  console.error(reason);
  process.exit(2);
}

if (indexerWrite) {
  block(
    "Blocked: the indexer database is production in every setup. Ask the user to run indexer schema changes themselves.",
  );
}

if (appWrite) {
  const root = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
  const envLocal = join(root, ".env.local");
  const url = existsSync(envLocal)
    ? /^DATABASE_URL=["']?([^"'\n]+)/m.exec(readFileSync(envLocal, "utf8"))?.[1]
    : undefined;
  const host = url ? URL.parse(url)?.hostname : undefined;
  if (!host || !["localhost", "127.0.0.1", "::1", "[::1]"].includes(host)) {
    block(
      "Blocked: DATABASE_URL resolves to the production database (root .env). Migrations and pushes run only when .env.local sets DATABASE_URL to a local host; otherwise ask the user.",
    );
  }
}
