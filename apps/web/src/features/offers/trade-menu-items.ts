import { REPORT_AFTER_DAYS, type TradeView as Trade } from "@repo/api/schemas/offer";

import { untilLabel } from "@/lib/time";
import { m } from "@/paraglide/messages";

import { shortDate } from "./format";

const DAY_MS = 86_400_000;

export type TradeMenuKey = "report" | "cancel" | "askCancel";

type TradeMenuItem = {
  key: TradeMenuKey;
  label: string;
  /** why it can't be used; set means the item shows disabled */
  reason: string | null;
};

export function tradeMenuItems(trade: Trade, hydrated: boolean) {
  const list: TradeMenuItem[] = [];
  const inProgress = trade.status === "in_progress";
  if (inProgress || (trade.status === "failed" && trade.canReport)) {
    const opens = new Date(Date.parse(trade.acceptedAt) + REPORT_AFTER_DAYS * DAY_MS);
    list.push({
      key: "report",
      label: m.offer_report_problem(),
      reason: trade.canReport
        ? null
        : // the viewer's zone, so the date waits for the client
          hydrated
          ? m.offer_report_opens({ date: shortDate(opens.toISOString()) })
          : "",
    });
  }
  if (inProgress) {
    list.push({
      key: "cancel",
      label: m.offer_trade_cancel(),
      reason: trade.canCancel
        ? null
        : trade.cancelLocked
          ? m.offer_cancel_locked()
          : trade.indexerBehind
            ? m.offer_refused_indexer_behind()
            : "",
    });
    // an open request shows on the status card instead
    if (!trade.canCancel && !trade.cancelRequest) {
      const opens = trade.cancelAskOpensAt;
      list.push({
        key: "askCancel",
        label: m.offer_cancel_ask(),
        reason: opens
          ? // the viewer's zone, so the time waits for the client
            hydrated
            ? m.offer_cancel_ask_opens({ date: untilLabel(opens) })
            : ""
          : null,
      });
    }
  }
  return list;
}
