import { drizzle } from "drizzle-orm/node-postgres";

import { createPool } from "./pool";
import { relations } from "./relation";

export const db = drizzle({ client: createPool(process.env.DATABASE_URL!, "main"), relations });

/** The handle a `db.transaction` callback receives. */
export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
