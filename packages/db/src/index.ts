import { drizzle } from "drizzle-orm/node-postgres";

import { relations } from "./relation";

export const db = drizzle(process.env.DATABASE_URL!, {
  relations,
});
