import { drizzle } from "drizzle-orm/node-postgres";

export const indexer = drizzle(process.env.INDEXER_DATABASE_URL || "");
