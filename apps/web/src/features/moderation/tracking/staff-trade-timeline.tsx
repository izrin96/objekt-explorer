import type { StaffTrade } from "@repo/api/schemas/staff-totals";

import { ItemLabel } from "@/features/offers/item-label";
import { m } from "@/paraglide/messages";

import { When } from "../console/when";
import { tradeEndText } from "./labels";

type Row = StaffTrade["timeline"][number];
type Leg = StaffTrade["legs"][number];

export function StaffTradeTimeline({
  trade,
  legOf,
  nameOf,
}: {
  trade: StaffTrade;
  legOf: Map<Leg["id"], Leg>;
  nameOf: (userId: string | null) => string;
}) {
  return (
    <section aria-labelledby="staff-timeline" className="flex flex-col gap-2">
      <h2 id="staff-timeline" className="text-sm font-semibold">
        {m.mod_staff_trade_timeline()}
      </h2>
      <ol className="flex flex-col gap-3 border-s ps-4">
        {trade.timeline.map((row, i) => {
          const leg = row.legId === null ? undefined : legOf.get(row.legId);
          return (
            <li key={`${row.kind}-${row.legId ?? ""}-${i}`} className="flex flex-col text-sm">
              <When iso={row.at} className="text-muted-foreground text-xs tabular-nums" />
              <span>{timelineText(row, nameOf)}</span>
              {leg ? (
                <span className="text-muted-foreground text-xs">
                  <ItemLabel item={leg} collections={trade.collections} />
                </span>
              ) : null}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function timelineText(row: Row, nameOf: (userId: string | null) => string) {
  const name = nameOf(row.userId);
  switch (row.kind) {
    case "proposed":
      return m.mod_staff_trade_tl_proposed();
    case "accepted":
      return m.mod_staff_trade_tl_accepted();
    case "leg_verified":
      return m.mod_staff_trade_tl_leg_verified({ name });
    case "leg_confirmed":
      return m.mod_staff_trade_tl_leg_confirmed({ name });
    case "leg_away":
      return m.mod_staff_trade_tl_leg_away({ name });
    case "leg_stuck":
      return m.mod_staff_trade_tl_leg_stuck({ name });
    case "copy_sent":
      return m.mod_staff_trade_tl_copy_sent({ name });
    case "copy_accepted":
      return row.auto
        ? m.mod_staff_trade_tl_copy_auto()
        : m.mod_staff_trade_tl_copy_accepted({ name });
    case "copy_declined":
      return m.mod_staff_trade_tl_copy_declined({ name });
    case "cancel_asked":
      return m.mod_staff_trade_tl_cancel_asked({ name });
    case "cancel_accepted":
      return m.mod_staff_trade_tl_cancel_accepted({ name });
    case "cancel_declined":
      return m.mod_staff_trade_tl_cancel_declined({ name });
    case "cancel_withdrawn":
      return m.mod_staff_trade_tl_cancel_withdrawn({ name });
    case "cancel_lapsed":
      return m.mod_staff_trade_tl_cancel_lapsed({ name });
    case "completed":
      return m.mod_staff_trade_tl_completed();
    case "cancelled": {
      const why = tradeEndText("cancelled", row.reason);
      const who =
        row.userId === null
          ? m.mod_staff_trade_tl_cancelled()
          : m.mod_staff_trade_tl_cancelled_by({ name });
      return why === null ? who : `${who} · ${why}`;
    }
    case "failed":
      return tradeEndText("failed", row.reason) ?? m.offer_trade_failed();
  }
}
