import path from "node:path";

import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";

import { env } from "./env";

/**
 * Applies the Drizzle-owned indexer migrations. Runs after the Subsquid
 * migrations, since these alter the tables those create.
 */
async function main() {
  const db = drizzle(env.DB_URL);
  try {
    await migrate(db, {
      migrationsFolder: path.join(__dirname, "../../../packages/db/indexer-migrations"),
    });
  } finally {
    await db.$client.end();
  }
}

void main();
