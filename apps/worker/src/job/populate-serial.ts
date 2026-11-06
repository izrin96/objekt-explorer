import { indexer } from "@repo/db/indexer";
import { collections, objekts } from "@repo/db/indexer/schema";
import { chunk } from "@repo/lib";
import { and, eq, gte, notInArray, inArray, or, lte } from "drizzle-orm";

import { heartbeat, log, type Logger } from "@/lib/log";
import { preAssignedCollections as excludeCollections } from "@/lib/serial-constants";
import {
  computeOfflineSerialUpdates,
  computeOnlineSerials,
  planRediscovery,
  V1_CUTOFF_MS,
} from "@/lib/serial-math";

import {
  discoverBatches,
  findBoundaryTokenId,
  applyDropGrid,
  refineBatches,
  writeSerialUpdates,
} from "./serial-batches";

const COLLECTION_CONCURRENCY = 5;

// objekts minted within this window are left for a later run
const MINT_DELAY_MS = 120 * 1000;

const onlineLog = log("serial-online");
const onlineBeat = heartbeat(onlineLog);
const offlineLog = log("serial-offline");
const offlineBeat = heartbeat(offlineLog);

/** One line for a run that wrote serials, from each collection's count of objekts updated. */
function logWritten(logger: Logger, counts: number[]) {
  const written = counts.filter((count) => count > 0);
  if (written.length === 0) return;
  logger.info(
    `Updated ${written.reduce((a, b) => a + b, 0)} objekts in ${written.length} collections`,
  );
}

// ===========================================================================
// Online objekt serial numbering
// ===========================================================================
//
// Online objekts are far simpler than offline ones: a collection's tokenIds are
// contiguous and minted in order, so the serial is just the objekt's mint
// position within the collection (1, 2, 3, ...) — no reserved batches, no
// foreign gaps. New objekts (serial = 0) are appended after the current maximum
// serial, in tokenId order.
//
// Exception — "pre-assigned" collections: a few collections marked online were
// actually given reserved tokenIds up front (like offline objekts), so their
// serial can't be derived from mint order. processCollection detects these and
// skips them; they are routed through the offline path instead (see
// excludeCollections and populateSerialOffline).

export async function populateSerial() {
  const collectionDiscover = await indexer
    .selectDistinctOn([collections.id], { id: collections.id })
    .from(collections)
    .innerJoin(objekts, eq(objekts.collectionId, collections.id))
    .where(
      and(
        eq(objekts.serial, 0),
        // pre-cutoff serials are never changed, and processCollection skips fresh mints
        gte(objekts.mintedAt, new Date(V1_CUTOFF_MS).toISOString()),
        lte(objekts.mintedAt, new Date(Date.now() - MINT_DELAY_MS).toISOString()),
        eq(collections.onOffline, "online"),
        // skip collection that already pre-assigned tokenId
        notInArray(collections.slug, excludeCollections),
      ),
    );

  onlineBeat.count("runs");
  onlineBeat.count("collections checked", collectionDiscover.length);
  const updated: number[] = [];
  await chunk(collectionDiscover, COLLECTION_CONCURRENCY, async (batch) => {
    updated.push(...(await Promise.all(batch.map(({ id }) => processCollection(id)))));
  });
  logWritten(onlineLog, updated);
  onlineBeat.flush();
}

/**
 * Populate + self-heal serials for one online collection:
 *  - load objekts sorted by tokenId (after a short mint delay);
 *  - if brand new, verify it isn't a pre-assigned collection (lowest tokenId must
 *    equal the collection's boundary base) and skip if it is;
 *  - assign post-cutoff serials from tokenId rank and write the diffs, healing
 *    inversions from out-of-order indexing. Pre-cutoff serials are trusted and
 *    never changed; an intentional head serial 0 is preserved.
 */
async function processCollection(collectionId: string): Promise<number> {
  const allObjekts = await indexer
    .select({ id: objekts.id, serial: objekts.serial, mintedAt: objekts.mintedAt })
    .from(objekts)
    .where(
      and(
        eq(objekts.collectionId, collectionId),
        // give some delay
        lte(objekts.mintedAt, new Date(Date.now() - MINT_DELAY_MS).toISOString()),
      ),
    );

  if (allObjekts.length === 0) return 0;

  const sorted = allObjekts.toSorted((a, b) => parseInt(a.id) - parseInt(b.id));

  const isNew = sorted.every((a) => a.serial === 0);

  if (isNew) {
    // Detect pre-assigned collections: call findBoundaryTokenId
    // backwards. If the base token matches the first objekt's tokenId,
    // the collection boundary is properly positioned — proceed.
    // Otherwise it's a pre-assigned collection — skip.
    const [collection] = await indexer
      .select({ collectionId: collections.collectionId })
      .from(collections)
      .where(eq(collections.id, collectionId))
      .limit(1);

    if (!collection) return 0;

    const firstTokenId = parseInt(sorted[0]!.id);
    const baseTokenId = await findBoundaryTokenId(collection.collectionId, firstTokenId, -1);

    if (baseTokenId !== firstTokenId) {
      onlineBeat.count("pre-assigned skipped");
      onlineLog.debug(`${collectionId}: pre-assigned, skipping`);
      return 0;
    }
  }

  // Assign post-cutoff serials from tokenId rank and write the ones that differ;
  // pre-cutoff serials are trusted and never touched. This SELF-HEALS inversions
  // caused by out-of-order indexing: a low-tokenId objekt indexed late used to be
  // appended as maxSerial+1 (a too-high serial); now it lands at its tokenId rank
  // and the displaced objekts shift back, in the same run.
  //
  // An old collection may intentionally keep its lowest-tokenId objekt at serial
  // 0 (headSkip) — that objekt is preserved and the rest number from 1 after it.
  const headSkip = !isNew && sorted[0]!.serial === 0;
  const { updates } = computeOnlineSerials(sorted, V1_CUTOFF_MS, headSkip);

  if (updates.length === 0) return 0;

  await writeSerialUpdates(updates);
  onlineBeat.count("objekts updated", updates.length);
  onlineLog.debug(`${collectionId}: updated ${updates.length} objekts`);
  return updates.length;
}

export async function populateSerialOffline() {
  const affectedCollections = await indexer
    .selectDistinctOn([collections.id], { id: collections.id })
    .from(collections)
    .innerJoin(objekts, eq(objekts.collectionId, collections.id))
    .where(
      and(
        eq(objekts.serial, 0),
        or(
          eq(collections.onOffline, "offline"),
          // extra collection with pre-assigned tokenId
          inArray(collections.slug, excludeCollections),
        ),
      ),
    );

  offlineBeat.count("runs");
  offlineBeat.count("collections checked", affectedCollections.length);
  const outcomes: OfflineOutcome[] = [];
  await chunk(affectedCollections, COLLECTION_CONCURRENCY, async (batch) => {
    outcomes.push(...(await Promise.all(batch.map(({ id }) => processCollectionOffline(id)))));
  });
  logWritten(
    offlineLog,
    outcomes.filter((outcome) => typeof outcome === "number"),
  );
  const apiErrors = outcomes.filter((outcome) => outcome === "api error").length;
  if (apiErrors > 0) {
    offlineLog.warn(`Cosmo API failed for ${apiErrors} collections; they retry next run`);
  }
  offlineBeat.flush();
}

/** Objekts updated, or why nothing was written. */
type OfflineOutcome = number | "skipped" | "api error";

/**
 * Populate serials for one offline collection:
 *  1. load its objekts (after a short mint delay) and the stored batch ranges;
 *  2. (re)discover ranges if a tokenId falls outside them — incrementally from
 *     the frontier when possible, else a full rescan — and persist;
 *  3. recompute every post-cutoff objekt's serial via computeOfflineSerials and
 *     write the ones that changed (heals serials shifted by a newly-discovered
 *     batch). Pre-cutoff v1 serials are never overwritten.
 */
async function processCollectionOffline(collectionId: string): Promise<OfflineOutcome> {
  const allObjekts = await indexer
    .select({ id: objekts.id, serial: objekts.serial, mintedAt: objekts.mintedAt })
    .from(objekts)
    .where(
      and(
        eq(objekts.collectionId, collectionId),
        // give some delay
        lte(objekts.mintedAt, new Date(Date.now() - MINT_DELAY_MS).toISOString()),
      ),
    );

  const zeroObjekts = allObjekts.filter((o) => o.serial === 0);

  if (zeroObjekts.length === 0) return "skipped";

  const [collection] = await indexer
    .select({
      collectionId: collections.collectionId,
      season: collections.season,
      serialBatches: collections.serialBatches,
      serialAnchors: collections.serialAnchors,
    })
    .from(collections)
    .where(eq(collections.id, collectionId))
    .limit(1);

  if (!collection) {
    offlineLog.debug(`${collectionId}: not found`);
    return "skipped";
  }

  const presentTokenIds = allObjekts.map((o) => parseInt(o.id));

  let batches = collection.serialBatches ?? [];

  // (re)discover batches when unknown or a token falls outside known ranges
  // (a new or extended batch appeared); otherwise reuse stored ranges without
  // touching the Cosmo API
  const rediscovery = planRediscovery(batches, presentTokenIds);

  if (rediscovery) {
    try {
      if (rediscovery.resumeFrom !== undefined) {
        const rediscovered = await discoverBatches(
          collection.collectionId,
          presentTokenIds,
          rediscovery.resumeFrom,
        );
        batches = [...batches.slice(0, -1), ...rediscovered];
      } else {
        batches = await discoverBatches(collection.collectionId, presentTokenIds);
      }
    } catch {
      offlineLog.debug(`${collectionId}: Cosmo API error, skipping`);
      return "api error";
    }

    batches = await refineBatches(collection.season, batches, presentTokenIds);
    batches = await applyDropGrid(collectionId, batches);

    if (batches.length === 0) {
      offlineBeat.count("no batches discovered");
      offlineLog.debug(`${collectionId}: no batches discovered`);
      return "skipped";
    }

    await indexer
      .update(collections)
      .set({ serialBatches: batches })
      .where(eq(collections.id, collectionId));
  }

  // Recompute the serial of every objekt from the batch ranges (anchored on
  // pre-cutoff v1 serials and manual anchors) and update any that differ. This
  // heals objekts whose serial was written before a new/intermediate batch was
  // discovered (which shifts every later serial), not just newly-minted
  // serial=0 objekts.
  const updates = computeOfflineSerialUpdates(allObjekts, batches, collection.serialAnchors ?? []);

  if (updates.length === 0) return "skipped";

  await writeSerialUpdates(updates);
  offlineBeat.count("objekts updated", updates.length);
  offlineLog.debug(`${collectionId}: updated ${updates.length} objekts`);
  return updates.length;
}
