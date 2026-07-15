import { db } from "@repo/db";
import { indexer } from "@repo/db/indexer";
import { type ListEventOutbox, listEventOutbox, objekts } from "@repo/db/indexer/schema";
import { listEntries, lists, lockedObjekts, pins } from "@repo/db/schema";
import { chunk } from "@repo/lib";
import { and, asc, eq, inArray } from "drizzle-orm";

const BATCH_SIZE = 5000;
const IN_CHUNK_SIZE = 500;
const ADDRESS_CONCURRENCY = 10;

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

  const failedAddresses = await processBatch(batch);

  // Keep events for failed addresses in the outbox so they retry next run
  const idsToDelete = batch
    .filter((row) => !failedAddresses.has(row.fromAddress.toLowerCase()))
    .map((row) => row.id);

  if (idsToDelete.length > 0) {
    await indexer.delete(listEventOutbox).where(inArray(listEventOutbox.id, idsToDelete));
  }

  console.log(
    `[Outbox Drain] Processed ${idsToDelete.length} events` +
      (failedAddresses.size > 0
        ? `, ${failedAddresses.size} addresses failed (kept for retry)`
        : ""),
  );
}

async function processBatch(events: ListEventOutbox[]): Promise<Set<string>> {
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

  const failedAddresses = new Set<string>();

  // Process addresses with bounded concurrency to avoid exhausting the DB pool
  await chunk(Array.from(addressToTokenIds.entries()), ADDRESS_CONCURRENCY, async (entries) => {
    await Promise.all(
      entries.map(async ([address, tokenIdSet]) => {
        try {
          await cleanupAddress(address, Array.from(tokenIdSet));
        } catch (error) {
          console.error(`[Outbox Drain] Error cleaning up for ${address}:`, error);
          failedAddresses.add(address);
        }
      }),
    );
  });

  return failedAddresses;
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

  // Remove matching list entries (objektId matches tokenIds)
  const removed = await db
    .delete(listEntries)
    .where(and(inArray(listEntries.listId, listIds), inArray(listEntries.objektId, tokenIds)))
    .returning({ id: listEntries.id });

  if (removed.length > 0) {
    console.log(`[Outbox Drain] Removed ${removed.length} list entries for ${fromAddress}`);
  }
}

// pins and lockedObjekts share the same (id, address, tokenId) shape
type TokenTable = typeof pins | typeof lockedObjekts;

async function cleanupTokenRows(
  table: TokenTable,
  label: string,
  fromAddress: string,
  tokenIds: string[],
) {
  // tokenIds are objekt IDs (strings), but the table's tokenId is integer
  const numericTokenIds = tokenIds.map((id) => Number(id)).filter((id) => !Number.isNaN(id));

  if (numericTokenIds.length === 0) return;

  const removed = await db
    .delete(table)
    .where(and(eq(table.address, fromAddress), inArray(table.tokenId, numericTokenIds)))
    .returning({ id: table.id });

  if (removed.length > 0) {
    console.log(`[Outbox Drain] Removed ${removed.length} ${label} for ${fromAddress}`);
  }
}

async function cleanupPins(fromAddress: string, tokenIds: string[]) {
  await cleanupTokenRows(pins, "pins", fromAddress, tokenIds);
}

async function cleanupLockedObjekts(fromAddress: string, tokenIds: string[]) {
  await cleanupTokenRows(lockedObjekts, "locked objekts", fromAddress, tokenIds);
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

async function cleanupStaleTokenRows(table: TokenTable): Promise<number> {
  const rows = await db
    .select({ id: table.id, address: table.address, tokenId: table.tokenId })
    .from(table);

  if (rows.length === 0) {
    return 0;
  }

  const tokenIds = [...new Set(rows.map((r) => String(r.tokenId)))];
  const ownerMap = await fetchOwnerMap(tokenIds);

  const staleIds: number[] = [];
  for (const row of rows) {
    const owner = ownerMap.get(String(row.tokenId));
    if (!owner || owner !== row.address.toLowerCase()) {
      staleIds.push(row.id);
    }
  }

  let totalRemoved = 0;
  await chunk(staleIds, BATCH_SIZE, async (idChunk) => {
    await db.delete(table).where(inArray(table.id, idChunk));
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

  const pinsRemoved = await cleanupStaleTokenRows(pins);
  console.log(`[Cleanup] Pins removed: ${pinsRemoved}`);

  const locksRemoved = await cleanupStaleTokenRows(lockedObjekts);
  console.log(`[Cleanup] Locked objekts removed: ${locksRemoved}`);

  console.log(
    `[Cleanup] Full scan complete. Total removed: ${listEntriesRemoved + pinsRemoved + locksRemoved}`,
  );
}
