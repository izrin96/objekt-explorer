import { db } from "@repo/db";
import { indexer } from "@repo/db/indexer";
import { type ListEventOutbox, listEventOutbox, objekts } from "@repo/db/indexer/schema";
import { listEntries, lists, lockedObjekts, pins } from "@repo/db/schema";
import { and, asc, eq, inArray } from "drizzle-orm";

const BATCH_SIZE = 1000;

export async function drainOutbox() {
  console.log("[Outbox Drain] Starting outbox drain");

  const batch = await indexer
    .select()
    .from(listEventOutbox)
    .orderBy(asc(listEventOutbox.createdAt))
    .limit(BATCH_SIZE);

  if (batch.length === 0) {
    console.log("[Outbox Drain] No events to process");
    return;
  }

  await processBatch(batch);

  await indexer.delete(listEventOutbox).where(
    inArray(
      listEventOutbox.id,
      batch.map((row) => row.id),
    ),
  );

  console.log(`[Outbox Drain] Processed ${batch.length} events`);
}

async function processBatch(events: ListEventOutbox[]) {
  // Group events by fromAddress for efficient batch processing
  const addressToTokenIds = new Map<string, Set<string>>();

  for (const event of events) {
    const from = event.fromAddress.toLowerCase();
    const tokenId = event.tokenId;

    if (!addressToTokenIds.has(from)) {
      addressToTokenIds.set(from, new Set());
    }
    addressToTokenIds.get(from)!.add(tokenId);
  }

  // Process each address
  await Promise.all(
    Array.from(addressToTokenIds.entries()).map(async ([address, tokenIdSet]) => {
      try {
        await cleanupAddress(address, Array.from(tokenIdSet));
      } catch (error) {
        console.error(`[Outbox Drain] Error cleaning up for ${address}:`, error);
      }
    }),
  );
}

async function cleanupAddress(fromAddress: string, tokenIds: string[]) {
  // 1. Clean up profile-bound list entries
  await cleanupProfileListEntries(fromAddress, tokenIds);

  // 2. Clean up pins
  await cleanupPins(fromAddress, tokenIds);

  // 3. Clean up locked objekts
  await cleanupLockedObjekts(fromAddress, tokenIds);
}

async function cleanupProfileListEntries(fromAddress: string, tokenIds: string[]) {
  // Find profile-bound lists for this address
  const profileLists = await db
    .select({ id: lists.id })
    .from(lists)
    .where(and(eq(lists.profileAddress, fromAddress), eq(lists.isProfileBind, true)));

  if (profileLists.length === 0) return;

  const listIds = profileLists.map((l) => l.id);

  // Find matching list entries (objektId matches tokenIds)
  const entriesToRemove = await db
    .select({ id: listEntries.id })
    .from(listEntries)
    .where(and(inArray(listEntries.listId, listIds), inArray(listEntries.objektId, tokenIds)));

  if (entriesToRemove.length > 0) {
    await db.delete(listEntries).where(
      inArray(
        listEntries.id,
        entriesToRemove.map((e) => e.id),
      ),
    );
    console.log(`[Outbox Drain] Removed ${entriesToRemove.length} list entries for ${fromAddress}`);
  }
}

async function cleanupPins(fromAddress: string, tokenIds: string[]) {
  // tokenIds are objekt IDs (strings), but pins.tokenId is integer
  // We need to convert, but first check which ones exist
  const numericTokenIds = tokenIds.map((id) => Number(id)).filter((id) => !Number.isNaN(id));

  if (numericTokenIds.length === 0) return;

  const pinsToRemove = await db
    .select({ id: pins.id })
    .from(pins)
    .where(and(eq(pins.address, fromAddress), inArray(pins.tokenId, numericTokenIds)));

  if (pinsToRemove.length > 0) {
    await db.delete(pins).where(
      inArray(
        pins.id,
        pinsToRemove.map((p) => p.id),
      ),
    );
    console.log(`[Outbox Drain] Removed ${pinsToRemove.length} pins for ${fromAddress}`);
  }
}

async function cleanupLockedObjekts(fromAddress: string, tokenIds: string[]) {
  const numericTokenIds = tokenIds.map((id) => Number(id)).filter((id) => !Number.isNaN(id));

  if (numericTokenIds.length === 0) return;

  const lockedToRemove = await db
    .select({ id: lockedObjekts.id })
    .from(lockedObjekts)
    .where(
      and(eq(lockedObjekts.address, fromAddress), inArray(lockedObjekts.tokenId, numericTokenIds)),
    );

  if (lockedToRemove.length > 0) {
    await db.delete(lockedObjekts).where(
      inArray(
        lockedObjekts.id,
        lockedToRemove.map((l) => l.id),
      ),
    );
    console.log(
      `[Outbox Drain] Removed ${lockedToRemove.length} locked objekts for ${fromAddress}`,
    );
  }
}

/**
 * Safety net: periodic full scan to catch any stale entries that
 * the outbox drain may have missed (e.g. if worker was down).
 */
export async function cleanupStaleEntries() {
  console.log("[Cleanup] Starting full scan for stale entries");

  // Clean up profile-bound list entries where the objekt owner doesn't match
  const profileLists = await db.query.lists.findMany({
    where: {
      isProfileBind: true,
    },
    columns: { id: true, profileAddress: true },
    with: {
      entries: {
        columns: { id: true, objektId: true },
      },
    },
  });

  if (profileLists.length === 0) {
    console.log("[Cleanup] No profile lists found");
    return;
  }

  console.log(`[Cleanup] Found ${profileLists.length} profile lists to check`);

  const allObjektIds = new Set<string>();
  for (const list of profileLists) {
    for (const entry of list.entries) {
      if (entry.objektId) allObjektIds.add(entry.objektId);
    }
  }

  if (allObjektIds.size === 0) {
    console.log("[Cleanup] No objekt IDs to check");
    return;
  }

  const currentObjekts = await indexer
    .select({ id: objekts.id, owner: objekts.owner })
    .from(objekts)
    .where(inArray(objekts.id, Array.from(allObjektIds)));

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
        return !owner || owner !== profileAddressLower;
      })
      .map((e) => e.id);

    if (staleEntryIds.length > 0) {
      await db.delete(listEntries).where(inArray(listEntries.id, staleEntryIds));
      totalEntriesRemoved += staleEntryIds.length;
    }
  }

  // Clean up pins where owner doesn't match
  const allPins = await db
    .select({ id: pins.id, address: pins.address, tokenId: pins.tokenId })
    .from(pins);

  const allLocked = await db
    .select({
      id: lockedObjekts.id,
      address: lockedObjekts.address,
      tokenId: lockedObjekts.tokenId,
    })
    .from(lockedObjekts);

  const pinTokenIds = new Set(allPins.map((p) => String(p.tokenId)));
  const lockedTokenIds = new Set(allLocked.map((l) => String(l.tokenId)));
  const allTokenIds = new Set([...pinTokenIds, ...lockedTokenIds]);

  if (allTokenIds.size > 0) {
    const pinObjekts = await indexer
      .select({ id: objekts.id, owner: objekts.owner })
      .from(objekts)
      .where(inArray(objekts.id, Array.from(allTokenIds)));

    const pinOwnerMap = new Map<string, string>();
    for (const obj of pinObjekts) {
      pinOwnerMap.set(obj.id, obj.owner.toLowerCase());
    }

    const pinsToRemove: number[] = [];
    for (const pin of allPins) {
      const owner = pinOwnerMap.get(String(pin.tokenId));
      if (!owner || owner !== pin.address.toLowerCase()) {
        pinsToRemove.push(pin.id);
      }
    }

    const lockedToRemove: number[] = [];
    for (const locked of allLocked) {
      const owner = pinOwnerMap.get(String(locked.tokenId));
      if (!owner || owner !== locked.address.toLowerCase()) {
        lockedToRemove.push(locked.id);
      }
    }

    if (pinsToRemove.length > 0) {
      await db.delete(pins).where(inArray(pins.id, pinsToRemove));
      console.log(`[Cleanup] Removed ${pinsToRemove.length} stale pins`);
    }

    if (lockedToRemove.length > 0) {
      await db.delete(lockedObjekts).where(inArray(lockedObjekts.id, lockedToRemove));
      console.log(`[Cleanup] Removed ${lockedToRemove.length} stale locked objekts`);
    }
  }

  console.log(`[Cleanup] Full scan complete. List entries removed: ${totalEntriesRemoved}`);
}
