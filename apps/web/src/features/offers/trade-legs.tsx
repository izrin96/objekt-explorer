import { ArrowsLeftRightIcon, WarningIcon } from "@phosphor-icons/react";
import type { TradeView } from "@repo/api/schemas/offer";
import type { ValidObjekt } from "@repo/lib/types/objekt";

import { m } from "@/paraglide/messages";

import { EstimatedSerialNote } from "./estimated-serial-note";
import { LegCard } from "./leg-card";
import { TopupText } from "./mono";
import type { Collections } from "./pick";

/** You give and You get side by side, then the note and the estimate footnote. */
export function TradeLegs({
  trade,
  collections,
  hydrated,
  onOpen,
}: {
  trade: TradeView;
  collections: Collections;
  hydrated: boolean;
  onOpen: (objekt: ValidObjekt) => void;
}) {
  const ended = trade.status !== "in_progress";
  const topupIn = trade.topup ? (trade.topup.payer === "you" ? "give" : "get") : null;
  const sides = [
    {
      key: "give",
      title: ended ? m.offer_trade_you_gave() : m.offer_side_give(),
      legs: trade.legs.filter((leg) => leg.fromYou),
    },
    {
      key: "get",
      title: ended ? m.offer_trade_you_got() : m.offer_side_get(),
      legs: trade.legs.filter((leg) => !leg.fromYou),
    },
  ];

  return (
    <section className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
        {sides.map((side, index) => (
          <div key={side.key} className="contents">
            {index === 1 ? (
              <ArrowsLeftRightIcon
                aria-hidden
                className="text-muted-foreground mt-8 size-5 justify-self-center max-sm:hidden"
              />
            ) : null}
            <div className="flex min-w-0 flex-col gap-2">
              <h3 className="text-sm font-medium">{side.title}</h3>
              {side.legs.length > 0 || topupIn === side.key ? (
                <ul className="flex flex-col gap-2">
                  {side.legs.map((leg) => (
                    <LegCard
                      key={leg.id}
                      leg={leg}
                      collection={collections[leg.collectionSlug]}
                      hydrated={hydrated}
                      onOpen={onOpen}
                    />
                  ))}
                  {topupIn === side.key && trade.topup ? (
                    <li className="text-warning-foreground flex items-start gap-1.5 text-sm text-pretty">
                      <WarningIcon aria-hidden weight="fill" className="mt-0.5 size-4 shrink-0" />
                      <TopupText topup={trade.topup} />
                    </li>
                  ) : null}
                </ul>
              ) : (
                <p className="text-muted-foreground text-sm">{m.offer_side_nothing()}</p>
              )}
            </div>
          </div>
        ))}
      </div>
      {trade.note ? (
        <blockquote className="border-border text-muted-foreground border-s-2 ps-3 text-sm wrap-anywhere whitespace-pre-wrap">
          {trade.note}
        </blockquote>
      ) : null}
      {trade.legs.some(
        (leg) =>
          leg.state === "waiting" &&
          [leg, ...leg.substitutes].some((shown) => shown.serial !== null && shown.serialEstimated),
      ) ? (
        <EstimatedSerialNote />
      ) : null}
    </section>
  );
}
