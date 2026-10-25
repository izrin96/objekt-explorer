import { ArrowsLeftRightIcon, WarningIcon } from "@phosphor-icons/react";
import type { TradeView } from "@repo/api/schemas/offer";
import type { ValidObjekt } from "@repo/lib/types/objekt";
import { useId } from "react";

import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

import { EstimatedSerialNote } from "./estimated-serial-note";
import { LegCard } from "./leg-card";
import { MonoMessage, Progress, TopupText } from "./mono";
import { type SideStatus, sideStatus } from "./next-step";
import type { Collections } from "./pick";

const STATUS: Record<SideStatus, { text: () => string; ink: string }> = {
  sentVerified: { text: m.offer_side_sent_verified, ink: "text-success-foreground" },
  verified: { text: m.offer_leg_verified, ink: "text-success-foreground" },
  waitingOnThem: { text: m.offer_side_waiting_them, ink: "text-warning-foreground" },
  differentCopy: { text: m.offer_side_different, ink: "text-warning-foreground" },
  youOwe: { text: m.offer_side_you_owe, ink: "text-progress" },
  afterYouSend: { text: m.offer_side_after_you, ink: "text-muted-foreground" },
  notSent: { text: m.offer_side_not_sent, ink: "text-muted-foreground" },
};

/** The exchange: You give and You get, each saying where it stands, then the note. */
export function TradeLegs({
  trade,
  collections,
  onOpen,
}: {
  trade: TradeView;
  collections: Collections;
  onOpen: (objekt: ValidObjekt) => void;
}) {
  const titleId = useId();
  const ended = trade.status !== "in_progress";
  const topupIn = trade.topup ? (trade.topup.payer === "you" ? "give" : "get") : null;
  // past tense once that side moved something; a top-up only moves with a completed trade
  const moved = (key: "give" | "get", legs: TradeView["legs"]) =>
    ended &&
    (legs.some((leg) => leg.state === "verified") ||
      (topupIn === key && trade.status === "completed"));
  const giveLegs = trade.legs.filter((leg) => leg.fromYou);
  const getLegs = trade.legs.filter((leg) => !leg.fromYou);
  const sides = [
    {
      key: "give" as const,
      title: moved("give", giveLegs) ? m.offer_trade_you_gave() : m.offer_side_give(),
      legs: giveLegs,
    },
    {
      key: "get" as const,
      title: moved("get", getLegs) ? m.offer_trade_you_got() : m.offer_side_get(),
      legs: getLegs,
    },
  ];
  const toDecide = getLegs.filter(
    (leg) => leg.state === "waiting" && leg.substitutes.some((copy) => copy.status === "pending"),
  ).length;

  return (
    <section aria-labelledby={titleId} className="bg-card rounded-xl border">
      <header className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b px-4 py-3.5 sm:px-5">
        <h2 id={titleId} className="text-sm font-semibold">
          {m.offer_exchange_title()}
        </h2>
        <span className="text-muted-foreground text-xs">
          {ended && trade.progress.verified === 0 ? (
            m.offer_exchange_nothing_sent()
          ) : (
            <>
              <Progress {...trade.progress} />
              {toDecide > 0 && !ended ? (
                <>
                  {" · "}
                  <MonoMessage
                    values={[toDecide]}
                    text={([count]) => m.offer_exchange_to_decide({ count: count! })}
                  />
                </>
              ) : null}
            </>
          )}
        </span>
      </header>
      <div className="relative grid sm:grid-cols-2">
        {sides.map((side, index) => {
          const status = sideStatus(trade, side.key);
          return (
            <div
              key={side.key}
              className={cn(
                "flex min-w-0 flex-col gap-3.5 px-4 pt-4 pb-5 sm:px-5",
                index === 1 && "max-sm:border-t sm:border-s",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-medium">{side.title}</h3>
                {status ? (
                  <span className={cn("text-xs", STATUS[status].ink)}>{STATUS[status].text()}</span>
                ) : null}
              </div>
              {side.legs.length > 0 || topupIn === side.key ? (
                <ul className="flex flex-col gap-4">
                  {side.legs.map((leg) => (
                    <LegCard
                      key={leg.id}
                      leg={leg}
                      collection={collections[leg.collectionSlug]}
                      ended={ended}
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
          );
        })}
        <span
          aria-hidden
          className="bg-card text-muted-foreground absolute start-1/2 top-6 -translate-x-1/2 py-1.5 max-sm:hidden rtl:translate-x-1/2"
        >
          <ArrowsLeftRightIcon className="size-4.5" />
        </span>
      </div>
      {trade.note ? (
        <blockquote className="text-muted-foreground border-t px-4 pt-3 pb-4 text-sm wrap-anywhere whitespace-pre-wrap sm:px-5">
          {trade.note}
        </blockquote>
      ) : null}
      {trade.legs.some(
        (leg) =>
          leg.state === "waiting" &&
          [leg, ...leg.substitutes].some((shown) => shown.serial !== null && shown.serialEstimated),
      ) ? (
        <div className="border-t px-4 py-3 sm:px-5">
          <EstimatedSerialNote />
        </div>
      ) : null}
    </section>
  );
}
