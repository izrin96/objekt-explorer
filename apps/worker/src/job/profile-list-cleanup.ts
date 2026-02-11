import { db } from "@repo/db";
import { indexer } from "@repo/db/indexer";
import { objekts } from "@repo/db/indexer/schema";
import { listEntries } from "@repo/db/schema";
import { inArray } from "drizzle-orm";

export async function cleanupProfileLists() {
  console.log("[Profile List Cleanup] Starting cleanup job");

  // Query all profile lists with their entries
  const profileLists = await db.query.lists.findMany({
    where: {
      listType: "profile",
    },
    columns: { id: true, profileAddress: true },
    with: {
      entries: {
        columns: { id: true, objektId: true },
      },
    },
  });

  if (profileLists.length === 0) {
    console.log("[Profile List Cleanup] No profile lists found");
    return;
  }

  console.log(`[Profile List Cleanup] Found ${profileLists.length} profile lists to check`);

  let totalEntriesRemoved = 0;

  // Process each list
  for (const list of profileLists) {
    const objektIds = list.entries.map((e) => e.objektId).filter(Boolean) as string[];

    if (objektIds.length === 0) continue;

    // Query indexer for current owners
    const currentObjekts = await indexer
      .select({ id: objekts.id, owner: objekts.owner })
      .from(objekts)
      .where(inArray(objekts.id, objektIds));

    // Find entries where owner doesn't match profile address
    const ownedSet = new Set(
      currentObjekts
        .filter((o) => o.owner.toLowerCase() === list.profileAddress!.toLowerCase())
        .map((o) => o.id),
    );

    const staleEntryIds = list.entries
      .filter((e) => e.objektId && !ownedSet.has(e.objektId))
      .map((e) => e.id);

    // Delete stale entries
    if (staleEntryIds.length > 0) {
      await db.delete(listEntries).where(inArray(listEntries.id, staleEntryIds));
      totalEntriesRemoved += staleEntryIds.length;
      console.log(
        `[Profile List Cleanup] Removed ${staleEntryIds.length} entries from list ${list.id}`,
      );
    }
  }

  console.log(
    `[Profile List Cleanup] Cleanup complete. Total entries removed: ${totalEntriesRemoved}`,
  );
}
