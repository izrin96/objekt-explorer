import { indexer } from "@repo/db/indexer";
import { collections, objekts } from "@repo/db/indexer/schema";
import { and, eq, inArray, notInArray, sql } from "drizzle-orm";

import { computeOnlineSerials, V1_CUTOFF_MS } from "@/job/populate-serial";
import { preAssignedCollections as excludeCollections } from "@/lib/serial-constants";

const excludeSlugs = ["empty-collection", ...excludeCollections];

// write to prod only when explicitly asked. default dry-run: print the plan.
const APPLY = process.argv.includes("--apply");

const DB_BATCH_SIZE = 500;

type ObjektRow = { id: string; serial: number; mintedAt: string };

/**
 * One-off backlog sweep that heals ONLINE serials across every collection, using
 * the same rule as the populate-serial job (computeOnlineSerials):
 *  - serial = tokenId rank;
 *  - PRE-cutoff serials are trusted and never changed;
 *  - only POST-cutoff serials that differ from their tokenId rank are rewritten.
 *
 * The job self-heals a collection only when it gets a new serial-0 mint; this
 * script covers collections that drifted but have no pending mint to trigger the
 * job. Default dry-run; `--apply` writes.
 */
async function main() {
  console.log(
    APPLY
      ? "[check-serial-order] APPLY mode — will WRITE"
      : "[check-serial-order] dry-run (pass --apply to write)",
  );

  const onlineCollections = await indexer
    .select({ id: collections.id, slug: collections.slug })
    .from(collections)
    .where(and(eq(collections.onOffline, "online"), notInArray(collections.slug, excludeSlugs)));

  console.log(`[check-serial-order] Scanning ${onlineCollections.length} online collections`);

  let cleanCollections = 0;
  let collectionsFlagged = 0;
  let collectionsFixed = 0;
  let totalUpdated = 0;

  let scanned = 0;
  for (const { id, slug } of onlineCollections) {
    scanned++;
    if (scanned % 100 === 0 || scanned === onlineCollections.length) {
      console.log(`[check-serial-order] progress ${scanned}/${onlineCollections.length}`);
    }

    // all objekts (serial 0 included) after a short mint delay, so a pending tail
    // mint isn't serialized prematurely — mirrors the job.
    const rows: ObjektRow[] = await indexer
      .select({ id: objekts.id, serial: objekts.serial, mintedAt: objekts.mintedAt })
      .from(objekts)
      .where(
        and(
          eq(objekts.collectionId, id),
          sql`${objekts.mintedAt} <= ${new Date(Date.now() - 120 * 1000).toISOString()}`,
        ),
      );

    if (rows.length === 0) continue;

    const sorted = rows.toSorted((a, b) => parseInt(a.id) - parseInt(b.id));
    const isNew = sorted.every((o) => o.serial === 0);
    const headSkip = !isNew && sorted[0]!.serial === 0;

    const { updates } = computeOnlineSerials(sorted, V1_CUTOFF_MS, headSkip);

    if (updates.length === 0) {
      cleanCollections++;
      continue;
    }

    collectionsFlagged++;
    const byId = new Map(sorted.map((o) => [o.id, o.serial] as const));

    console.log(`\n[${slug}] (${sorted.length} objekts)`);
    console.log(`  🔧 ${updates.length} objekt(s) to re-serial:`);
    for (const u of updates.slice(0, 20)) {
      console.log(`     token ${u.id}: ${byId.get(u.id)} → ${u.newSerial}`);
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
  console.log(`Collections scanned:  ${onlineCollections.length}`);
  console.log(`Clean (no changes):   ${cleanCollections}`);
  console.log(`Collections flagged:  ${collectionsFlagged}`);
  if (APPLY) {
    console.log(`Collections fixed:    ${collectionsFixed} (${totalUpdated} serials rewritten)`);
  } else {
    console.log(`(dry-run — nothing written. re-run with --apply to fix)`);
  }

  if (collectionsFlagged === 0) {
    console.log("\n✅ All online post-cutoff serials already match tokenId rank.");
  }
}

/**
 * Write serials in chunks using the same CASE-per-id transaction pattern as
 * populate-serial.ts. Atomic per collection.
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

await main();
