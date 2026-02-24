import { drizzle } from "drizzle-orm/bun-sql";

import { relations } from "./relation";

export const indexer = drizzle(process.env.INDEXER_DATABASE_URL!, { relations });
