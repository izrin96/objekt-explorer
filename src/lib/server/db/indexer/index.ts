import { drizzle } from "drizzle-orm/pg-proxy";
import { ofetch } from "ofetch";
import { env } from "@/env";
import * as schema from "./schema";

export const indexer = drizzle(
  async (sql, params, method) => {
    try {
      const rows = await ofetch(`${env.INDEXER_PROXY_URL}/query`, {
        retry: false,
        timeout: 10000,
        method: "POST",
        headers: {
          "proxy-key": env.INDEXER_PROXY_KEY,
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
  { schema },
);
