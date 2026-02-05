import { drizzle } from "drizzle-orm/node-postgres";

import { relations } from "./relation";

export const indexer = drizzle(process.env.INDEXER_DATABASE_URL!, { relations });
