import {
  ArrowClockwiseIcon,
  ChatCircleIcon,
  ClockCountdownIcon,
  WarningIcon,
} from "@phosphor-icons/react";
import type { TradeView as Trade } from "@repo/api/schemas/offer";
import type { ValidObjekt } from "@repo/lib/types/objekt";
import { useQuery } from "@tanstack/react-query";
import { Link, useHydrated } from "@tanstack/react-router";
import { useState } from "react";

import { PendingStatus } from "@/components/router/pending";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { untilLabel } from "@/features/chat/format";
import { useSafetyDialogs } from "@/features/moderation/safety-dialogs";
import { ObjektDrawer } from "@/features/objekt/drawer";
import { m } from "@/paraglide/messages";
import { useUserSocketLive } from "@/stores/user-socket";

import { CancelTrade } from "./cancel-trade";
import { offerNo, tradeNo } from "./format";
import { Mono } from "./mono";
import { nextStep } from "./next-step";
import { CopyAddressButton, DecideActions, NextStepBanner } from "./next-step-banner";
import type { Collections } from "./pick";
import { tradeOptions } from "./queries";
import { TradeLegs } from "./trade-legs";
import { TradeMenu } from "./trade-menu";
import { TradePartnerCard, TradePartnerRow } from "./trade-partner-card";
import { TradeTimeline } from "./trade-timeline";
import { rich } from "./wrong-copy";

/** Reads the clock here: the compiler takes `Date.now` in a component body as a render-time call. */
const readStep = (trade: Trade) => nextStep(trade, Date.now());

const GRID = "grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_--spacing(85)] lg:gap-5";

export function TradeView({ id }: { id: number }) {
  const live = useUserSocketLive((state) => state.live);
  const query = useQuery(tradeOptions(id, live));

  if (query.isPending) return <TradeViewSkeleton id={id} />;

  if (query.isError && !query.data) {
    return (
      <>
        <TradeBreadcrumb id={id} />
        <EmptyState
          icon={WarningIcon}
          title={m.common_error_loading_data()}
          action={
            <Button variant="outline" size="sm" onClick={() => void query.refetch()}>
              <ArrowClockwiseIcon />
              {m.common_error_retry()}
            </Button>
          }
        />
      </>
    );
  }

  return <TradeDetail trade={query.data.trade} collections={query.data.collections} />;
}

/** Trade / My trades / T-n, and the offer the trade came from once it is known. */
function TradeBreadcrumb({ id, trade }: { id: number; trade?: Trade }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
      <nav aria-label={m.offer_breadcrumb()}>
        <ol className="text-muted-foreground flex items-center gap-2">
          <li>
            <Link to="/trade" className="hover:text-foreground">
              {m.nav_trade()}
            </Link>
          </li>
          <li aria-hidden className="text-muted-foreground/60">
            /
          </li>
          <li>
            <Link to="/trade/mine" className="hover:text-foreground">
              {m.page_titles_trade_mine()}
            </Link>
          </li>
          <li aria-hidden className="text-muted-foreground/60">
            /
          </li>
          <li aria-current="page" className="text-foreground font-mono font-medium">
            {tradeNo(id)}
          </li>
        </ol>
      </nav>
      {trade ? (
        <p className="text-muted-foreground ms-auto">
          {rich(m.offer_trade_from_offer, {
            offer: (
              <Link
                to="/messages/$id"
                params={{ id: String(trade.conversationId) }}
                className="text-foreground decoration-muted-foreground/60 underline underline-offset-3"
              >
                <Mono>{offerNo(trade.offerId)}</Mono>
              </Link>
            ),
          })}
        </p>
      ) : null}
    </div>
  );
}

/** While the indexer is behind: once, above the status card, and nowhere else. */
function IndexerStrip({ trade, hydrated }: { trade: Trade; hydrated: boolean }) {
  if (trade.status !== "in_progress" || !trade.indexerBehind) return null;
  return (
    <div
      role="status"
      className="bg-card flex items-start gap-2.5 rounded-lg border px-3.5 py-2.5 text-sm"
    >
      <ClockCountdownIcon aria-hidden className="text-muted-foreground mt-0.5 size-4 shrink-0" />
      <p className="text-pretty">
        {trade.seenUntil && hydrated
          ? m.offer_indexer_behind({ time: untilLabel(trade.seenUntil) })
          : m.offer_indexer_behind_unknown()}
      </p>
    </div>
  );
}

function TradeDetail({ trade, collections }: { trade: Trade; collections: Collections }) {
  const name = trade.partner.identity.name;
  const address = trade.partner.identity.address;
  const hydrated = useHydrated();
  const step = readStep(trade);
  const [active, setActive] = useState<ValidObjekt | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const safety = useSafetyDialogs({
    userId: trade.partner.userId,
    name,
    trade: {
      id: trade.id,
      attachment: m.offer_report_attached({ trade: tradeNo(trade.id) }),
      reason: "scam",
    },
  });
  const menuProps = {
    trade,
    hydrated,
    onReport: safety.openReport,
    onCancel: () => setCancelOpen(true),
  };
  const chatLink = <Link to="/messages/$id" params={{ id: String(trade.conversationId) }} />;

  return (
    <>
      <TradeBreadcrumb id={trade.id} trade={trade} />
      <div className={GRID}>
        <div className="flex min-w-0 flex-col gap-4">
          <IndexerStrip trade={trade} hydrated={hydrated} />
          <NextStepBanner
            trade={trade}
            step={step}
            collections={collections}
            name={name}
            hydrated={hydrated}
            onCancel={() => setCancelOpen(true)}
            onReport={safety.openReport}
          />
          <TradeLegs trade={trade} collections={collections} onOpen={setActive} />
        </div>
        <aside className="flex min-w-0 flex-col gap-4">
          <div className="max-sm:hidden">
            <TradePartnerCard {...menuProps} primary={step.primary} />
          </div>
          <div className="sm:hidden">
            <TradePartnerRow trade={trade} />
          </div>
          <TradeTimeline trade={trade} collections={collections} name={name} hydrated={hydrated} />
        </aside>
      </div>

      {/* -mx-5 -mb-10 undo PageMain's px-5 pb-10, so the bar spans the screen and sits flush */}
      <div className="bg-background sticky bottom-0 -mx-5 -mb-10 flex items-center gap-2 border-t px-5 pt-3 pb-[calc(env(safe-area-inset-bottom,0px)+--spacing(4))] sm:hidden">
        {step.primary === "copyAddress" && address ? (
          <CopyAddressButton address={address} size="xl" className="min-w-0 flex-1" />
        ) : step.kind === "youDecide" ? (
          <DecideActions trade={trade} leg={step.leg} copyId={step.copy.id} size="xl" />
        ) : null}
        {step.primary ? (
          <Button
            variant="outline"
            size="icon-xl"
            aria-label={m.offer_open_chat()}
            render={chatLink}
          >
            <ChatCircleIcon />
          </Button>
        ) : (
          <Button size="xl" className="min-w-0 flex-1" render={chatLink}>
            <ChatCircleIcon />
            {m.offer_open_chat()}
          </Button>
        )}
        <TradeMenu {...menuProps} size="icon-xl" />
      </div>

      <CancelTrade
        trade={trade}
        collections={collections}
        open={cancelOpen}
        onOpenChange={setCancelOpen}
      />
      <ObjektDrawer objekt={active} onClose={() => setActive(null)} />
      {safety.dialogs}
    </>
  );
}

/** Also the route's pending view, drawn in the real grid so the page doesn't shift as it loads. */
export function TradeViewSkeleton({ id }: { id: number }) {
  return (
    <>
      <PendingStatus />
      <TradeBreadcrumb id={id} />
      <div className={GRID}>
        <div className="flex min-w-0 flex-col gap-4">
          <div className="bg-card overflow-hidden rounded-xl border">
            <div className="flex gap-4 p-4 sm:p-5">
              <Skeleton className="size-11 shrink-0 rounded-lg" />
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <Skeleton className="h-5 w-40 rounded-md" />
                <Skeleton className="h-7 w-4/5" />
                <Skeleton className="h-4 w-3/5" />
                <Skeleton className="mt-2 h-8 w-36 sm:h-7" />
              </div>
              <div className="flex w-36 shrink-0 flex-col items-end gap-1.5 max-sm:hidden">
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-7 w-24" />
                <Skeleton className="h-4 w-14" />
              </div>
            </div>
            <div className="grid grid-cols-4 gap-1.5 border-t px-4 pt-3.5 pb-4 sm:gap-3 sm:px-5">
              {[0, 1, 2, 3].map((index) => (
                <div key={index} className="flex flex-col gap-1.5">
                  <Skeleton className="h-1.5 rounded-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              ))}
            </div>
          </div>
          <div className="bg-card rounded-xl border">
            <div className="border-b px-4 py-3.5 sm:px-5">
              <Skeleton className="h-5 w-28" />
            </div>
            <div className="grid sm:grid-cols-2">
              {[0, 1].map((index) => (
                <div
                  key={index}
                  className={
                    index === 1
                      ? "flex flex-col gap-3.5 px-4 pt-4 pb-5 max-sm:border-t sm:border-s sm:px-5"
                      : "flex flex-col gap-3.5 px-4 pt-4 pb-5 sm:px-5"
                  }
                >
                  <Skeleton className="h-5 w-24" />
                  <div className="flex gap-3.5">
                    <Skeleton className="aspect-photocard w-28 shrink-0 rounded-md max-sm:w-21" />
                    <div className="flex flex-1 flex-col gap-2">
                      <Skeleton className="h-5 w-24" />
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="flex min-w-0 flex-col gap-4">
          <Skeleton className="h-56 rounded-xl max-sm:h-18" />
          <Skeleton className="h-72 rounded-xl max-sm:h-12" />
        </div>
      </div>
    </>
  );
}
