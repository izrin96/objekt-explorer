import { drizzle } from "drizzle-orm/node-postgres";
import { env } from "@/lib/env/server";
import * as schema from "./schema";

export const db = drizzle(env.DATABASE_URL, {
  schema,
});
