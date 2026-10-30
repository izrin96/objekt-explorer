import type { CreateOfferInput, TopupPayer } from "@repo/api/schemas/offer";

import type { OfferPick } from "@/features/offers/pick";
import type { OfferAddress } from "@/features/offers/queries";

import { countOf } from "../quantity";

type Draft = {
  /** the side as shown: an ask already resolved into the copies it stands for */
  give: readonly OfferPick[];
  get: readonly OfferPick[];
  topup: { on: boolean; amount: number | null; currency: string; payer: TopupPayer };
  note: string;
};

/** The request that sends the draft to `to`. */
export function offerInput(to: OfferAddress, d: Draft): CreateOfferInput {
  return {
    ...to,
    give: d.give.flatMap((pick) =>
      pick.objektId ? [{ collectionSlug: pick.collectionSlug, objektId: pick.objektId }] : [],
    ),
    // an any-copy pick of several copies asks for each one
    get: d.get.flatMap((pick) =>
      Array.from({ length: countOf(pick) }, () => ({
        collectionSlug: pick.collectionSlug,
        objektId: pick.objektId ?? undefined,
        listSlug: pick.listSlug ?? undefined,
      })),
    ),
    topup:
      d.topup.on && d.topup.amount !== null
        ? { amount: d.topup.amount, currency: d.topup.currency, payer: d.topup.payer }
        : undefined,
    note: d.note.trim() === "" ? undefined : d.note,
  };
}
