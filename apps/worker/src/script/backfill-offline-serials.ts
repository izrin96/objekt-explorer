/**
 * One-time backfill of offline objekt serials.
 *
 * The cron job only reprocesses collections that still have a `serial = 0`
 * objekt, so collections that finished minting with wrong serials (written by
 * the old single-batch logic) are never revisited. This script reprocesses
 * EVERY offline collection: discover batch ranges, then recompute + correct
 * serials via the same code the job uses.
 *
 * Pre-cutoff v1 serials are never overwritten. Run with DRY_RUN=1 to preview
 * counts without writing.
 *
 *   DRY_RUN=1 bun run --env-file=../../.env src/script/backfill-offline-serials.ts
 *   bun run --env-file=../../.env src/script/backfill-offline-serials.ts
 *
 * Requires the serial_batches migration to be applied first.
 */
import { indexer } from "@repo/db/indexer";
import { collections, objekts } from "@repo/db/indexer/schema";
import { chunk } from "@repo/lib";
import { and, asc, eq, inArray, isNull, lte, ne, or, sql } from "drizzle-orm";

import { computeOfflineSerials, discoverBatches, V1_CUTOFF_MS } from "@/job/populate-serial";
import { preAssignedCollections as excludeCollections } from "@/lib/serial-constants";

const CONCURRENCY = 5;
const DB_BATCH_SIZE = 500;
const DRY_RUN = process.env.DRY_RUN === "1";
// resume by default: skip collections that already have serial_batches stored
// (already processed by a prior run or the cron). FORCE=1 reprocesses all.
const FORCE = process.env.FORCE === "1";

const targets = await indexer
  .selectDistinctOn([collections.id], {
    id: collections.id,
    slug: collections.slug,
    cid: collections.collectionId,
  })
  .from(collections)
  .innerJoin(objekts, eq(objekts.collectionId, collections.id))
  .where(
    and(
      or(
        and(eq(collections.onOffline, "offline"), ne(collections.slug, "empty-collection")),
        inArray(collections.slug, excludeCollections),
      ),
      FORCE ? undefined : isNull(collections.serialBatches),
    ),
  );

console.log(
  `[backfill] ${DRY_RUN ? "DRY RUN — " : ""}${FORCE ? "FORCE — all" : "resume — remaining"} ${targets.length} offline collections`,
);

let totalUpdated = 0;
let touchedCollections = 0;
const failed: string[] = [];

async function processOne(t: { id: string; slug: string; cid: string }) {
  const allObjekts = await indexer
    .select({ id: objekts.id, serial: objekts.serial, mintedAt: objekts.mintedAt })
    .from(objekts)
    .where(
      and(
        eq(objekts.collectionId, t.id),
        lte(objekts.mintedAt, new Date(Date.now() - 120 * 1000).toISOString()),
      ),
    )
    .orderBy(asc(objekts.id));

  if (allObjekts.length === 0) return;

  const presentTokenIds = allObjekts.map((o) => parseInt(o.id));

  let batches: { start: number; end: number }[];
  try {
    batches = await discoverBatches(t.cid, presentTokenIds);
  } catch {
    console.log(`[backfill] ${t.slug}: API error, skipping`);
    failed.push(t.slug);
    return;
  }

  if (batches.length === 0) {
    console.log(`[backfill] ${t.slug}: no batches discovered`);
    return;
  }

  const computed = computeOfflineSerials(allObjekts, batches, V1_CUTOFF_MS);
  const byId = new Map(allObjekts.map((o) => [o.id, o] as const));

  const updates: { id: string; newSerial: number }[] = [];
  for (const { id, serial } of computed) {
    const obj = byId.get(id)!;
    // never overwrite authoritative pre-cutoff v1 serials
    if (obj.serial > 0 && Date.parse(obj.mintedAt) < V1_CUTOFF_MS) continue;
    if (serial !== obj.serial) updates.push({ id, newSerial: serial });
  }

  const SAMPLE = 50;
  const sample = updates
    .slice(0, SAMPLE)
    .map((u) => `${u.id}: ${byId.get(u.id)!.serial}->${u.newSerial}`)
    .join(", ");
  const more = updates.length > SAMPLE ? ` (+${updates.length - SAMPLE} more)` : "";
  console.log(
    `[backfill] ${t.slug}: ${batches.length} batches, ${updates.length} serial(s) to fix` +
      (updates.length > 0 ? `\n           ${sample}${more}` : ""),
  );

  // persist discovered ranges even when nothing needs fixing, so the cron reuses
  // the cache instead of re-discovering from scratch
  if (!DRY_RUN) {
    await indexer
      .update(collections)
      .set({ serialBatches: batches })
      .where(eq(collections.id, t.id));
  }

  if (updates.length === 0) return;
  totalUpdated += updates.length;
  touchedCollections++;

  if (DRY_RUN) return;

  await indexer.transaction(async (tx) => {
    for (let i = 0; i < updates.length; i += DB_BATCH_SIZE) {
      const slice = updates.slice(i, i + DB_BATCH_SIZE);
      const ids = slice.map((u) => u.id);
      const caseExpr = slice
        .map((u) => sql`WHEN ${u.id} THEN ${u.newSerial}`)
        .reduce((acc, curr) => sql`${acc} ${curr}`, sql``);
      await tx
        .update(objekts)
        .set({ serial: sql`(CASE id ${caseExpr} END)::int` })
        .where(inArray(objekts.id, ids));
    }
  });
}

await chunk(targets, CONCURRENCY, async (group) => {
  await Promise.all(group.map((t) => processOne(t)));
});

console.log(
  `[backfill] Done. ${DRY_RUN ? "Would update" : "Updated"} ${totalUpdated} serials across ${touchedCollections} collections.` +
    (failed.length ? ` Failed (API): ${failed.length} — ${failed.join(", ")}` : ""),
);
process.exit(0);
