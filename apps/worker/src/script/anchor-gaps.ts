/**
 * Where stored ranges disagree with their anchors (`anchorGaps`): an anchored
 * range that starts at another serial than the ranges before it add up to.
 * Serials inside an anchored range are right either way. A gap after
 * anchorless ranges is the measured error of the serials chained through
 * them, which trade surfaces show as estimates; those are listed one by one.
 * A gap between two anchored ranges only counts in the table: it shows a
 * boundary the range rules got wrong.
 *
 * Read-only. One season, or all of them:
 *
 *   bun run --env-file=../../.env src/script/anchor-gaps.ts [season]
 */
import { indexer } from "@repo/db/indexer";
import { collections, objekts } from "@repo/db/indexer/schema";
import { chunk } from "@repo/lib";
import { and, asc, eq, inArray, isNotNull, or } from "drizzle-orm";

import { preAssignedCollections } from "@/lib/serial-constants";
import { anchorGaps, V1_CUTOFF_MS } from "@/lib/serial-math";

const CONCURRENCY = 5;
const season = process.argv[2];

const targets = await indexer
  .select({
    id: collections.id,
    slug: collections.slug,
    season: collections.season,
    batches: collections.serialBatches,
    anchors: collections.serialAnchors,
  })
  .from(collections)
  .where(
    and(
      or(eq(collections.onOffline, "offline"), inArray(collections.slug, preAssignedCollections)),
      isNotNull(collections.serialBatches),
      season ? eq(collections.season, season) : undefined,
    ),
  )
  .orderBy(asc(collections.slug));

type SeasonStats = {
  collections: number;
  withGap: number;
  betweenAnchors: number;
  afterChain: number;
  chainedObjekts: number;
  largest: number;
};
const bySeason = new Map<string, SeasonStats>();

async function processOne(t: (typeof targets)[number]) {
  const batches = t.batches ?? [];
  if (batches.length === 0) return;
  const rows = await indexer
    .select({ id: objekts.id, serial: objekts.serial, mintedAt: objekts.mintedAt })
    .from(objekts)
    .where(eq(objekts.collectionId, t.id));

  let s = bySeason.get(t.season);
  if (!s) {
    s = {
      collections: 0,
      withGap: 0,
      betweenAnchors: 0,
      afterChain: 0,
      chainedObjekts: 0,
      largest: 0,
    };
    bySeason.set(t.season, s);
  }
  s.collections++;

  const gaps = anchorGaps(rows, batches, t.anchors ?? []);
  if (gaps.length === 0) return;
  s.withGap++;

  const postCutoff = rows
    .filter((o) => Date.parse(o.mintedAt) >= V1_CUTOFF_MS)
    .map((o) => parseInt(o.id));
  for (const g of gaps) {
    s.largest = Math.max(s.largest, Math.abs(g.gap));
    if (g.chained === 0) {
      s.betweenAnchors++;
      continue;
    }
    s.afterChain++;
    const from = batches[g.batch - g.chained]!.start;
    const to = batches[g.batch - 1]!.end;
    const shown = postCutoff.filter((tid) => tid >= from && tid <= to).length;
    s.chainedObjekts += shown;
    console.log(
      `[anchor-gaps] ${t.slug}: range ${g.batch + 1} of ${batches.length} starts ${g.gap > 0 ? "+" : ""}${g.gap} from the chain, after ${g.chained} anchorless range(s) holding ${shown} objekt(s), tokens ${from}-${to}`,
    );
  }
}

await chunk(targets, CONCURRENCY, async (group) => {
  await Promise.all(group.map((t) => processOne(t)));
});

console.table(
  [...bySeason.entries()]
    .toSorted(([a], [b]) => a.localeCompare(b))
    .map(([name, s]) => ({
      season: name,
      collections: s.collections,
      "with a gap": s.withGap,
      "gaps between anchors": s.betweenAnchors,
      "gaps after a chain": s.afterChain,
      "objekts chained through one": s.chainedObjekts,
      "largest gap": s.largest,
    })),
);
process.exit(0);
