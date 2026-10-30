import type { CreateOfferInput, TopupPayer } from "@repo/api/schemas/offer";

import type { OfferPick } from "@/features/offers/pick";
import type { OfferAddress } from "@/features/offers/queries";

import { countOf } from "../quantity";
import type { OfferPrefill } from "./types";

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

const sameKeys = (picks: readonly OfferPick[], from: readonly OfferPick[] = []) =>
  picks.length === from.length &&
  picks.every((pick, i) => pick.key === from[i]?.key && countOf(pick) === countOf(from[i]!));

/**
 * What closing would lose: changes to the prefill. An open top-up with no amount holds nothing,
 * and an empty builder holds nothing even when the matches had filled it. The picks are the ones
 * as picked, before an ask resolves into copies.
 */
export function holdsDraft(d: Draft, prefill: OfferPrefill | undefined): boolean {
  const empty = d.give.length + d.get.length === 0;
  const topupHeld = d.topup.on && d.topup.amount !== null;
  if (empty && !topupHeld && d.note.trim() === "") return false;
  return (
    !sameKeys(d.give, prefill?.give) ||
    !sameKeys(d.get, prefill?.get) ||
    (topupHeld &&
      (d.topup.amount !== prefill?.topup?.amount ||
        d.topup.currency !== prefill.topup.currency ||
        d.topup.payer !== prefill.topup.payer)) ||
    d.note.trim() !== (prefill?.note ?? "").trim()
  );
}
