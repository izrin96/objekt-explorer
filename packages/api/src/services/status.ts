import { indexer } from "@repo/db/indexer";
import { transfers } from "@repo/db/indexer/schema";
import { desc } from "drizzle-orm";
import { ofetch } from "ofetch";

import { getCache } from "./redis";

/** Whether the indexer is current and Cosmo answers, cached a minute for every caller. */
export function fetchSystemStatus() {
  return getCache("system-status", 60, async () => {
    const [database, cosmo] = await Promise.all([fetchDatabaseStatus(), fetchCosmoStatus()]);
    return { database, cosmo };
  });
}

async function fetchDatabaseStatus() {
  try {
    const result = await indexer
      .select({ timestamp: transfers.timestamp })
      .from(transfers)
      .orderBy(desc(transfers.timestamp))
      .limit(1);

    const rawTimestamp = result[0]?.timestamp ?? null;
    const latestTransferDate = rawTimestamp ? new Date(rawTimestamp).toISOString() : null;

    const behind =
      !latestTransferDate || Date.now() - new Date(latestTransferDate).getTime() > 15 * 60 * 1000;

    return {
      latestTransferDate,
      behind,
    };
  } catch {
    return {
      latestTransferDate: null,
      behind: true,
    };
  }
}

async function fetchCosmoStatus() {
  const up = await ofetch("https://api.cosmo.fans/bff/v3/artists", {
    method: "HEAD",
    timeout: 5000,
  }).then(
    () => true,
    () => false,
  );

  return { status: up ? ("up" as const) : ("down" as const) };
}
