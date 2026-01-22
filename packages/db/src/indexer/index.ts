import { drizzle } from "drizzle-orm/node-postgres";

import * as schema from "./schema";

export const indexer = drizzle(process.env.INDEXER_DATABASE_URL!, { schema });
