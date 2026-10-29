import { parseIndexerSeen } from "@repo/api/lib/indexer-seen";
import { INDEXER_SEEN_KEY, type IndexerSeen } from "@repo/api/schemas/offer";
import { indexer } from "@repo/db/indexer";
import { sql } from "drizzle-orm";

import { log } from "../../lib/log";
import { redis } from "../../lib/redis";

const verifierLog = log("verifier");

const RPC_TIMEOUT_MS = 10_000;

async function blockTime(height: number) {
  const endpoint = process.env.INDEXER_RPC_ENDPOINT;
  if (!endpoint) throw new Error("INDEXER_RPC_ENDPOINT is not set");
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "eth_getBlockByNumber",
      params: [`0x${height.toString(16)}`, false],
    }),
    signal: AbortSignal.timeout(RPC_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`RPC ${response.status}`);
  const body = (await response.json()) as { result?: { timestamp?: string } | null };
  const timestamp = body.result?.timestamp;
  if (!timestamp) throw new Error(`no block ${height}`);
  return new Date(Number.parseInt(timestamp, 16) * 1000).toISOString();
}

/**
 * Stores the time of the newest block the indexer has written, hot blocks included, since
 * their transfers are already readable. A transfer held for its metadata is not readable yet,
 * so the time stops one second before the oldest one. On failure the previous reading stays,
 * so its `readAt` shows the failure.
 */
export async function readIndexerHead(): Promise<IndexerSeen | null> {
  try {
    const result = await indexer.execute<{ height: number | null; held_from: number | null }>(sql`
      SELECT greatest(
        (SELECT max(height) FROM squid_processor.status),
        (SELECT max(height) FROM squid_processor.hot_block)
      ) AS height,
      (SELECT extract(epoch FROM min(timestamp)) * 1000 FROM pending_transfer)::float8 AS held_from
    `);
    const height = result.rows[0]?.height;
    if (height == null) throw new Error("no processor height");
    const heldFrom = result.rows[0]?.held_from;
    const head = await blockTime(height);
    const seenUntil =
      heldFrom != null && heldFrom - 1000 < Date.parse(head)
        ? new Date(heldFrom - 1000).toISOString()
        : head;
    const seen = { seenUntil, readAt: new Date().toISOString() };
    await redis.set(INDEXER_SEEN_KEY, JSON.stringify(seen));
    return seen;
  } catch (error) {
    verifierLog.warn(`Could not read the indexer head: ${String(error)}`);
    return parseIndexerSeen(await redis.get(INDEXER_SEEN_KEY));
  }
}
