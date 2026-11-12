import path from "node:path";

import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("[migrate] DATABASE_URL is not set");
  process.exit(1);
}

// src/ and the image's dist/ sit at the same depth, so one path serves both
const migrationsFolder = path.join(import.meta.dir, "../../../packages/db/migrations");

const db = drizzle(url);
try {
  console.log(`[migrate] applying ${migrationsFolder}`);
  await migrate(db, { migrationsFolder });
  console.log("[migrate] done");
} catch (error) {
  console.error("[migrate] failed:", error);
  process.exitCode = 1;
} finally {
  await db.$client.end();
}
