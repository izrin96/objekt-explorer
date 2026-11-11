/**
 * Compares every objekt's `transferable` with `isObjektTransferable` on chain and corrects the
 * rows the indexer recorded from Cosmo's class guess before it read the chain at mint.
 *
 * It pins one final block B (the indexer's `squid_processor.status` height) and reads every objekt
 * minted before B's timestamp at B, through Multicall3 `aggregate3`, skipping cosmo-spin's objekts
 * (false in the database, true on chain, by design) and burned ones. A failed read counts as
 * skipped, never as a value. It reports mismatches by class and direction, and the same for
 * objekts minted in the last RECENT_DAYS before B.
 *
 * A dry run by default, with plain reads only: it refuses to start unless the connection is
 * read-only. APPLY=1 sets each mismatched row to the chain's value, only while the row still
 * holds the value read and no `transferability_update` newer than B exists for the token.
 *
 *   PGOPTIONS='-c default_transaction_read_only=on' bun run --env-file=../../.env src/script/fix-transferability.ts
 *   APPLY=1 bun run --env-file=../../.env src/script/fix-transferability.ts
 *
 * LIMIT=<n> stops after n objekts (a sample), AFTER=<id> resumes after an objekt id, PER_CALL
 * (default 500) sets the tokens per aggregate3 call and RATE (default 8) the calls per second.
 */
import { indexer } from "@repo/db/indexer";
import { collections, objekts, transferabilityUpdates } from "@repo/db/indexer/schema";
import { Addresses } from "@repo/lib";
import { and, asc, eq, gt, inArray, lt, ne, notExists, notInArray, sql } from "drizzle-orm";

import {
  type CheckedObjekt,
  type Mismatch,
  type Tally,
  MULTICALL3,
  addToTally,
  compareWithChain,
  decodeAggregate3,
  encodeAggregate3,
} from "@/lib/transferability-check";

const APPLY = process.env.APPLY === "1";
const RPC = process.env.INDEXER_RPC_ENDPOINT;
const PER_CALL = Number(process.env.PER_CALL ?? 500);
const CALLS_PER_PAGE = 10;
const RATE = Number(process.env.RATE ?? 8);
const LIMIT = process.env.LIMIT ? Number(process.env.LIMIT) : Number.POSITIVE_INFINITY;
const RECENT_DAYS = 3;
const SAMPLE = 10;
const RETRIES = 4;

function fail(message: string): never {
  console.error(`[fix-transferability] ${message}`);
  process.exit(1);
}

if (!RPC) fail("INDEXER_RPC_ENDPOINT is not set");
if (!Number.isInteger(PER_CALL) || PER_CALL < 1) fail("PER_CALL must be a positive integer");
if (!(RATE > 0)) fail("RATE must be positive");

if (!APPLY) {
  const { rows } = await indexer.execute<{ transaction_read_only: string }>(
    sql`show transaction_read_only`,
  );
  if (rows[0]?.transaction_read_only !== "on") {
    fail(
      "a dry run needs a read-only connection: pass PGOPTIONS='-c default_transaction_read_only=on'",
    );
  }
}

let nextSlot = 0;
async function paced() {
  const now = Date.now();
  const wait = Math.max(0, nextSlot - now);
  nextSlot = Math.max(now, nextSlot) + 1000 / RATE;
  if (wait > 0) await Bun.sleep(wait);
}

async function rpc<T>(method: string, params: unknown[]): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= RETRIES; attempt++) {
    if (attempt > 0) await Bun.sleep(1000 * 2 ** (attempt - 1));
    await paced();
    try {
      const response = await fetch(RPC!, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const body = (await response.json()) as { result?: T; error?: { message: string } };
      if (body.error) throw new Error(body.error.message);
      if (body.result === undefined) throw new Error("no result");
      return body.result;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

const [status] = (
  await indexer.execute<{ height: number | null }>(
    sql`select max(height)::int as height from squid_processor.status`,
  )
).rows;
const height = status?.height;
if (height === null || height === undefined) fail("squid_processor.status has no height");

const block = await rpc<{ hash: string; timestamp: string } | null>("eth_getBlockByNumber", [
  `0x${height.toString(16)}`,
  false,
]);
if (!block) fail(`block ${height} not found on ${RPC}`);
const blockTime = new Date(Number(BigInt(block.timestamp)) * 1000);
const recentFrom = new Date(blockTime.getTime() - RECENT_DAYS * 24 * 60 * 60 * 1000);

console.log(
  `[fix-transferability] ${APPLY ? "APPLY" : "dry run"}: block ${height} (${block.hash}, ` +
    `${blockTime.toISOString()}), objekts minted before it, ${PER_CALL} per call at ${RATE}/s`,
);

type Row = CheckedObjekt & { mintedAt: string };

function loadPage(after: string, size: number) {
  return indexer
    .select({
      id: objekts.id,
      transferable: objekts.transferable,
      class: collections.class,
      mintedAt: objekts.mintedAt,
    })
    .from(objekts)
    .leftJoin(collections, eq(collections.id, objekts.collectionId))
    .where(
      and(
        gt(objekts.id, after),
        // strictly before: a later block can share B's timestamp, and its mints don't exist at B
        lt(objekts.mintedAt, blockTime.toISOString()),
        notInArray(objekts.owner, [Addresses.SPIN, Addresses.NULL]),
      ),
    )
    .orderBy(asc(objekts.id))
    .limit(size);
}

async function readChain(rows: Row[]) {
  const data = encodeAggregate3(
    Addresses.OBJEKT,
    rows.map((row) => row.id),
  );
  try {
    const result = await rpc<string>("eth_call", [
      { to: MULTICALL3, data },
      { blockHash: block!.hash },
    ]);
    return { values: decodeAggregate3(result, rows.length), failed: false };
  } catch (error) {
    console.warn(`[fix-transferability] call for ${rows[0]!.id}…${rows.at(-1)!.id} failed:`, error);
    return { values: rows.map(() => null), failed: true };
  }
}

async function applyPage(mismatches: Mismatch[]) {
  let updated = 0;
  for (const chain of [true, false]) {
    const ids = mismatches.filter((m) => m.chain === chain).map((m) => m.id);
    if (ids.length === 0) continue;
    const rows = await indexer
      .update(objekts)
      .set({ transferable: chain })
      .where(
        and(
          inArray(objekts.id, ids),
          eq(objekts.transferable, !chain),
          ne(objekts.owner, Addresses.SPIN),
          notExists(
            indexer
              .select({ one: sql`1` })
              .from(transferabilityUpdates)
              .where(
                and(
                  eq(transferabilityUpdates.tokenId, objekts.id),
                  gt(transferabilityUpdates.blockNumber, height!),
                ),
              ),
          ),
        ),
      )
      .returning({ id: objekts.id });
    updated += rows.length;
  }
  return updated;
}

const all: Tally = new Map();
const recent: Tally = new Map();
const samples: Record<Mismatch["direction"], string[]> = { "true-in-db": [], "false-in-db": [] };
let checked = 0;
let skipped = 0;
let failedCalls = 0;
let updated = 0;
let after = process.env.AFTER ?? "";
const started = Date.now();
let lastReport = 0;

let pending = loadPage(after, Math.min(PER_CALL * CALLS_PER_PAGE, LIMIT));
while (true) {
  const page: Row[] = await pending;
  if (page.length === 0) break;
  after = page.at(-1)!.id;
  checked += page.length;
  const remaining = LIMIT - checked;
  if (remaining > 0) pending = loadPage(after, Math.min(PER_CALL * CALLS_PER_PAGE, remaining));

  const calls: Row[][] = [];
  for (let i = 0; i < page.length; i += PER_CALL) calls.push(page.slice(i, i + PER_CALL));
  const results = await Promise.all(calls.map(readChain));

  const pageMismatches: Mismatch[] = [];
  for (const [i, rows] of calls.entries()) {
    const { values, failed } = results[i]!;
    if (failed) failedCalls += 1;
    const { mismatches, skipped: none } = compareWithChain(rows, values);
    skipped += none.length;
    const noAnswer = new Set(none);
    const answered = rows.filter((row) => !noAnswer.has(row.id));
    addToTally(all, answered, mismatches);
    const isRecent = (row: { mintedAt: string }) => new Date(row.mintedAt) >= recentFrom;
    addToTally(recent, answered.filter(isRecent), mismatches.filter(isRecent));
    for (const mismatch of mismatches) {
      const sample = samples[mismatch.direction];
      if (sample.length < SAMPLE) sample.push(mismatch.id);
    }
    pageMismatches.push(...mismatches);
  }

  if (APPLY && pageMismatches.length > 0) updated += await applyPage(pageMismatches);

  if (checked - lastReport >= 100_000) {
    lastReport = checked;
    const minutes = ((Date.now() - started) / 60_000).toFixed(1);
    console.log(`[fix-transferability] ${checked} checked, after ${after}, ${minutes} min`);
  }
  if (remaining <= 0) break;
}

function printTally(title: string, tally: Tally) {
  const rows = [...tally.entries()].sort(([a], [b]) => a.localeCompare(b));
  let total = { checked: 0, "true-in-db": 0, "false-in-db": 0 };
  console.log(`\n${title}`);
  console.log(
    "class                checked   true in DB, false on chain   false in DB, true on chain",
  );
  for (const [name, counts] of rows) {
    total = {
      checked: total.checked + counts.checked,
      "true-in-db": total["true-in-db"] + counts["true-in-db"],
      "false-in-db": total["false-in-db"] + counts["false-in-db"],
    };
    console.log(line(name, counts));
  }
  console.log(line("total", total));
}

function line(
  name: string,
  counts: { checked: number; "true-in-db": number; "false-in-db": number },
) {
  const pct = (n: number) => (counts.checked ? ((100 * n) / counts.checked).toFixed(2) : "0.00");
  return (
    `${name.padEnd(18)} ${String(counts.checked).padStart(9)}   ` +
    `${`${counts["true-in-db"]} (${pct(counts["true-in-db"])}%)`.padEnd(29)}` +
    `${counts["false-in-db"]} (${pct(counts["false-in-db"])}%)`
  );
}

printTally(`All objekts minted before block ${height}`, all);
printTally(`Minted in the ${RECENT_DAYS} days before block ${height}`, recent);
console.log(
  `\nchecked ${checked}, skipped ${skipped} (failed calls ${failedCalls}), last id ${after}` +
    `, ${((Date.now() - started) / 60_000).toFixed(1)} min`,
);
console.log(`sample true in DB, false on chain: ${samples["true-in-db"].join(", ") || "none"}`);
console.log(`sample false in DB, true on chain: ${samples["false-in-db"].join(", ") || "none"}`);
console.log(APPLY ? `updated ${updated} objekts` : "dry run: nothing written");

process.exit(0);
