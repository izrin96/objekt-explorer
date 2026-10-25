import { indexer } from "@repo/db/indexer";
import { sql } from "drizzle-orm";

import { serverEnv } from "../env";

const WAIT_MS = 20_000;
const POLL_MS = 1_000;
const RPC_TIMEOUT_MS = 5_000;

async function chainHead(endpoint: string) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_blockNumber", params: [] }),
    signal: AbortSignal.timeout(RPC_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`RPC ${response.status}`);
  const body = (await response.json()) as { result?: string };
  if (!body.result) throw new Error("no block number");
  return Number.parseInt(body.result, 16);
}

/** The newest block the indexer has written, hot blocks included, as the worker reads it. */
async function indexedHeight() {
  const result = await indexer.execute<{ height: number | null }>(sql`
    SELECT greatest(
      (SELECT max(height) FROM squid_processor.status),
      (SELECT max(height) FROM squid_processor.hot_block)
    ) AS height
  `);
  return result.rows[0]?.height ?? null;
}

/**
 * Whether the indexer has written every block mined before this call, waiting up to 20 seconds
 * for it. False when it can't tell (no RPC endpoint, a failed read), so a caller fails safe.
 */
export async function indexerCaughtUp() {
  const endpoint = serverEnv.INDEXER_RPC_ENDPOINT;
  if (!endpoint) return false;
  try {
    const target = await chainHead(endpoint);
    const deadline = Date.now() + WAIT_MS;
    for (;;) {
      const height = await indexedHeight();
      if (height !== null && height >= target) return true;
      if (Date.now() >= deadline) return false;
      await new Promise((resolve) => setTimeout(resolve, POLL_MS));
    }
  } catch {
    return false;
  }
}
