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

/** The pair `from` → `to` of addresses whose held transfers a caller must wait for, lowercased. */
export type HeldBetween = { from: string[]; to: string[] };

// a fresh mint's transfers wait in pending_transfer until Cosmo has its metadata, below the
// height checked here, so a send just made between the parties would otherwise go unseen
async function holdsTransferBetween({ from, to }: HeldBetween) {
  if (from.length === 0 || to.length === 0) return false;
  const result = await indexer.execute<{ hit: number }>(sql`
    SELECT 1 AS hit FROM pending_transfer
    WHERE lower("from") = ANY(${sql.param(from)}::text[])
      AND lower("to") = ANY(${sql.param(to)}::text[])
    LIMIT 1
  `);
  return result.rows.length > 0;
}

/**
 * Whether the indexer has written every block mined before this call, waiting up to 20 seconds
 * for it, and holds no transfer between `between`'s addresses. False when it can't tell (no RPC
 * endpoint, a failed read), so a caller fails safe.
 */
export async function indexerCaughtUp(between: HeldBetween) {
  const endpoint = serverEnv.INDEXER_RPC_ENDPOINT;
  if (!endpoint) return false;
  try {
    if (await holdsTransferBetween(between)) return false;
    const target = await chainHead(endpoint);
    const deadline = Date.now() + WAIT_MS;
    for (;;) {
      const height = await indexedHeight();
      if (height !== null && height >= target) return !(await holdsTransferBetween(between));
      if (Date.now() >= deadline) return false;
      await new Promise((resolve) => setTimeout(resolve, POLL_MS));
    }
  } catch {
    return false;
  }
}
