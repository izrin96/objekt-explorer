import type { TradeView as Trade } from "@repo/api/schemas/offer";

import { m } from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";

import { itemLabel, serialText, tradeStatusText } from "./format";
import type { Collections } from "./pick";
import type { TimelineRow } from "./trade-clock";

export function label(row: TimelineRow, trade: Trade, name: string, collections: Collections) {
  switch (row.kind) {
    case "proposed":
      return m.offer_trade_proposed();
    case "accepted":
      return m.offer_trade_accepted();
    case "sent":
      return row.leg.fromYou
        ? m.offer_clock_you_sent({ objekt: itemLabel(row.leg, collections) })
        : m.offer_clock_they_sent({ name, objekt: itemLabel(row.leg, collections) });
    case "confirmed":
      return row.leg.fromYou
        ? m.offer_clock_they_confirmed({ name, objekt: itemLabel(row.leg, collections) })
        : m.offer_clock_you_confirmed({ objekt: itemLabel(row.leg, collections) });
    case "sentGroup": {
      const counts = {
        count: row.legs.length.toLocaleString(getLocale()),
        total: row.total.toLocaleString(getLocale()),
      };
      return row.fromYou
        ? m.offer_clock_you_sent_many(counts)
        : m.offer_clock_they_sent_many({ name, ...counts });
    }
    case "copyArrived": {
      const sent = serialText({ serial: row.copy.serial, estimated: row.copy.serialEstimated });
      return row.leg.fromYou
        ? m.offer_timeline_copy_you_sent({ sent })
        : m.offer_timeline_copy_they_sent({ name, sent });
    }
    case "cancelAsked":
      return row.byYou
        ? m.offer_clock_you_asked_cancel()
        : m.offer_clock_they_asked_cancel({ name });
    case "copyDue":
      return m.offer_clock_copy_due({
        sent: serialText({ serial: row.copy.serial, estimated: row.copy.serialEstimated }),
      });
    case "reminder":
      return m.offer_clock_reminder();
    case "report":
      return m.offer_clock_report();
    case "today":
      return m.offer_clock_today();
    case "ends":
      return row.outcome === "completed"
        ? m.offer_clock_ends_completed()
        : row.outcome === "failed"
          ? m.offer_clock_ends_failed()
          : m.offer_clock_ends_cancelled();
    case "rate":
      return m.offer_clock_rate();
    case "end":
      return row.outcome === "agreed"
        ? m.offer_clock_cancelled_agreed()
        : tradeStatusText(trade.status);
    case "rateCloses":
      return m.offer_timeline_rate_closes();
  }
}

export function cancelAnswerText(status: Extract<TimelineRow, { kind: "cancelAsked" }>["status"]) {
  switch (status) {
    case "pending":
      return m.offer_clock_cancel_waiting();
    case "accepted":
      return m.offer_clock_cancel_accepted();
    case "declined":
      return m.offer_clock_cancel_declined();
    case "withdrawn":
      return m.offer_clock_cancel_withdrawn();
    case "lapsed":
      return m.offer_clock_cancel_lapsed();
  }
}
