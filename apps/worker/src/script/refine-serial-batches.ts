/**
 * Apply the 100-token block rules (refineBatches) to the serial_batches already
 * stored for every offline collection, and recompute post-cutoff serials.
 *
 * The cron only refines ranges it (re)discovers, so stored ranges and the
 * serials written from them are fixed here once.
 *
 * Also measures the rules on ground truth: for each anchored collection it
 * hides every v1 anchor, chains serials from the stored and from the refined
 * ranges, and compares both with the real v1 serials.
 *
 * Dry run by default. APPLY=1 writes the refined ranges and serials.
 *
 *   bun run --env-file=../../.env src/script/refine-serial-batches.ts
 *   APPLY=1 bun run --env-file=../../.env src/script/refine-serial-batches.ts
 */
import { indexer } from "@repo/db/indexer";
import { collections, objekts } from "@repo/db/indexer/schema";
import { chunk } from "@repo/lib";
import { and, asc, eq, inArray, isNotNull, lte, ne, notInArray, or } from "drizzle-orm";

import { refineBatches, writeSerialUpdates } from "@/job/populate-serial";
import {
  preAssignedCollections as excludeCollections,
  preBlockSeasons,
} from "@/lib/serial-constants";
import {
  computeOfflineSerials,
  computeOfflineSerialUpdates,
  V1_CUTOFF_MS,
} from "@/lib/serial-math";

const CONCURRENCY = 5;
const APPLY = process.env.APPLY === "1";

type Batch = { start: number; end: number };
type Row = { id: string; serial: number; mintedAt: string };

const targets = await indexer
  .select({
    id: collections.id,
    slug: collections.slug,
    season: collections.season,
    batches: collections.serialBatches,
  })
  .from(collections)
  .where(
    and(
      or(
        and(eq(collections.onOffline, "offline"), ne(collections.slug, "empty-collection")),
        inArray(collections.slug, excludeCollections),
      ),
      isNotNull(collections.serialBatches),
      notInArray(collections.season, preBlockSeasons),
    ),
  )
  .orderBy(asc(collections.slug));

console.log(`[refine] ${APPLY ? "APPLY" : "DRY RUN"} — ${targets.length} offline collections`);

type SeasonStats = {
  collections: number;
  changed: number;
  blocks: number;
  snapped: number;
  updates: number;
  holdout: number;
  exactBefore: number;
  exactAfter: number;
};
const bySeason = new Map<string, SeasonStats>();

function seasonStats(season: string) {
  let s = bySeason.get(season);
  if (!s) {
    s = {
      collections: 0,
      changed: 0,
      blocks: 0,
      snapped: 0,
      updates: 0,
      holdout: 0,
      exactBefore: 0,
      exactAfter: 0,
    };
    bySeason.set(season, s);
  }
  return s;
}

// serials chained from the ranges alone (cutoff 0 = no objekt counts as an
// anchor), scored against the real v1 serial of every pre-cutoff objekt
function holdoutExact(rows: Row[], batches: Batch[]) {
  const truth = rows.filter((o) => o.serial > 0 && Date.parse(o.mintedAt) < V1_CUTOFF_MS);
  const chained = new Map(computeOfflineSerials(truth, batches, 0).map((c) => [c.id, c.serial]));
  return {
    total: truth.length,
    exact: truth.filter((o) => chained.get(o.id) === o.serial).length,
  };
}

async function processOne(t: (typeof targets)[number]) {
  const stored = t.batches ?? [];
  if (stored.length === 0) return;

  const rows = await indexer
    .select({ id: objekts.id, serial: objekts.serial, mintedAt: objekts.mintedAt })
    .from(objekts)
    .where(
      and(
        eq(objekts.collectionId, t.id),
        lte(objekts.mintedAt, new Date(Date.now() - 120 * 1000).toISOString()),
      ),
    )
    .orderBy(asc(objekts.id));
  if (rows.length === 0) return;

  const tokenIds = rows.map((o) => parseInt(o.id));
  const refined = await refineBatches(t.season, stored, tokenIds);

  const storedKeys = new Set(stored.map((b) => `${b.start}-${b.end}`));
  const storedEnds = new Set(stored.map((b) => b.end));
  const blocks = refined.filter((b) => !storedEnds.has(b.end)).length;
  const snapped = refined.filter(
    (b) => storedEnds.has(b.end) && !storedKeys.has(`${b.start}-${b.end}`),
  ).length;

  const updates = computeOfflineSerialUpdates(rows, refined);

  const before = holdoutExact(rows, stored);
  const after = holdoutExact(rows, refined);

  const s = seasonStats(t.season);
  s.collections++;
  s.blocks += blocks;
  s.snapped += snapped;
  s.updates += updates.length;
  s.holdout += before.total;
  s.exactBefore += before.exact;
  s.exactAfter += after.exact;

  if (blocks === 0 && snapped === 0 && updates.length === 0) return;
  s.changed++;

  const serialOf = new Map(rows.map((o) => [o.id, o.serial] as const));
  const deltas = updates.map((u) => u.newSerial - serialOf.get(u.id)!);
  const range = deltas.length > 0 ? ` Δ ${Math.min(...deltas)}..${Math.max(...deltas)}` : "";
  const truth =
    before.total > 0 ? ` | v1 holdout ${before.exact}→${after.exact}/${before.total}` : "";
  console.log(
    `[refine] ${t.slug}: +${blocks} block(s), ${snapped} snapped, ${updates.length} serial(s)${range}${truth}`,
  );

  if (!APPLY) return;

  await indexer.update(collections).set({ serialBatches: refined }).where(eq(collections.id, t.id));
  if (updates.length > 0) await writeSerialUpdates(updates);
}

await chunk(targets, CONCURRENCY, async (group) => {
  await Promise.all(group.map((t) => processOne(t)));
});

const pct = (n: number, d: number) => (d === 0 ? "-" : `${((100 * n) / d).toFixed(1)}%`);
console.table(
  [...bySeason.entries()]
    .toSorted(([a], [b]) => a.localeCompare(b))
    .map(([season, s]) => ({
      season,
      collections: s.collections,
      changed: s.changed,
      "blocks claimed": s.blocks,
      "batches snapped": s.snapped,
      [APPLY ? "serials updated" : "serials to update"]: s.updates,
      "v1 holdout exact before": pct(s.exactBefore, s.holdout),
      "v1 holdout exact after": pct(s.exactAfter, s.holdout),
    })),
);
process.exit(0);
