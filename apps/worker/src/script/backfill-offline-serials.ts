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
 *
 * Confirmed serials (cosmo_objekt) join the manual anchors only when this
 * process's COSMO_OBJEKT_WRITES holds `anchors`: run it with the worker's value.
 */
import { indexer } from "@repo/db/indexer";
import { collections, objekts } from "@repo/db/indexer/schema";
import { chunk } from "@repo/lib";
import { and, asc, eq, inArray, isNull, lte, or } from "drizzle-orm";

import { loadConfirmedSerials } from "@/job/confirmed-serials";
import { writeSerialUpdates } from "@/job/serial-batches";
import { discoverBatches } from "@/job/serial-discovery";
import type { Anchor } from "@/lib/cosmo-anchors";
import { mergeTally, tallyDetails, tallyWarning, withConfirmed } from "@/lib/merge-tally";
import { preAssignedCollections as excludeCollections } from "@/lib/serial-constants";
import { computeOfflineSerials, V1_CUTOFF_MS } from "@/lib/serial-math";

const CONCURRENCY = 5;
const DRY_RUN = process.env.DRY_RUN === "1";
// resume by default: skip collections that already have serial_batches stored
// (already processed by a prior run or the cron). FORCE=1 reprocesses all.
const FORCE = process.env.FORCE === "1";

const targets = await indexer
  .selectDistinctOn([collections.id], {
    id: collections.id,
    slug: collections.slug,
    cid: collections.collectionId,
    anchors: collections.serialAnchors,
  })
  .from(collections)
  .innerJoin(objekts, eq(objekts.collectionId, collections.id))
  .where(
    and(
      or(eq(collections.onOffline, "offline"), inArray(collections.slug, excludeCollections)),
      FORCE ? undefined : isNull(collections.serialBatches),
    ),
  );

console.log(
  `[backfill] ${DRY_RUN ? "DRY RUN — " : ""}${FORCE ? "FORCE — all" : "resume — remaining"} ${targets.length} offline collections`,
);

const confirmed = await loadConfirmedSerials(targets.map((t) => t.slug));
const tally = mergeTally();

let totalUpdated = 0;
let touchedCollections = 0;
const failed: string[] = [];

async function processOne(t: { id: string; slug: string; cid: string; anchors: Anchor[] | null }) {
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

  const merge = withConfirmed(t.anchors ?? [], confirmed.get(t.slug), allObjekts, batches);
  tally.record(t.id, merge);
  const computed = computeOfflineSerials(allObjekts, batches, V1_CUTOFF_MS, merge.anchors);
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

  await writeSerialUpdates(updates);
}

await chunk(targets, CONCURRENCY, async (group) => {
  await Promise.all(group.map((t) => processOne(t)));
});

const warning = tallyWarning(tally);
if (warning) {
  console.log(`[backfill] ${warning}`);
  for (const line of tallyDetails(tally)) console.log(`  ${line}`);
}

console.log(
  `[backfill] Done. ${DRY_RUN ? "Would update" : "Updated"} ${totalUpdated} serials across ${touchedCollections} collections.` +
    (failed.length ? ` Failed (API): ${failed.length} — ${failed.join(", ")}` : ""),
);
process.exit(0);
