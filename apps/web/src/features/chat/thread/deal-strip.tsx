import type { Deal } from "@repo/api/schemas/chat-deal";
import { Link, useHydrated } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { leftLabel, shortDate } from "@/features/offers/format";
import { useMinuteClock } from "@/hooks/use-minute-clock";
import { TONE_INK, TONE_SOLID } from "@/lib/tone";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

import { type StripAction, stripText } from "../deal-text";

/**
 * The conversation's deal under the thread header, outside the scroller so it stays in view:
 * one line and one action, a second line from `md` up.
 */
export function DealStrip({
  deal,
  hadOffer,
  name,
  onShowOffer,
  onOffer,
}: {
  deal: Deal | null;
  hadOffer: boolean;
  name: string;
  onShowOffer: (offerId: number) => void;
  /** null wherever the message box is hidden or replaced by a notice */
  onOffer: (() => void) | null;
}) {
  const hydrated = useHydrated();
  const now = useMinuteClock();
  const text = stripText(deal, hadOffer, name, {
    left: (iso) => leftLabel(iso, now),
    date: shortDate,
  });
  const label: Record<StripAction, () => string> = {
    review: m.chat_deal_review_offer,
    view: m.chat_deal_view_offer,
    openTrade: m.chat_deal_open_trade,
    rate: m.chat_deal_rate,
    makeOffer: m.offer_composer,
  };
  const action =
    deal?.kind === "trade" ? (
      <Button
        variant="outline"
        size="sm"
        className="shrink-0"
        render={<Link to="/trade/mine/$tradeId" params={{ tradeId: String(deal.id) }} />}
      >
        {label[text.action]()}
      </Button>
    ) : deal?.kind === "offer" ? (
      <Button variant="outline" size="sm" className="shrink-0" onClick={() => onShowOffer(deal.id)}>
        {label[text.action]()}
      </Button>
    ) : onOffer ? (
      <Button variant="outline" size="sm" className="shrink-0" onClick={() => onOffer()}>
        {label.makeOffer()}
      </Button>
    ) : null;
  // times and dates are the viewer's, so the second line waits for the client
  return <StripFrame text={text} action={action} second={hydrated ? text.second : null} />;
}

function StripFrame({
  text,
  action,
  second,
}: {
  text: ReturnType<typeof stripText>;
  action: ReactNode;
  second: string | null;
}) {
  return (
    <div className="flex min-w-0 shrink-0 items-center gap-3 border-b px-3 py-2 md:px-4">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className={cn("flex min-w-0 items-center gap-1.5 text-sm", TONE_INK[text.tone])}>
          {text.no ? (
            <>
              <span
                aria-hidden
                className={cn("size-2 shrink-0 rounded-full", TONE_SOLID[text.tone])}
              />
              <span className="shrink-0 font-mono font-medium">{text.no}</span>
              <span aria-hidden className="shrink-0">
                ·
              </span>
            </>
          ) : null}
          <span className="min-w-0 truncate">{text.words}</span>
          {text.trailing ? (
            <>
              <span aria-hidden className="shrink-0">
                ·
              </span>
              <span className="shrink-0 tabular-nums">{text.trailing}</span>
            </>
          ) : null}
        </p>
        {second ? (
          <p className="text-muted-foreground truncate text-xs max-md:hidden">{second}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}
