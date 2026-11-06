/**
 * Review the drop grid and the member grid (lib/drop-grid.ts) on every "A"
 * drop and member run of a block season, or of one season, or of one drop,
 * and apply them.
 *
 * Per drop it prints the verdict (fitted, ambiguous, unfitted), the slot size,
 * how many known serials (v1 serials and manual anchors inside the drop) the
 * stored ranges and the grid each reproduce with every anchor hidden, and the
 * serials the grid would change. Ambiguous and unfitted drops never change.
 * Member runs follow with the same report and two more verdicts: unpinned (the
 * token before the run is not a minted Z-collection token) and held (a
 * collection of the run sits in a fitted drop). Runs with more than 10 foreign
 * tokens inside are marked for a closer look.
 *
 * Dry run by default. APPLY=1 stores the fitted drops' ranges and rewrites
 * their serials, one transaction per drop, then does the same for the fitted
 * runs, one transaction per run.
 *
 *   bun run --env-file=../../.env src/script/drop-grid.ts
 *   bun run --env-file=../../.env src/script/drop-grid.ts Cream02
 *   bun run --env-file=../../.env src/script/drop-grid.ts Cream02 356A triples
 *   APPLY=1 bun run --env-file=../../.env src/script/drop-grid.ts Cream02 356A triples
 */
import { indexer } from "@repo/db/indexer";
import { collections, objekts } from "@repo/db/indexer/schema";
import { and, eq, inArray, like, notInArray } from "drizzle-orm";

import {
  type DropKey,
  type DropMember,
  loadDrop,
  loadMemberRuns,
  type MemberKey,
  writeSerialUpdates,
} from "@/job/serial-batches";
import { type DropGrid, fitDropGrid, fitMemberRun, mergeGridRanges } from "@/lib/drop-grid";
import { preBlockSeasons } from "@/lib/serial-constants";
import {
  computeOfflineSerials,
  computeOfflineSerialUpdates,
  V1_CUTOFF_MS,
} from "@/lib/serial-math";

const APPLY = process.env.APPLY === "1";
const CROWDED_RUN = 10;

type Batch = { start: number; end: number };
type Row = { id: string; serial: number; mintedAt: string };

const [season, collectionNo, artist] = process.argv.slice(2);

const aCollections = await indexer
  .selectDistinct({
    season: collections.season,
    collectionNo: collections.collectionNo,
    artist: collections.artist,
    member: collections.member,
  })
  .from(collections)
  .where(
    and(
      eq(collections.onOffline, "offline"),
      like(collections.collectionNo, "%A"),
      notInArray(collections.season, preBlockSeasons),
    ),
  );
const picked = aCollections.filter(
  (c) =>
    season === undefined ||
    (c.season === season &&
      (collectionNo === undefined || (c.collectionNo === collectionNo && c.artist === artist))),
);

const uniqueBy = (name: (k: (typeof picked)[number]) => string) =>
  [...new Map(picked.map((k) => [name(k), k])).values()].toSorted((a, b) =>
    name(a).localeCompare(name(b)),
  );
const dropName = (k: DropKey) => `${k.season} ${k.collectionNo} ${k.artist}`;
const memberName = (k: MemberKey) => `${k.season} ${k.artist} ${k.member}`;
const drops = uniqueBy(dropName);
const memberKeys = uniqueBy(memberName);

if (drops.length === 0) {
  console.error(`[drop-grid] no A drop matches ${process.argv.slice(2).join(" ")}`);
  process.exit(1);
}

console.log(
  `[drop-grid] ${APPLY ? "APPLY" : "DRY RUN"}: ${drops.length} drop(s), ${memberKeys.length} member(s)`,
);

// serials chained from the ranges alone, every anchor hidden
const chained = (rows: Row[], batches: Batch[]) =>
  new Map(computeOfflineSerials(rows, batches, 0, []).map((c) => [c.id, c.serial]));

const totals = {
  fitted: 0,
  ambiguous: 0,
  unfitted: 0,
  unpinned: 0,
  held: 0,
  known: 0,
  exactBefore: 0,
  exactAfter: 0,
  updates: 0,
  members: 0,
};
const unchecked: string[] = [];

/** Report one fitted drop or run and, under APPLY, write it. */
async function review(name: string, members: DropMember[], start: number, grid: DropGrid) {
  const span = { start, end: grid.end };
  const ids = members.map((m) => m.id);
  const rows = await indexer
    .select({
      id: objekts.id,
      serial: objekts.serial,
      mintedAt: objekts.mintedAt,
      collectionId: objekts.collectionId,
    })
    .from(objekts)
    .where(inArray(objekts.collectionId, ids));
  const anchorRows = await indexer
    .select({ id: collections.id, anchors: collections.serialAnchors })
    .from(collections)
    .where(inArray(collections.id, ids));
  const anchorsOf = new Map(anchorRows.map((r) => [r.id, r.anchors ?? []] as const));

  let known = 0;
  let exactBefore = 0;
  let exactAfter = 0;
  const writes: { id: string; batches: Batch[]; updates: { id: string; newSerial: number }[] }[] =
    [];
  const lines: string[] = [];

  for (const [i, m] of members.entries()) {
    const own = rows.filter((r) => r.collectionId === m.id);
    const anchors = anchorsOf.get(m.id) ?? [];
    const merged = mergeGridRanges(m.batches, grid.ranges[i]!, span, m.tokens);

    const truth = new Map<string, number>();
    for (const a of anchors) truth.set(String(a.tokenId), a.serial);
    for (const o of own) {
      if (o.serial > 0 && Date.parse(o.mintedAt) < V1_CUTOFF_MS) truth.set(o.id, o.serial);
    }
    const before = chained(own, m.batches);
    const after = chained(own, merged);
    for (const [id, serial] of truth) {
      const t = parseInt(id);
      if (t < span.start || t > span.end) continue;
      known++;
      if (before.get(id) === serial) exactBefore++;
      if (after.get(id) === serial) exactAfter++;
    }

    const updates = computeOfflineSerialUpdates(own, merged, anchors);
    const rangesChange =
      merged.length !== m.batches.length ||
      merged.some((b, j) => b.start !== m.batches[j]!.start || b.end !== m.batches[j]!.end);
    if (!rangesChange && updates.length === 0) continue;
    writes.push({ id: m.id, batches: merged, updates });
    if (updates.length === 0) continue;
    const serialOf = new Map(own.map((o) => [o.id, o.serial] as const));
    const deltas = updates.map((u) => u.newSerial - serialOf.get(u.id)!);
    lines.push(
      `  ${m.slug}: ${updates.length} serial(s) Δ ${Math.min(...deltas)}..${Math.max(...deltas)}`,
    );
  }

  const changes = writes.reduce((n, w) => n + w.updates.length, 0);
  totals.known += known;
  totals.exactBefore += exactBefore;
  totals.exactAfter += exactAfter;
  totals.updates += changes;
  totals.members += writes.length;
  if (known === 0 && changes > 0) unchecked.push(name);

  console.log(
    `[drop-grid] ${name}: fitted, slot ${grid.slot}, ${grid.separators} separator(s), tokens ${span.start}-${span.end} | known ${exactBefore}→${exactAfter}/${known} | ${writes.length} member(s) with new ranges, ${changes} serial(s) to change`,
  );
  for (const line of lines) console.log(line);

  if (!APPLY || writes.length === 0) return;
  await indexer.transaction(async (tx) => {
    for (const w of writes) {
      await tx
        .update(collections)
        .set({ serialBatches: w.batches })
        .where(eq(collections.id, w.id));
      await writeSerialUpdates(w.updates, tx);
    }
  });
}

for (const key of drops) {
  const name = dropName(key);
  const drop = await loadDrop(key);
  const { slots, grid } = drop ? fitDropGrid(drop.region) : { slots: [], grid: null };
  if (!drop || !grid) {
    const verdict = slots.length > 1 ? "ambiguous" : "unfitted";
    totals[verdict]++;
    console.log(
      `[drop-grid] ${name}: ${verdict}${slots.length > 1 ? `, slots ${slots.slice(0, 5).join(", ")}` : ""}`,
    );
    continue;
  }
  totals.fitted++;
  await review(name, drop.members, drop.region.start, grid);
}

for (const key of memberKeys) {
  for (const run of await loadMemberRuns(key)) {
    const nos = await collectionNos(run.members.map((m) => m.id));
    if (collectionNo !== undefined && !nos.includes(collectionNo)) continue;
    const name = `${memberName(key)} [${nos.join(", ")}]`;
    const { slots, grid } = fitMemberRun(run.region);
    const verdict = run.heldByDrop
      ? "held"
      : !grid
        ? slots.length > 1
          ? "ambiguous"
          : "unfitted"
        : !run.pinned
          ? "unpinned"
          : "fitted";
    if (verdict !== "fitted" || !grid) {
      totals[verdict]++;
      console.log(
        `[drop-grid] run ${name}: ${verdict}${grid ? `, slot ${grid.slot}` : ""}${slots.length > 1 ? `, slots ${slots.slice(0, 5).join(", ")}` : ""}`,
      );
      continue;
    }
    totals.fitted++;
    if (grid.separators > CROWDED_RUN) {
      console.log(`[drop-grid] run ${name}: ${grid.separators} foreign tokens inside, check it`);
    }
    await review(`run ${name}`, run.members, run.region.start, grid);
  }
}

async function collectionNos(ids: string[]) {
  const rows = await indexer
    .select({ id: collections.id, no: collections.collectionNo })
    .from(collections)
    .where(inArray(collections.id, ids));
  const noOf = new Map(rows.map((r) => [r.id, r.no] as const));
  return ids.map((id) => noOf.get(id)!);
}

console.table([
  {
    fitted: totals.fitted,
    ambiguous: totals.ambiguous,
    unfitted: totals.unfitted,
    unpinned: totals.unpinned,
    held: totals.held,
    "known exact before": `${totals.exactBefore}/${totals.known}`,
    "known exact after": `${totals.exactAfter}/${totals.known}`,
    [APPLY ? "members rewritten" : "members to rewrite"]: totals.members,
    [APPLY ? "serials updated" : "serials to update"]: totals.updates,
  },
]);
if (unchecked.length > 0) {
  console.log(`[drop-grid] fitted with no known serial to check: ${unchecked.join("; ")}`);
}
process.exit(0);
