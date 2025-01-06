import { drizzle } from "drizzle-orm/pg-proxy";
import { env } from "@/env.mjs";
import * as schema from "./schema";
import { ofetch } from "ofetch";

export const db = drizzle(
  async (sql, params, method) => {
    try {
      const rows = await ofetch(`${env.DB_PROXY_URL}/query`, {
        retry: 1,
        retryDelay: 500,
        method: "POST",
        headers: {
          "proxy-key": env.DB_PROXY_KEY,
        },
        body: JSON.stringify({
          sql,
          params,
          method,
        }),
      });

      return { rows };
    } catch (e: any) {
      console.error("Error from Drizzle HTTP proxy: ", e);
      return { rows: [] };
    }
  },
  { schema }
);
