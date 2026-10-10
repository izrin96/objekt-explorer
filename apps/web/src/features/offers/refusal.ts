import { OFFER_REFUSALS, OFFER_SIDE_LIMIT, type OfferRefusal } from "@repo/api/schemas/offer";

import { refusalText as chatRefusalText } from "@/features/chat/format";
import { errorReason } from "@/lib/orpc-error";
import { m } from "@/paraglide/messages";

import { anyKey } from "./pick";

export function offerRefusalOf(error: unknown) {
  const { reason: code, retryAt } = errorReason(error);
  const reason = OFFER_REFUSALS.find((item) => item === code);
  if (!reason) return null;
  const data = (error as { data?: { objektIds?: unknown; collectionSlugs?: unknown } }).data;
  const strings = (value: unknown) =>
    Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
  return {
    reason,
    retryAt,
    objektIds: strings(data?.objektIds),
    collectionSlugs: strings(data?.collectionSlugs),
  };
}

export type OfferRefusalInfo = NonNullable<ReturnType<typeof offerRefusalOf>>;

/** `named` lists the objekts the refusal names, already worded. */
export function offerRefusalText(refusal: OfferRefusalInfo, named: string) {
  const reason: OfferRefusal = refusal.reason;
  switch (reason) {
    case "not_owned":
      return m.offer_refused_not_owned({ objekts: named });
    case "not_transferable":
      return m.offer_refused_not_transferable({ objekts: named });
    case "reserved":
      return m.offer_refused_reserved({ objekts: named });
    case "not_listed":
      return m.offer_refused_not_listed();
    case "empty":
      return m.offer_refused_empty();
    case "too_many":
      return m.offer_refused_too_many({ max: OFFER_SIDE_LIMIT });
    case "invalid_topup":
      return m.offer_refused_invalid_topup();
    case "too_many_open":
      return m.offer_refused_too_many_open();
    case "not_open":
      return m.offer_refused_not_open();
    case "expired":
      return m.offer_refused_expired();
    case "not_allowed":
      return m.offer_refused_not_allowed();
    case "trade_blocked":
      return m.offer_refused_trade_blocked();
    case "trade_ended":
      return m.offer_refused_trade_ended();
    case "locked":
      return m.offer_cancel_locked();
    case "indexer_behind":
      return m.offer_refused_indexer_behind();
    case "not_receiver":
      return m.offer_refused_not_receiver();
    case "substitute_closed":
      return m.offer_refused_substitute_closed();
    case "substitute_taken":
      return m.offer_refused_substitute_taken();
    case "not_completed":
      return m.offer_refused_not_completed();
    case "rating_closed":
      return m.offer_refused_rating_closed();
    case "no_address":
    case "self":
    case "not_accepting":
    case "start_limit":
    case "message_limit":
    case "muted":
      return chatRefusalText({ reason, retryAt: refusal.retryAt });
  }
}

/** Item keys a refusal names: objekt ids, and `any:<slug>` for an any-copy ask. */
export function refusedKeys(refusal: Pick<OfferRefusalInfo, "objektIds" | "collectionSlugs">) {
  return new Set([...refusal.objektIds, ...refusal.collectionSlugs.map(anyKey)]);
}
