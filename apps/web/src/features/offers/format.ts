import {
  TRADE_EXPIRE_DAYS,
  type MineRow,
  type OfferItemView,
  type OfferPayload,
  type OfferView,
  type ShownSerial,
  type TopupView,
  type TradePayload,
  type TradeView,
} from "@repo/api/schemas/offer";

import { collectionName } from "@/features/objekt/objekt-label";
import { formatCurrency } from "@/features/settings/use-currency";
import { relativeTime } from "@/lib/time";
import { m } from "@/paraglide/messages";

import type { Collections } from "./pick";

export const offerNo = (id: number) => `O-${id}`;
export const tradeNo = (id: number) => `T-${id}`;

export function itemName(item: Pick<OfferItemView, "collectionSlug">, collections: Collections) {
  return collectionName(item.collectionSlug, collections[item.collectionSlug]);
}

/** "#1207", "~#1207" when estimated, as plain text */
export function serialText(shown: ShownSerial) {
  if (shown.serial === null) return m.offer_serial_unnumbered();
  return `${shown.estimated ? "~" : ""}#${shown.serial}`;
}

/** "SeoYeon A204Z #537", "SeoYeon A204Z ~#537" when estimated, or "SeoYeon A204Z (any copy)" */
export function itemLabel(
  item: Pick<OfferItemView, "collectionSlug" | "objektId" | "serial"> &
    Partial<Pick<OfferItemView, "serialEstimated">>,
  collections: Collections,
) {
  const name = itemName(item, collections);
  if (item.objektId === null) return m.offer_item_any({ name });
  if (item.serial === null) return name;
  return `${name} ${serialText({ serial: item.serial, estimated: item.serialEstimated ?? false })}`;
}

function topupAmount(topup: Pick<TopupView, "amount" | "currency">) {
  return formatCurrency(Number(topup.amount), topup.currency);
}

/** Always says the money is outside the site: nothing here can verify it. */
export function topupText(topup: TopupView) {
  const amount = topupAmount(topup);
  return topup.payer === "you"
    ? m.offer_topup_you_pay({ amount })
    : m.offer_topup_they_pay({ amount });
}

/** One line for both sides: "HyeRin A301Z + 1,000 KRW ⇄ SeoYeon A204Z". */
export function offerSummary(
  offer: Pick<OfferView, "give" | "get" | "topup">,
  collections: Collections,
) {
  const side = (items: OfferItemView[], pays: boolean) => {
    const names = items.map((item) => itemName(item, collections));
    const shown = names.length > 2 ? [...names.slice(0, 2), `+${names.length - 2}`] : names;
    if (offer.topup && pays) shown.push(topupAmount(offer.topup));
    return shown.length > 0 ? shown.join(", ") : m.offer_side_nothing();
  };
  const youPay = offer.topup?.payer === "you";
  return `${side(offer.give, youPay)} ⇄ ${side(offer.get, !youPay)}`;
}

export function offerStatusText(
  offer: Pick<OfferView, "status" | "mine" | "cancelReason">,
): string {
  switch (offer.status) {
    case "open":
      return offer.mine ? m.offer_status_waiting_them() : m.offer_status_waiting_you();
    case "accepted":
      return m.offer_status_accepted();
    case "declined":
      return m.offer_status_declined();
    case "withdrawn":
      return m.offer_status_withdrawn();
    case "countered":
      return m.offer_status_countered();
    case "expired":
      return m.offer_status_expired();
    case "cancelled":
      return m.offer_status_cancelled();
  }
}

export function cancelReasonText(reason: OfferView["cancelReason"] | "party") {
  switch (reason) {
    case "reserved":
      return m.offer_cancel_reserved();
    case "token_moved":
      return m.offer_cancel_token_moved();
    case "not_transferable":
      return m.offer_cancel_not_transferable();
    case "sanction":
      return m.offer_cancel_sanction();
    case "account_deleted":
      return m.offer_cancel_account_deleted();
    case "party":
      return m.offer_cancel_party();
    // a block reads like any other cancel, so the blocked side can't tell
    case "blocked":
    case null:
      return null;
  }
}

export function tradeStatusText(status: TradeView["status"]) {
  switch (status) {
    case "in_progress":
      return m.offer_trade_in_progress();
    case "completed":
      return m.offer_trade_completed();
    case "cancelled":
      return m.offer_trade_cancelled();
    case "failed":
      return m.offer_trade_failed();
  }
}

export function mineStatusText(row: MineRow) {
  if (row.kind === "trade") {
    return tradeStatusText(row.status as TradeView["status"]);
  }
  if (row.status === "open") return row.yourTurn ? m.offer_your_turn() : m.offer_sent();
  return offerStatusText({
    status: row.status as OfferView["status"],
    mine: !row.yourTurn,
    cancelReason: null,
  });
}

export function offerNotificationText(payload: OfferPayload) {
  const params = { partner: payload.partner.name, offer: offerNo(payload.offerId) };
  switch (payload.event) {
    case "received":
      return m.notification_offer_received(params);
    case "countered":
      return m.notification_offer_countered(params);
    case "accepted":
      return m.notification_offer_accepted(params);
    case "declined":
      return m.notification_offer_declined(params);
    case "withdrawn":
      return m.notification_offer_withdrawn(params);
    case "expired":
      return m.notification_offer_expired(params);
    case "cancelled": {
      if (payload.reason === "party" && payload.tradeId !== null) {
        return m.notification_offer_trade_cancelled({
          partner: payload.partner.name,
          trade: tradeNo(payload.tradeId),
        });
      }
      const why = cancelReasonText(payload.reason);
      return why
        ? m.notification_offer_cancelled_reason({ ...params, reason: why })
        : m.notification_offer_cancelled(params);
    }
  }
}

/** Reads the clock here: the compiler takes `Date.now` in a component body as a render-time call. */
export function expiresLabel(iso: string) {
  return m.offer_expires_in({ time: relativeTime(new Date(iso).getTime(), Date.now(), "day") });
}

/** "4 minutes ago"; reads the clock here, outside any component body. */
export function agoLabel(iso: string) {
  return relativeTime(new Date(iso).getTime(), Date.now());
}

export function tradeNotificationText(payload: TradePayload) {
  const params = { partner: payload.partner.name, trade: tradeNo(payload.tradeId) };
  // always set on the wrong-copy events
  const copy = {
    sent: payload.copy ? serialText(payload.copy.sent) : "",
    asked: payload.copy ? serialText(payload.copy.asked) : "",
  };
  switch (payload.event) {
    case "leg_verified":
      return m.notification_trade_leg_verified({ ...params, ...payload.progress });
    case "completed":
      return m.notification_trade_completed(params);
    case "cancelled":
      return payload.reason === "party"
        ? m.notification_offer_trade_cancelled(params)
        : payload.reason === "expired"
          ? m.notification_trade_cancelled_expired({ ...params, days: TRADE_EXPIRE_DAYS })
          : payload.reason === "not_transferable"
            ? m.notification_trade_cancelled_not_transferable(params)
            : m.notification_trade_cancelled_moved(params);
    case "failed":
      return payload.reason === "expired"
        ? m.notification_trade_failed_expired({ ...params, days: TRADE_EXPIRE_DAYS })
        : m.notification_trade_failed(params);
    case "reminder":
      return m.notification_trade_reminder(params);
    case "stuck":
      return m.notification_trade_stuck(params);
    case "wrong_copy":
      return m.notification_trade_wrong_copy({ ...params, ...copy });
    case "wrong_copy_declined":
      return m.notification_trade_wrong_copy_declined({ ...params, ...copy });
  }
}
