import { indexer } from "@repo/db/indexer";
import { collections, objekts } from "@repo/db/indexer/schema";
import { and, asc, eq, gt, gte, notInArray } from "drizzle-orm";

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

async function main() {
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

  for (const { id, slug } of onlineCollections) {
    // serial > 0 only — serial 0 means "not yet assigned by the job" (still
    // within the delay window), which is expected and not a gap.
    const rows = await indexer
      .select({ serial: objekts.serial })
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
  }

  console.log(`\n=== Summary ===`);
  console.log(`Collections scanned:    ${onlineCollections.length}`);
  console.log(`Clean (no gaps/dupes):  ${cleanCollections}`);
  console.log(`Collections with gaps:  ${collectionsWithGaps} (${totalMissing} missing serials)`);
  console.log(`Collections with dupes: ${collectionsWithDupes}`);

  if (collectionsWithGaps === 0 && collectionsWithDupes === 0) {
    console.log("\n✅ No serial gaps or duplicates detected.");
  }
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
