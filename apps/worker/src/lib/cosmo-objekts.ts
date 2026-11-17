// The pure rules for recording what a connected account reports per objekt (design Decisions 4
// and 5): which reads are kept, and which of them may serve as serial anchors. No database or
// Cosmo access, so it can be tested on its own.

import type { SummaryObjekt } from "@repo/cosmo/session-parse";
import { slugifyObjekt } from "@repo/lib";
import { V1_CUTOFF_MS } from "@repo/lib/serial";

import { preAssignedCollections } from "./serial-constants";

/** What the indexer holds of a token; `owner` is lowercased. */
export type IndexerObjekt = {
  owner: string;
  mintedAt: Date | string;
  receivedAt: Date | string;
  slug: string;
  onOffline: "online" | "offline";
};

/**
 * Whether a read's serial may anchor its collection. False for another slug's token, an online
 * collection that is not pre-assigned, or a mint before the v1 cutoff: online and v1 serials are
 * compared elsewhere, never used. Otherwise true only while the indexer's `received_at` is the one
 * recorded with the read (`read.receivedAt`, set only once the holder check passed), so the chain
 * confirmed the holder Cosmo answered for; null when the indexer lacks the token, or lacked it at
 * the read. Null is never eligible on Cosmo's word alone: a later read can settle it.
 */
export function serialEligible(
  read: { slug: string; receivedAt: Date | string | null },
  indexerObjekt: Omit<IndexerObjekt, "owner"> | null | undefined,
): boolean | null {
  if (!indexerObjekt) return null;
  if (indexerObjekt.slug !== read.slug) return false;
  if (indexerObjekt.onOffline !== "offline" && !preAssignedCollections.includes(read.slug)) {
    return false;
  }
  if (new Date(indexerObjekt.mintedAt).getTime() < V1_CUTOFF_MS) return false;
  if (read.receivedAt === null) return null;
  return new Date(indexerObjekt.receivedAt).getTime() === new Date(read.receivedAt).getTime()
    ? true
    : null;
}

export type ObservedRow = {
  tokenId: string;
  slug: string;
  objektNo: number;
  transferable: boolean;
  nonTransferableReason: string | null;
  usedForGrid: boolean;
  serialEligible: boolean | null;
  chainHeight: number;
  observedAt: string;
  /** The indexer's `received_at` at record time; null when the indexer lacked the token. */
  receivedAt: string | null;
};

/**
 * The rows to record from one page's objekts. An entry is skipped when it is not minted, belongs to
 * another owner than the session, or sits under another owner in the indexer; of two entries with
 * one token the later is kept. A token the indexer lacks is kept, with `serialEligible: null`.
 */
export function observationsOf(
  objekts: SummaryObjekt[],
  sessionAddress: string,
  indexerObjekts: Map<string, IndexerObjekt>,
  chainHeight: number,
  observedAt: string,
) {
  const session = sessionAddress.toLowerCase();
  const skipped = { notMinted: 0, otherOwner: 0, holderMismatch: 0, duplicate: 0 };
  const byToken = new Map<string, ObservedRow>();
  for (const o of objekts) {
    if (o.status !== "minted") {
      skipped.notMinted++;
      continue;
    }
    if (o.owner.toLowerCase() !== session) {
      skipped.otherOwner++;
      continue;
    }
    const indexed = indexerObjekts.get(o.tokenId);
    if (indexed && indexed.owner.toLowerCase() !== session) {
      skipped.holderMismatch++;
      continue;
    }
    const slug = slugifyObjekt(o.collectionId);
    // kept as the indexer gave it, at full precision, since the guarded write compares it exactly
    const receivedAt = !indexed
      ? null
      : typeof indexed.receivedAt === "string"
        ? indexed.receivedAt
        : indexed.receivedAt.toISOString();
    if (byToken.has(o.tokenId)) {
      skipped.duplicate++;
      // delete first so the later entry also takes the later position
      byToken.delete(o.tokenId);
    }
    byToken.set(o.tokenId, {
      tokenId: o.tokenId,
      slug,
      objektNo: o.objektNo,
      transferable: o.transferable,
      nonTransferableReason: o.nonTransferableReason,
      usedForGrid: o.usedForGrid,
      serialEligible: serialEligible({ slug, receivedAt }, indexed),
      chainHeight,
      observedAt,
      receivedAt,
    });
  }
  return { rows: [...byToken.values()], skipped };
}
