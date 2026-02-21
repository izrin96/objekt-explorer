import { db } from "@repo/db";
import { indexer } from "@repo/db/indexer";
import { objekts } from "@repo/db/indexer/schema";
import { listEntries, lists } from "@repo/db/schema";
import {
  removeObjektFromProfileLists,
  setProfileLists,
  getProfileLists,
} from "@repo/lib/server/redis-profile-lists";
import { RedisClient } from "bun";
import { inArray, eq, and } from "drizzle-orm";

const redisPubSubUrl = process.env.REDIS_PUBSUB_URL;
const redisPubSub = redisPubSubUrl ? new RedisClient(redisPubSubUrl) : null;

type TransferData = {
  from: string;
  to: string;
  tokenId: string;
  objekt: {
    id: string;
  };
};

void (async () => {
  if (!redisPubSub) {
    console.warn("[Profile List Cleanup] REDIS_PUBSUB_URL not set, skipping subscription");
    return;
  }

  console.log("[Profile List Cleanup] Subscribing to transfers channel");

  await redisPubSub.subscribe("transfers", async (message, channel) => {
    if (channel === "transfers") {
      try {
        const transfers = JSON.parse(message) as TransferData[];
        await handleTransfers(transfers);
      } catch (error) {
        console.error("[Profile List Cleanup] Error processing transfers:", error);
      }
    }
  });
})();

async function handleTransfers(transfers: TransferData[]) {
  const addressToObjektIds = new Map<string, string[]>();

  for (const transfer of transfers) {
    const from = transfer.from.toLowerCase();
    const to = transfer.to.toLowerCase();
    const objektId = transfer.objekt?.id;

    if (!objektId) continue;

    if (from === to) continue;

    if (!addressToObjektIds.has(from)) {
      addressToObjektIds.set(from, []);
    }
    addressToObjektIds.get(from)!.push(objektId);
  }

  await Promise.all(
    Array.from(addressToObjektIds.entries()).map(async ([address, objektIds]) => {
      try {
        await cleanupProfileListOnTransfer(address, objektIds);
      } catch (error) {
        console.error(`[Profile List Cleanup] Error cleaning up for ${address}:`, error);
      }
    }),
  );
}

async function cleanupProfileListOnTransfer(address: string, objektIds: string[]) {
  const cachedLists = await getProfileLists(address);

  if (!cachedLists || cachedLists.length === 0) {
    return;
  }

  const objektIdSet = new Set(cachedLists.flatMap((l) => l.objektIds));
  const objektIdsToCleanup = objektIds.filter((id) => objektIdSet.has(id));

  if (objektIdsToCleanup.length === 0) {
    return;
  }

  console.log(
    `[Profile List Cleanup] Processing transfer out for ${address}: ${objektIdsToCleanup.join(", ")}`,
  );

  await removeObjektFromProfileLists(address, objektIdsToCleanup);

  // Also delete from DB to ensure consistency
  // Only cleanup profile lists (listType = "profile")
  const entriesToRemove = await db
    .select({ id: listEntries.id })
    .from(listEntries)
    .innerJoin(lists, eq(lists.id, listEntries.listId))
    .where(and(inArray(listEntries.objektId, objektIdsToCleanup), eq(lists.listType, "profile")));

  if (entriesToRemove.length > 0) {
    await db.delete(listEntries).where(
      inArray(
        listEntries.id,
        entriesToRemove.map((e) => e.id),
      ),
    );

    console.log(
      `[Profile List Cleanup] Removed ${entriesToRemove.length} entries from profile lists for ${address}`,
    );
  }
}

export async function cleanupProfileLists() {
  console.log("[Profile List Cleanup] Starting cleanup job");

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

  // Collect all unique objektIds across all lists
  const allObjektIds = new Set<string>();
  for (const list of profileLists) {
    for (const entry of list.entries) {
      if (entry.objektId) allObjektIds.add(entry.objektId);
    }
  }

  if (allObjektIds.size === 0) {
    console.log("[Profile List Cleanup] No objekt IDs to check");
    return;
  }

  // Single batch query to indexer
  const currentObjekts = await indexer
    .select({ id: objekts.id, owner: objekts.owner })
    .from(objekts)
    .where(inArray(objekts.id, Array.from(allObjektIds)));

  // Build a map of objektId -> owner (lowercase)
  const objektOwnerMap = new Map<string, string>();
  for (const obj of currentObjekts) {
    objektOwnerMap.set(obj.id, obj.owner.toLowerCase());
  }

  let totalEntriesRemoved = 0;

  for (const list of profileLists) {
    if (!list.profileAddress) continue;

    const profileAddressLower = list.profileAddress.toLowerCase();

    const staleEntryIds = list.entries
      .filter((e) => {
        if (!e.objektId) return false;
        const owner = objektOwnerMap.get(e.objektId);
        // If owner doesn't exist in map (objekt burned/removed) or owner is different
        return !owner || owner !== profileAddressLower;
      })
      .map((e) => e.id);

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

export async function syncProfileListsToCache() {
  console.log("[Profile List Cache] Syncing profile lists to Redis");

  const profileLists = await db.query.lists.findMany({
    where: {
      listType: "profile",
    },
    columns: { id: true, profileAddress: true },
    with: {
      entries: {
        columns: { objektId: true },
      },
    },
  });

  if (profileLists.length === 0) {
    console.log("[Profile List Cache] No profile lists found");
    return;
  }

  const addressToLists = new Map<
    string,
    { listId: number; profileAddress: string; objektIds: string[] }[]
  >();

  for (const list of profileLists) {
    if (!list.profileAddress) continue;

    const normalizedAddress = list.profileAddress.toLowerCase();
    const objektIds = list.entries.map((e) => e.objektId).filter(Boolean) as string[];

    if (!addressToLists.has(normalizedAddress)) {
      addressToLists.set(normalizedAddress, []);
    }

    addressToLists.get(normalizedAddress)!.push({
      listId: list.id,
      profileAddress: normalizedAddress,
      objektIds,
    });
  }

  for (const [address, listsData] of addressToLists) {
    await setProfileLists(address, listsData);
    console.log(`[Profile List Cache] Cached ${listsData.length} lists for ${address}`);
  }

  console.log("[Profile List Cache] Sync complete");
}
