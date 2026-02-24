import { drizzle } from "drizzle-orm/bun-sql";

import { relations } from "./relation";

export const db = drizzle(process.env.DATABASE_URL!, {
  relations,
});
