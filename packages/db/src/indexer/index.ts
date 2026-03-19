import { SQL } from "bun";
import { drizzle } from "drizzle-orm/bun-sql";

import { relations } from "./relation";

const client = new SQL({
  url: process.env.INDEXER_DATABASE_URL!,
  max: 5,
});

export const indexer = drizzle({
  relations,
  client,
});
