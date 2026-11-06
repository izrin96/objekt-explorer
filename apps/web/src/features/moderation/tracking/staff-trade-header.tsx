import { CaretLeftIcon } from "@phosphor-icons/react";
import type { StaffTrade } from "@repo/api/schemas/staff-totals";
import { Link } from "@tanstack/react-router";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { tradeNo, tradeStatusText } from "@/features/offers/format";
import { m } from "@/paraglide/messages";

import { When } from "../console/when";
import { SANCTION_LABEL } from "../labels";
import { TRADE_STATUS_BADGE, tradeEndText } from "./labels";
import { PersonLink, Slotted } from "./parts";

function BackLink() {
  return (
    <Button
      variant="ghost"
      size="sm"
      className="self-start"
      render={<Link to="/mod/trades" search={{ days: 30 }} />}
    >
      <CaretLeftIcon />
      {m.mod_trades_title()}
    </Button>
  );
}

export function StaffTradeHeader({ trade }: { trade: StaffTrade }) {
  const reason = tradeEndText(trade.status, trade.cancelReason);
  const [first, second] = trade.parties;

  return (
    <div className="flex flex-col gap-2">
      <BackLink />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="font-display text-xl font-semibold tracking-tight">
            <Slotted
              text={(trade) => m.mod_staff_trade_title({ trade })}
              node={<span className="font-mono">{tradeNo(trade.id)}</span>}
            />
          </h1>
          <p className="text-muted-foreground flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm">
            <span>
              {m.offer_trade_accepted()} <When iso={trade.acceptedAt} />
            </span>
            {first && second ? (
              <>
                <span aria-hidden>·</span>
                <Party party={first} />
                <span aria-hidden>·</span>
                <Party party={second} />
              </>
            ) : null}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Badge size="lg" variant={TRADE_STATUS_BADGE[trade.status]}>
            {tradeStatusText(trade.status)}
          </Badge>
          {reason === null ? null : <span className="text-muted-foreground text-xs">{reason}</span>}
        </div>
      </div>
      <p className="text-muted-foreground text-xs">{m.mod_staff_trade_no_text()}</p>
    </div>
  );
}

function Party({ party }: { party: StaffTrade["parties"][number] }) {
  return (
    <span className="inline-flex items-center gap-1">
      <PersonLink person={party.person} />
      {party.sanctions.map((type) => (
        <Badge key={type} variant="error" size="sm">
          {SANCTION_LABEL[type]()}
        </Badge>
      ))}
    </span>
  );
}
