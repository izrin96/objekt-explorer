import { drizzle } from "drizzle-orm/node-postgres";
import { env } from "@/env";
import * as schema from "./schema";

export const db = drizzle(
  process.env.NODE_ENV === "development"
    ? process.env.DATABASE_URL_MAIN_LOCAL!
    : env.DATABASE_URL!,
  {
    schema,
  }
);
