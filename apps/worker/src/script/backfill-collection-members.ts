/**
 * One-time backfill of `collection.members` for Unit collections.
 *
 * The members migration seeds every row with `ARRAY[member]`. That is already
 * correct for single-member collections, but Unit collections store a combined
 * member string (e.g. "id1 X id2") that is not a real member name, so filtering
 * by an individual member never matches them. This script refetches v3 metadata
 * for one token per Unit collection and writes the individual member names.
 *
 * Resumes by default: collections that already have more than one member are
 * skipped. FORCE=1 reprocesses all Unit collections. DRY_RUN=1 previews without
 * writing.
 *
 *   DRY_RUN=1 bun run --env-file=../../.env src/script/backfill-collection-members.ts
 *   bun run --env-file=../../.env src/script/backfill-collection-members.ts
 *
 * Requires the members migration to be applied first.
 */
import { fetchMetadataV3, getMembers } from "@repo/cosmo/server/metadata";
import { indexer } from "@repo/db/indexer";
import { collections, objekts } from "@repo/db/indexer/schema";
import { chunk } from "@repo/lib";
import { and, eq, sql } from "drizzle-orm";

const CONCURRENCY = 5;
const DRY_RUN = process.env.DRY_RUN === "1";
const FORCE = process.env.FORCE === "1";

const targets = await indexer
  .selectDistinctOn([collections.id], {
    id: collections.id,
    slug: collections.slug,
    members: collections.members,
    tokenId: objekts.id,
  })
  .from(collections)
  .innerJoin(objekts, eq(objekts.collectionId, collections.id))
  .where(
    and(
      eq(collections.class, "Unit"),
      FORCE ? undefined : sql`cardinality(${collections.members}) <= 1`,
    ),
  );

console.log(
  `[backfill members] ${DRY_RUN ? "DRY RUN — " : ""}${FORCE ? "FORCE — all" : "resume — remaining"} ${targets.length} Unit collections`,
);

let updated = 0;
const failed: string[] = [];

type Target = (typeof targets)[number];

async function processOne(t: Target) {
  let members: string[];
  try {
    members = getMembers(await fetchMetadataV3(t.tokenId));
  } catch {
    console.log(`[backfill members] ${t.slug}: API error, skipping`);
    failed.push(t.slug);
    return;
  }

  // a Unit collection resolves to its individual members plus the combined name,
  // so at least one entry must be an individual name; if the metadata carried
  // only the combined one, writing it would be no better than the seeded value
  if (!members.some((m) => !m.toLowerCase().includes(" x "))) {
    console.log(
      `[backfill members] ${t.slug}: no individual members in [${members.join(", ")}], skipping`,
    );
    failed.push(t.slug);
    return;
  }

  console.log(`[backfill members] ${t.slug}: [${t.members.join(", ")}] -> [${members.join(", ")}]`);
  updated++;

  if (DRY_RUN) return;

  await indexer.update(collections).set({ members }).where(eq(collections.id, t.id));
}

await chunk(targets, CONCURRENCY, async (group) => {
  await Promise.all(group.map((t) => processOne(t)));
});

console.log(
  `[backfill members] Done. ${DRY_RUN ? "Would update" : "Updated"} ${updated} collections.` +
    (failed.length ? ` Skipped: ${failed.length} — ${failed.join(", ")}` : ""),
);
process.exit(0);
