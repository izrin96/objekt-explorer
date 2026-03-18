import { SQL } from "bun";
import { drizzle } from "drizzle-orm/bun-sql";

import { relations } from "./relation";

const client = new SQL({
  url: process.env.DATABASE_URL!,
});

export const db = drizzle({
  relations,
  client,
});
