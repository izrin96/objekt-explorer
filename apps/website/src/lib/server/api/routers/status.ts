import { indexer } from "@repo/db/indexer";
import { transfers } from "@repo/db/indexer/schema";
import { desc } from "drizzle-orm";
import { ofetch } from "ofetch";

import { getCache } from "../../redis.server";
import { pub } from "../orpc";

export const statusRouter = {
  get: pub.handler(async () => {
    return getCache("system-status", 60, async () => {
      const [dbResult, cosmoResult] = await Promise.all([
        fetchDatabaseStatus(),
        fetchCosmoStatus(),
      ]);

      return {
        database: dbResult,
        cosmo: cosmoResult,
      };
    });
  }),
};

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
  const [v3Res, v1Res] = await Promise.allSettled([
    ofetch("https://api.cosmo.fans/bff/v3/artists", {
      method: "HEAD",
      timeout: 5000,
    }).then(() => true),
    ofetch("https://api.cosmo.fans", {
      method: "HEAD",
      timeout: 5000,
    }).then(() => true),
  ]);

  const v3Up = v3Res.status === "fulfilled" && v3Res.value;
  const v1Up = v1Res.status === "fulfilled" && v1Res.value;

  let status: "up" | "partial" | "down";
  if (v3Up && v1Up) {
    status = "up";
  } else if (v3Up && !v1Up) {
    status = "partial";
  } else {
    status = "down";
  }

  return { status };
}
