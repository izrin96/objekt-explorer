import { indexer } from "@repo/db/indexer";
import { collections, objekts } from "@repo/db/indexer/schema";
import { and, asc, eq, gt, gte, inArray, notInArray, sql } from "drizzle-orm";

import { V1_CUTOFF_MS } from "../job/populate-serial";

// pre-assigned collections calculate serial by tokenId, not sequentially —
// exclude them so they don't show up as false gaps. mirrors populate-serial.ts
const excludeCollections = [
  "cream02-jiyeon-315z",
  "cream02-kotone-315z",
  "cream02-hayeon-315z",
  "cream02-jiwoo-315z",
  "cream02-xinyu-315z",
  "cream02-yeonji-315z",
];

const excludeSlugs = ["empty-collection", ...excludeCollections];

// write to prod only when explicitly asked. default dry-run: print the plan.
const APPLY = process.argv.includes("--apply");

const DB_BATCH_SIZE = 500;

type ObjektRow = { id: string; serial: number; mintedAt: string };

async function main() {
  console.log(
    APPLY
      ? "[detect-serial-gaps] APPLY mode — will WRITE"
      : "[detect-serial-gaps] dry-run (pass --apply to write)",
  );

  const onlineCollections = await indexer
    .selectDistinctOn([collections.id], { id: collections.id, slug: collections.slug })
    .from(collections)
    .innerJoin(objekts, eq(objekts.collectionId, collections.id))
    .where(
      and(
        eq(collections.onOffline, "online"),
        notInArray(collections.slug, excludeSlugs),
        gte(collections.createdAt, "2026-06-04T08:07:02.000Z"),
      ),
    );

  console.log(`[detect-serial-gaps] Scanning ${onlineCollections.length} online collections`);

  let collectionsWithGaps = 0;
  let collectionsWithDupes = 0;
  let totalMissing = 0;
  let cleanCollections = 0;
  let collectionsFixed = 0;
  let totalUpdated = 0;
  let totalAnomalies = 0;

  for (const { id, slug } of onlineCollections) {
    // serial > 0 only — serial 0 means "not yet assigned by the job" (still
    // within the delay window), which is expected and not a gap.
    const rows: ObjektRow[] = await indexer
      .select({ id: objekts.id, serial: objekts.serial, mintedAt: objekts.mintedAt })
      .from(objekts)
      .where(and(eq(objekts.collectionId, id), gt(objekts.serial, 0)))
      .orderBy(asc(objekts.serial));

    if (rows.length === 0) continue;

    // count occurrences to catch duplicate serials (another symptom of the
    // old skip bug)
    const counts = new Map<number, number>();
    for (const r of rows) counts.set(r.serial, (counts.get(r.serial) ?? 0) + 1);

    const serials = [...counts.keys()].sort((a, b) => a - b);
    const min = serials[0]!;
    const max = serials[serials.length - 1]!;

    const present = new Set(serials);
    const missing: number[] = [];
    for (let s = min; s <= max; s++) {
      if (!present.has(s)) missing.push(s);
    }

    const duplicates = [...counts.entries()].filter(([, c]) => c > 1);

    if (missing.length === 0 && duplicates.length === 0) {
      cleanCollections++;
      continue;
    }

    if (missing.length > 0) {
      collectionsWithGaps++;
      totalMissing += missing.length;
    }
    if (duplicates.length > 0) collectionsWithDupes++;

    console.log(`\n[${slug}] serials ${min}..${max} (${rows.length} assigned)`);
    if (missing.length > 0) {
      console.log(`  ⚠ ${missing.length} missing: ${formatRanges(missing)}`);
    }
    if (duplicates.length > 0) {
      console.log(`  ⚠ ${duplicates.length} duplicate serial(s):`);
      for (const [serial, count] of duplicates) {
        console.log(`     serial ${serial} → ${count} objekts`);
      }
    }

    // ---- compute the fix -------------------------------------------------
    // online serial = 1-based rank by tokenId (mirrors populate-serial's mint
    // position). re-ranking the assigned objekts collapses gaps and splits
    // duplicates into distinct serials.
    const { updates, anomalies } = computeFix(rows);

    if (anomalies.length > 0) {
      totalAnomalies += anomalies.length;
      console.log(
        `  ✋ ${anomalies.length} pre-cutoff anomaly(ies) — NOT touched (authoritative v1 serial):`,
      );
      for (const a of anomalies) {
        console.log(`     token ${a.id}: serial ${a.serial} but rank says ${a.rank}`);
      }
    }

    if (updates.length === 0) {
      console.log(`  (no post-cutoff serials to change)`);
      continue;
    }

    console.log(`  🔧 ${updates.length} objekt(s) to re-serial:`);
    for (const u of updates.slice(0, 20)) {
      console.log(`     token ${u.id}: ${u.oldSerial} → ${u.newSerial}`);
    }
    if (updates.length > 20) console.log(`     … +${updates.length - 20} more`);

    if (APPLY) {
      await applyUpdates(updates);
      collectionsFixed++;
      totalUpdated += updates.length;
      console.log(`  ✅ applied ${updates.length} update(s)`);
    }
  }

  console.log(`\n=== Summary ===`);
  console.log(`Collections scanned:    ${onlineCollections.length}`);
  console.log(`Clean (no gaps/dupes):  ${cleanCollections}`);
  console.log(`Collections with gaps:  ${collectionsWithGaps} (${totalMissing} missing serials)`);
  console.log(`Collections with dupes: ${collectionsWithDupes}`);
  console.log(`Pre-cutoff anomalies:   ${totalAnomalies} (skipped, need manual review)`);
  if (APPLY) {
    console.log(`Collections fixed:      ${collectionsFixed} (${totalUpdated} serials rewritten)`);
  } else {
    console.log(`(dry-run — nothing written. re-run with --apply to fix)`);
  }

  if (collectionsWithGaps === 0 && collectionsWithDupes === 0) {
    console.log("\n✅ No serial gaps or duplicates detected.");
  }
}

/**
 * Compute the canonical serial for every assigned objekt as its 1-based rank in
 * tokenId order, then diff against the stored serial.
 *
 * Splits into:
 *  - updates: post-cutoff objekts (or serial changes that don't touch a v1
 *    serial) whose stored serial differs from the computed rank.
 *  - anomalies: pre-cutoff objekts whose authoritative v1 serial disagrees with
 *    the rank. These are NEVER written — a mismatch means either a data problem
 *    or a bad assumption, and v1 serials are ground truth. Surfaced for manual
 *    review.
 */
function computeFix(rows: ObjektRow[]): {
  updates: { id: string; oldSerial: number; newSerial: number }[];
  anomalies: { id: string; serial: number; rank: number }[];
} {
  const sorted = rows.toSorted((a, b) => parseInt(a.id) - parseInt(b.id));

  const updates: { id: string; oldSerial: number; newSerial: number }[] = [];
  const anomalies: { id: string; serial: number; rank: number }[] = [];

  sorted.forEach((obj, idx) => {
    const rank = idx + 1;
    if (rank === obj.serial) return;

    const isPreCutoff = Date.parse(obj.mintedAt) < V1_CUTOFF_MS;
    if (isPreCutoff) {
      anomalies.push({ id: obj.id, serial: obj.serial, rank });
      return;
    }
    updates.push({ id: obj.id, oldSerial: obj.serial, newSerial: rank });
  });

  return { updates, anomalies };
}

/**
 * Write serials in chunks using the same CASE-per-id transaction pattern as
 * populate-serial.ts.
 */
async function applyUpdates(updates: { id: string; newSerial: number }[]) {
  await indexer.transaction(async (tx) => {
    for (let i = 0; i < updates.length; i += DB_BATCH_SIZE) {
      const batch = updates.slice(i, i + DB_BATCH_SIZE);
      const ids = batch.map((u) => u.id);
      const caseExpr = batch
        .map((u) => sql`WHEN ${u.id} THEN ${u.newSerial}`)
        .reduce((acc, curr) => sql`${acc} ${curr}`, sql``);
      await tx
        .update(objekts)
        .set({ serial: sql`(CASE id ${caseExpr} END)::int` })
        .where(inArray(objekts.id, ids));
    }
  });
}

// collapse consecutive serials into ranges: [146,150,151,152] → "146,150-152"
function formatRanges(serials: number[]): string {
  const ranges: string[] = [];
  let start = serials[0]!;
  let prev = start;

  for (let i = 1; i < serials.length; i++) {
    const s = serials[i]!;
    if (s === prev + 1) {
      prev = s;
      continue;
    }
    ranges.push(start === prev ? `${start}` : `${start}-${prev}`);
    start = s;
    prev = s;
  }
  ranges.push(start === prev ? `${start}` : `${start}-${prev}`);

  return ranges.join(",");
}

await main();
