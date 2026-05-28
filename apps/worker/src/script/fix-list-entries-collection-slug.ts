import { db } from "@repo/db";
import { indexer } from "@repo/db/indexer";
import { objekts, collections } from "@repo/db/indexer/schema";
import { listEntries } from "@repo/db/schema";
import { isNull, isNotNull, and, eq, inArray } from "drizzle-orm";

const BATCH_SIZE = 500;

async function fixListEntriesCollectionSlug() {
  console.log("Finding listEntries with objektId but missing collectionSlug...");

  const entries = await db
    .select({
      id: listEntries.id,
      objektId: listEntries.objektId,
    })
    .from(listEntries)
    .where(and(isNull(listEntries.collectionSlug), isNotNull(listEntries.objektId)));

  if (entries.length === 0) {
    console.log("No entries need fixing.");
    return;
  }

  console.log(`Found ${entries.length} entries to fix.`);

  const objektIds = [...new Set(entries.map((e) => e.objektId!))];

  // Look up collection slugs from the indexer database
  const objektCollectionMap = new Map<string, string>();

  for (let i = 0; i < objektIds.length; i += BATCH_SIZE) {
    const batch = objektIds.slice(i, i + BATCH_SIZE);
    console.log(
      `Looking up collections for objekts ${i + 1}-${Math.min(i + BATCH_SIZE, objektIds.length)} of ${objektIds.length}...`,
    );

    const results = await indexer
      .select({
        objektId: objekts.id,
        slug: collections.slug,
      })
      .from(objekts)
      .innerJoin(collections, eq(objekts.collectionId, collections.id))
      .where(inArray(objekts.id, batch));

    for (const r of results) {
      objektCollectionMap.set(r.objektId, r.slug);
    }
  }

  // Build updates
  const updates: { id: number; collectionSlug: string }[] = [];
  const missing: { id: number; objektId: string }[] = [];

  for (const entry of entries) {
    const slug = objektCollectionMap.get(entry.objektId!);
    if (slug) {
      updates.push({ id: entry.id, collectionSlug: slug });
    } else {
      missing.push({ id: entry.id, objektId: entry.objektId! });
    }
  }

  if (missing.length > 0) {
    console.log(
      `\nWarning: ${missing.length} entries could not be resolved (objekt not found in indexer):`,
    );
    for (const m of missing.slice(0, 10)) {
      console.log(`  - entry ${m.id}: objektId ${m.objektId}`);
    }
    if (missing.length > 10) {
      console.log(`  ... and ${missing.length - 10} more`);
    }
  }

  if (updates.length === 0) {
    console.log("No updates to apply.");
    return;
  }

  // Apply updates in batches
  let updated = 0;
  for (let i = 0; i < updates.length; i += BATCH_SIZE) {
    const batch = updates.slice(i, i + BATCH_SIZE);
    console.log(
      `Updating entries ${i + 1}-${Math.min(i + BATCH_SIZE, updates.length)} of ${updates.length}...`,
    );

    for (const u of batch) {
      await db
        .update(listEntries)
        .set({ collectionSlug: u.collectionSlug })
        .where(eq(listEntries.id, u.id));
      updated++;
    }
  }

  console.log(`\nDone. Updated ${updated} entries, ${missing.length} could not be resolved.`);
}

await fixListEntriesCollectionSlug();
