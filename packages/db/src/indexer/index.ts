import { drizzle } from "drizzle-orm/node-postgres";

import { createPool } from "../pool";
import { relations } from "./relation";

export const indexer = drizzle({
  client: createPool(process.env.INDEXER_DATABASE_URL!, "indexer"),
  relations,
});
