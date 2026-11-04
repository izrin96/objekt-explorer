import type { OfferCancelReason, TradeCancelReason, TradeStatus } from "@repo/api/schemas/offer";
import type { AttentionReason } from "@repo/api/schemas/staff-totals";

import { m } from "@/paraglide/messages";

export const OFFER_CANCEL_LABEL: Record<OfferCancelReason, () => string> = {
  reserved: m.mod_trades_offer_cancel_reserved,
  blocked: m.mod_trades_offer_cancel_blocked,
  sanction: m.mod_trades_offer_cancel_sanction,
  token_moved: m.mod_trades_offer_cancel_token_moved,
  account_deleted: m.mod_trades_offer_cancel_account_deleted,
  not_transferable: m.mod_trades_offer_cancel_not_transferable,
};

export const TRADE_END_LABEL = {
  cancelled_party: m.mod_trades_trade_cancel_party,
  cancelled_agreed: m.mod_trades_trade_cancel_agreed,
  cancelled_token_moved: m.mod_trades_trade_cancel_token_moved,
  cancelled_not_transferable: m.mod_trades_trade_cancel_not_transferable,
  cancelled_expired: m.mod_trades_trade_cancel_expired,
  failed_broken: m.mod_trades_trade_failed_broken,
  failed_expired: m.mod_trades_trade_failed_expired,
} satisfies Record<
  `cancelled_${TradeCancelReason}` | `failed_${"broken" | "expired"}`,
  () => string
>;

/** Why a trade ended, for a cancelled or failed one; null otherwise. */
export function tradeEndText(status: TradeStatus, reason: TradeCancelReason | null) {
  if (status === "cancelled")
    return reason === null ? null : TRADE_END_LABEL[`cancelled_${reason}`]();
  if (status === "failed")
    return TRADE_END_LABEL[reason === "expired" ? "failed_expired" : "failed_broken"]();
  return null;
}

export const ATTENTION_LABEL: Record<AttentionReason, () => string> = {
  stalled: m.mod_trades_reason_stalled,
  failed: m.mod_trades_reason_failed,
  away: m.mod_trades_reason_away,
  stuck: m.mod_trades_reason_stuck,
  copy: m.mod_trades_reason_copy,
  cancel_ask: m.mod_trades_reason_cancel_ask,
};

export const ATTENTION_DETAIL: Record<AttentionReason, (params: { time: string }) => string> = {
  stalled: m.mod_trades_detail_stalled,
  failed: m.mod_trades_detail_failed,
  away: m.mod_trades_detail_away,
  stuck: m.mod_trades_detail_stuck,
  copy: m.mod_trades_detail_copy,
  cancel_ask: m.mod_trades_detail_cancel_ask,
};

export const ATTENTION_BADGE: Record<AttentionReason, "error" | "warning" | "outline"> = {
  stalled: "warning",
  failed: "error",
  away: "warning",
  stuck: "warning",
  copy: "outline",
  cancel_ask: "outline",
};

export const TRADE_STATUS_BADGE: Record<TradeStatus, "outline" | "success" | "error" | "warning"> =
  {
    in_progress: "outline",
    completed: "success",
    cancelled: "warning",
    failed: "error",
  };
