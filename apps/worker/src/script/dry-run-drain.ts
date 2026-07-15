/**
 * Dry-run version of drainOutbox() AND cleanupStaleEntries() from src/job/drain.ts.
 *
 * Performs the same reads and grouping logic as the real drain and the real
 * full scan, but only SELECTs what would be deleted instead of deleting
 * anything. Safe to run against production data.
 *
 *   bun run --env-file=../../.env src/script/dry-run-drain.ts
 */
import { db } from "@repo/db";
import { indexer } from "@repo/db/indexer";
import { listEventOutbox, objekts } from "@repo/db/indexer/schema";
import { listEntries, lists, lockedObjekts, pins } from "@repo/db/schema";
import { chunk } from "@repo/lib";
import { and, asc, eq, inArray } from "drizzle-orm";

const BATCH_SIZE = 5000;
const IN_CHUNK_SIZE = 500;
const ADDRESS_CONCURRENCY = 10;

async function previewProfileListEntries(fromAddress: string, tokenIds: string[]): Promise<number> {
  const profileLists = await db
    .select({ id: lists.id })
    .from(lists)
    .where(and(eq(lists.profileAddress, fromAddress), eq(lists.isProfileBind, true)));

  if (profileLists.length === 0) return 0;

  const listIds = profileLists.map((l) => l.id);

  const matched = await db
    .select({ id: listEntries.id })
    .from(listEntries)
    .where(and(inArray(listEntries.listId, listIds), inArray(listEntries.objektId, tokenIds)));

  return matched.length;
}

// pins and lockedObjekts share the same (id, address, tokenId) shape
type TokenTable = typeof pins | typeof lockedObjekts;

async function previewTokenRows(
  table: TokenTable,
  fromAddress: string,
  tokenIds: string[],
): Promise<number> {
  const numericTokenIds = tokenIds.map((id) => Number(id)).filter((id) => !Number.isNaN(id));

  if (numericTokenIds.length === 0) return 0;

  const matched = await db
    .select({ id: table.id })
    .from(table)
    .where(and(eq(table.address, fromAddress), inArray(table.tokenId, numericTokenIds)));

  return matched.length;
}

const batch = await indexer
  .select()
  .from(listEventOutbox)
  .orderBy(asc(listEventOutbox.createdAt))
  .limit(BATCH_SIZE);

if (batch.length === 0) {
  // The real cleanupStaleEntries() runs regardless of outbox state,
  // so fall through to the full-scan dry run below.
  console.log("[Dry Run Drain] No events to process");
} else {
  // Group events by fromAddress, same as processBatch() in drain.ts
  const addressToTokenIds = new Map<string, Set<string>>();

  for (const event of batch) {
    const from = event.fromAddress.toLowerCase();
    if (!addressToTokenIds.has(from)) {
      addressToTokenIds.set(from, new Set());
    }
    addressToTokenIds.get(from)!.add(event.tokenId);
  }

  let totalListEntries = 0;
  let totalPins = 0;
  let totalLocks = 0;

  await chunk(Array.from(addressToTokenIds.entries()), ADDRESS_CONCURRENCY, async (entries) => {
    await Promise.all(
      entries.map(async ([address, tokenIdSet]) => {
        const tokenIds = Array.from(tokenIdSet);

        const listEntryCount = await previewProfileListEntries(address, tokenIds);
        const pinCount = await previewTokenRows(pins, address, tokenIds);
        const lockCount = await previewTokenRows(lockedObjekts, address, tokenIds);

        totalListEntries += listEntryCount;
        totalPins += pinCount;
        totalLocks += lockCount;

        if (listEntryCount > 0 || pinCount > 0 || lockCount > 0) {
          console.log(
            `[Dry Run Drain] ${address}: list entries=${listEntryCount}, pins=${pinCount}, locks=${lockCount}`,
          );
        }
      }),
    );
  });

  console.log("[Dry Run Drain] Summary:");
  console.log(`  Outbox events fetched: ${batch.length}`);
  console.log(`  Unique addresses: ${addressToTokenIds.size}`);
  console.log(`  Would-delete list entries: ${totalListEntries}`);
  console.log(`  Would-delete pins: ${totalPins}`);
  console.log(`  Would-delete locked objekts: ${totalLocks}`);
  console.log(
    `  Outbox rows that would be deleted (no failures assumed in dry run): ${batch.length}`,
  );
}

// --- Dry-run of cleanupStaleEntries() (the "full scan") ---

/**
 * Fetch objekt owners from indexer, chunking IDs to keep IN clauses safe.
 * Mirrors fetchOwnerMap() in src/job/drain.ts (not exported, copied here).
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

type StaleListEntry = { id: number; listId: number; profileAddress: string; objektId: string };
type StaleTokenRow = { id: number; address: string; tokenId: number };

async function previewStaleListEntries(): Promise<{
  listsChecked: number;
  entriesChecked: number;
  stale: StaleListEntry[];
}> {
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
    return { listsChecked: 0, entriesChecked: 0, stale: [] };
  }

  const allObjektIds = new Set<string>();
  let entriesChecked = 0;
  for (const list of profileLists) {
    for (const entry of list.entries) {
      entriesChecked++;
      if (entry.objektId) allObjektIds.add(entry.objektId);
    }
  }

  if (allObjektIds.size === 0) {
    return { listsChecked: profileLists.length, entriesChecked, stale: [] };
  }

  const ownerMap = await fetchOwnerMap(Array.from(allObjektIds));

  const stale: StaleListEntry[] = [];
  for (const list of profileLists) {
    if (!list.profileAddress) continue;

    const profileAddressLower = list.profileAddress.toLowerCase();

    for (const entry of list.entries) {
      if (!entry.objektId) continue;
      const owner = ownerMap.get(entry.objektId);
      if (!owner || owner !== profileAddressLower) {
        stale.push({
          id: entry.id,
          listId: list.id,
          profileAddress: list.profileAddress,
          objektId: entry.objektId,
        });
      }
    }
  }

  return { listsChecked: profileLists.length, entriesChecked, stale };
}

async function previewStaleTokenRows(
  table: TokenTable,
): Promise<{ rowsChecked: number; stale: StaleTokenRow[] }> {
  const rows = await db
    .select({ id: table.id, address: table.address, tokenId: table.tokenId })
    .from(table);

  if (rows.length === 0) {
    return { rowsChecked: 0, stale: [] };
  }

  const tokenIds = [...new Set(rows.map((r) => String(r.tokenId)))];
  const ownerMap = await fetchOwnerMap(tokenIds);

  const stale: StaleTokenRow[] = [];
  for (const row of rows) {
    const owner = ownerMap.get(String(row.tokenId));
    if (!owner || owner !== row.address.toLowerCase()) {
      stale.push({ id: row.id, address: row.address, tokenId: row.tokenId });
    }
  }

  return { rowsChecked: rows.length, stale };
}

const staleListEntriesResult = await previewStaleListEntries();
const stalePinsResult = await previewStaleTokenRows(pins);
const staleLocksResult = await previewStaleTokenRows(lockedObjekts);

console.log("[Dry Run Full Scan] Summary:");
console.log(`  Profile lists checked: ${staleListEntriesResult.listsChecked}`);
console.log(`  List entries checked: ${staleListEntriesResult.entriesChecked}`);
console.log(`  Stale list entries (would-delete): ${staleListEntriesResult.stale.length}`);
console.log(`  Pins checked: ${stalePinsResult.rowsChecked}`);
console.log(`  Stale pins (would-delete): ${stalePinsResult.stale.length}`);
console.log(`  Locked objekts checked: ${staleLocksResult.rowsChecked}`);
console.log(`  Stale locked objekts (would-delete): ${staleLocksResult.stale.length}`);

if (staleListEntriesResult.stale.length > 0) {
  console.log("[Dry Run Full Scan] Sample stale list entries (up to 10):");
  for (const entry of staleListEntriesResult.stale.slice(0, 10)) {
    console.log(
      `    listId=${entry.listId} profileAddress=${entry.profileAddress} objektId=${entry.objektId}`,
    );
  }
}

if (stalePinsResult.stale.length > 0) {
  console.log("[Dry Run Full Scan] Sample stale pins (up to 10):");
  for (const row of stalePinsResult.stale.slice(0, 10)) {
    console.log(`    address=${row.address} tokenId=${row.tokenId}`);
  }
}

if (staleLocksResult.stale.length > 0) {
  console.log("[Dry Run Full Scan] Sample stale locked objekts (up to 10):");
  for (const row of staleLocksResult.stale.slice(0, 10)) {
    console.log(`    address=${row.address} tokenId=${row.tokenId}`);
  }
}

process.exit(0);
