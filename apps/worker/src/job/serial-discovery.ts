import { fetchMetadataV3, normalizeV3 } from "@repo/cosmo/server/metadata";
import { slugifyObjekt } from "@repo/lib";
import { FetchError } from "ofetch";

import { probeWindow } from "@/lib/serial-math";

const BATCH_SIZE = 20;

export async function findBoundaryTokenId(
  targetCollectionId: string,
  startTokenId: number,
  direction: -1,
  maxOffset?: number,
): Promise<number | null>;

export async function findBoundaryTokenId(
  targetCollectionId: string,
  startTokenId: number,
  direction: 1,
): Promise<number>;

export async function findBoundaryTokenId(
  targetCollectionId: string,
  startTokenId: number,
  direction: 1,
  maxOffset: number,
): Promise<number | null>;

export async function findBoundaryTokenId(
  targetCollectionId: string,
  startTokenId: number,
  direction: -1 | 1,
  maxOffset?: number,
): Promise<number | null> {
  const targetSlug = slugifyObjekt(targetCollectionId);

  for (let offset = 0; ; offset += BATCH_SIZE) {
    const batch = probeWindow(startTokenId, direction, offset, maxOffset, BATCH_SIZE);

    if (batch.length === 0) break;

    const results = await Promise.all(
      batch.map(async (tokenId) => {
        try {
          const raw = await fetchMetadataV3(String(tokenId));
          const metadata = normalizeV3(raw, String(tokenId));
          return { tokenId, slug: slugifyObjekt(metadata.objekt.collectionId) };
        } catch (error) {
          if (error instanceof FetchError && error.status === 404) {
            return { tokenId, slug: null };
          }
          throw error;
        }
      }),
    );

    for (const result of results) {
      if (result.slug === null) continue;
      if (result.slug !== targetSlug) {
        return result.tokenId - direction;
      }
    }
  }

  return null;
}

// ===========================================================================
// Offline objekt serial numbering
// ===========================================================================
//
// Cosmo's v1 metadata endpoint used to carry each objekt's serial number, but it
// was shut down (see V1_CUTOFF_MS). v3 replaced it and has no serial, so for
// objekts minted at/after the cutoff we must reconstruct the serial ourselves.
//
// How serials work for offline objekts:
//  - Modhaus reserves contiguous tokenId ranges ("batches") per collection, and
//    a collection can get several non-contiguous batches over time, e.g. 200-300
//    then 500-600, with 301-499 belonging to a DIFFERENT collection ("foreign").
//    binary02 301a members are heavily multi-batch (dozens of batches each,
//    separated by 1-2 foreign tokens).
//  - The serial is the objekt's 1-based position in the concatenation of its
//    reserved ranges: foreign tokens are skipped, but UNMINTED tokenIds inside a
//    reserved range still consume a serial (serial = tokenId - batchStart + 1
//    within a batch, continuing across batches).
//
// Two-step reconstruction:
//  1. discoverBatches() finds the reserved ranges by probing the Cosmo v3 API.
//     Ranges are persisted in collection.serial_batches and reused.
//  2. computeOfflineSerials() turns ranges + tokenIds into serials, ANCHORED on
//     pre-cutoff v1 serials (which are ground truth). This is essential: the API
//     cannot attribute unminted (404) tokens to a collection, so discovery alone
//     mis-sizes batches and drifts serials — anchoring on v1 corrects it.
//
// See the JSDoc on discoverBatches / computeOfflineSerials for the details.

// Safety cap for the initial backward scan to the first batch's base. Only
// relevant when the first batch has NO v1 anchor (a collection whose first batch
// was reserved entirely after the cutoff); anchored batches ignore batch0.start.
// Measured max reserved "head" (unminted tokens below the first mint) across all
// offline collections is ~6.3k, so 10k leaves margin for a future large drop.
const INITIAL_BACKWARD_CAP = 10000;

/**
 * Discover the reserved tokenId ranges (batches) that make up an offline
 * collection. Modhaus can reserve several non-contiguous ranges over time
 * (e.g. 200-300 then 500-600, with 301-499 belonging to another collection).
 *
 * Only the gaps *between present tokens* are probed, each scan bounded by that
 * gap's size, so unminted tails are never scanned unboundedly. A gap that turns
 * out to be all-unminted (no foreign token) keeps the surrounding tokens in the
 * same batch; a gap containing a foreign token splits the batch.
 *
 * Returns ordered ranges ascending by start. The trailing batch's `end` is
 * provisional (max present token) since no token follows it yet.
 *
 * `resumeFromStart` enables incremental rediscovery: pass the known start of the
 * (provisional) frontier batch to skip everything below it. Closed batches never
 * change, so only the frontier region is re-probed. Caller prepends the stable
 * closed batches to the result.
 */
export async function discoverBatches(
  targetCollectionId: string,
  presentTokenIds: number[],
  resumeFromStart?: number,
): Promise<{ start: number; end: number }[]> {
  const all = [...new Set(presentTokenIds)].sort((a, b) => a - b);
  const sorted = resumeFromStart === undefined ? all : all.filter((t) => t >= resumeFromStart);
  if (sorted.length === 0) return [];

  const batches: { start: number; end: number }[] = [];

  // start of the first batch: use the known frontier start when resuming,
  // otherwise walk back from the lowest present token to the foreign boundary
  // (null = treat the lowest present token as the base)
  let batchStart =
    resumeFromStart ??
    (await findBoundaryTokenId(targetCollectionId, sorted[0]!, -1, INITIAL_BACKWARD_CAP)) ??
    sorted[0]!;

  for (let i = 0; i < sorted.length; i++) {
    const cur = sorted[i]!;
    const next = sorted[i + 1];

    if (next === undefined) {
      // frontier batch: nothing after it, end is provisional (max present)
      batches.push({ start: batchStart, end: cur });
      break;
    }

    const gap = next - cur;
    if (gap <= 1) continue; // contiguous, same batch

    // is there a foreign token inside the gap? bounded scan of the gap only
    const scannedEnd = await findBoundaryTokenId(targetCollectionId, cur, 1, gap - 1);

    if (scannedEnd === null) continue; // gap is all unminted, same batch

    // foreign token found: current batch ends here, next batch starts higher up
    // inside the same gap
    batches.push({ start: batchStart, end: scannedEnd });
    batchStart = (await findBoundaryTokenId(targetCollectionId, next, -1, gap - 1)) ?? next;
  }

  return batches;
}
