import { db } from "@repo/db";
import { indexer } from "@repo/db/indexer";
import { type ListEventOutbox, listEventOutbox, objekts } from "@repo/db/indexer/schema";
import { listEntries, lists, lockedObjekts, pins } from "@repo/db/schema";
import { chunk } from "@repo/lib";
import { and, asc, eq, inArray } from "drizzle-orm";

const BATCH_SIZE = 1000;
const IN_CHUNK_SIZE = 500;

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
 * Fetch objekts owners from indexer, chunking IDs to keep IN clauses safe.
 */
async function fetchOwnerMap(tokenIds: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  for (let i = 0; i < tokenIds.length; i += IN_CHUNK_SIZE) {
    const idChunk = tokenIds.slice(i, i + IN_CHUNK_SIZE);
    const rows = await indexer
      .select({ id: objekts.id, owner: objekts.owner })
      .from(objekts)
      .where(inArray(objekts.id, idChunk));
    for (const row of rows) {
      map.set(row.id, row.owner.toLowerCase());
    }
  }
  return map;
}

async function cleanupStaleListEntries(): Promise<number> {
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
    return 0;
  }

  console.log(`[Cleanup] Found ${profileLists.length} profile lists to check`);

  const allObjektIds = new Set<string>();
  for (const list of profileLists) {
    for (const entry of list.entries) {
      if (entry.objektId) allObjektIds.add(entry.objektId);
    }
  }

  if (allObjektIds.size === 0) {
    return 0;
  }

  const ownerMap = await fetchOwnerMap(Array.from(allObjektIds));

  const staleIds: number[] = [];
  for (const list of profileLists) {
    if (!list.profileAddress) continue;

    const profileAddressLower = list.profileAddress.toLowerCase();

    for (const entry of list.entries) {
      if (!entry.objektId) continue;
      const owner = ownerMap.get(entry.objektId);
      if (!owner || owner !== profileAddressLower) {
        staleIds.push(entry.id);
      }
    }
  }

  let totalRemoved = 0;
  await chunk(staleIds, BATCH_SIZE, async (idChunk) => {
    await db.delete(listEntries).where(inArray(listEntries.id, idChunk));
    totalRemoved += idChunk.length;
  });

  return totalRemoved;
}

async function cleanupStalePins(): Promise<number> {
  const allPins = await db
    .select({ id: pins.id, address: pins.address, tokenId: pins.tokenId })
    .from(pins);

  if (allPins.length === 0) {
    return 0;
  }

  const tokenIds = [...new Set(allPins.map((p) => String(p.tokenId)))];
  const ownerMap = await fetchOwnerMap(tokenIds);

  const staleIds: number[] = [];
  for (const pin of allPins) {
    const owner = ownerMap.get(String(pin.tokenId));
    if (!owner || owner !== pin.address.toLowerCase()) {
      staleIds.push(pin.id);
    }
  }

  let totalRemoved = 0;
  await chunk(staleIds, BATCH_SIZE, async (idChunk) => {
    await db.delete(pins).where(inArray(pins.id, idChunk));
    totalRemoved += idChunk.length;
  });

  return totalRemoved;
}

async function cleanupStaleLocks(): Promise<number> {
  const allLocks = await db
    .select({
      id: lockedObjekts.id,
      address: lockedObjekts.address,
      tokenId: lockedObjekts.tokenId,
    })
    .from(lockedObjekts);

  if (allLocks.length === 0) {
    return 0;
  }

  const tokenIds = [...new Set(allLocks.map((l) => String(l.tokenId)))];
  const ownerMap = await fetchOwnerMap(tokenIds);

  const staleIds: number[] = [];
  for (const lock of allLocks) {
    const owner = ownerMap.get(String(lock.tokenId));
    if (!owner || owner !== lock.address.toLowerCase()) {
      staleIds.push(lock.id);
    }
  }

  let totalRemoved = 0;
  await chunk(staleIds, BATCH_SIZE, async (idChunk) => {
    await db.delete(lockedObjekts).where(inArray(lockedObjekts.id, idChunk));
    totalRemoved += idChunk.length;
  });

  return totalRemoved;
}

/**
 * Safety net: periodic full scan to catch any stale entries that
 * the outbox drain may have missed (e.g. if worker was down).
 * Loads all data upfront, processes in batches to avoid massive IN clauses and N+1 deletes.
 */
export async function cleanupStaleEntries() {
  console.log("[Cleanup] Starting full scan for stale entries");

  const listEntriesRemoved = await cleanupStaleListEntries();
  console.log(`[Cleanup] List entries removed: ${listEntriesRemoved}`);

  const pinsRemoved = await cleanupStalePins();
  console.log(`[Cleanup] Pins removed: ${pinsRemoved}`);

  const locksRemoved = await cleanupStaleLocks();
  console.log(`[Cleanup] Locked objekts removed: ${locksRemoved}`);

  console.log(
    `[Cleanup] Full scan complete. Total removed: ${listEntriesRemoved + pinsRemoved + locksRemoved}`,
  );
}
