import type { CandidateItem } from "@repo/api/schemas/offer";
import type { ValidObjekt } from "@repo/lib/types/objekt";

import { m } from "@/paraglide/messages";

export type OfferSide = "give" | "get";

export type Collections = Readonly<Record<string, ValidObjekt | undefined>>;

export type OfferPick = {
  key: string;
  collectionSlug: string;
  /** null asks for any copy */
  objektId: string | null;
  serial: number | null;
  listSlug: string | null;
  /** null when the pick did not come from candidates, as in a counter's prefill */
  flags: Pick<CandidateItem, "transferable" | "reserved" | "inOpenOffer" | "copies"> | null;
  /** a counter keeps what the countered offer gave, listed or not */
  kept?: boolean;
  /** the any-copy placeholder this resolved copy stands in for */
  replaces?: string;
};

export const anyKey = (collectionSlug: string) => `any:${collectionSlug}`;

export const pickKey = (item: Pick<CandidateItem, "collectionSlug" | "objektId">) =>
  item.objektId ?? anyKey(item.collectionSlug);

export function toPick(item: CandidateItem): OfferPick {
  return {
    key: pickKey(item),
    collectionSlug: item.collectionSlug,
    objektId: item.objektId,
    serial: item.serial,
    listSlug: item.listSlug,
    flags: {
      transferable: item.transferable,
      reserved: item.reserved,
      inOpenOffer: item.inOpenOffer,
      copies: item.copies,
    },
  };
}

/** Why a pick can't go in an offer, or null when it can. */
export function blockedReason(flags: OfferPick["flags"]) {
  if (!flags) return null;
  if (!flags.transferable) return m.offer_flag_not_transferable();
  if (flags.reserved) return m.offer_flag_reserved();
  return null;
}
