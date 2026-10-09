import {
  ArrowClockwiseIcon,
  ChatCircleIcon,
  ClockCountdownIcon,
  FlagIcon,
  LockSimpleIcon,
  WarningIcon,
} from "@phosphor-icons/react";
import { TRADE_EXPIRE_DAYS, type TradeView as Trade } from "@repo/api/schemas/offer";
import type { ValidObjekt } from "@repo/lib/types/objekt";
import { useQuery } from "@tanstack/react-query";
import { Link, useHydrated } from "@tanstack/react-router";
import { useId, useState } from "react";

import { PendingStatus } from "@/components/router/pending";
import { EmptyState } from "@/components/shared/empty-state";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { untilLabel } from "@/features/chat/format";
import { useSafetyDialogs } from "@/features/moderation/safety-dialogs";
import { ObjektDrawer } from "@/features/objekt/drawer";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";
import { useUserSocketLive } from "@/stores/user-socket";

import { CancelTrade } from "./cancel-trade";
import { EstimatedSerialNote } from "./estimated-serial-note";
import { FirstSender } from "./first-sender";
import { offerNo, topupText, tradeNo, tradeStatusText } from "./format";
import { LegTable } from "./leg-table";
import type { Collections } from "./pick";
import { tradeOptions } from "./queries";
import { StatusBadge, statusTone } from "./status-badge";
import { Feedback } from "./trade-feedback";
import { TradeSteps } from "./trade-steps";
import { TrustLine } from "./trust-line";

export function TradeView({ id }: { id: number }) {
  const live = useUserSocketLive((state) => state.live);
  const query = useQuery(tradeOptions(id, live));

  if (query.isPending) return <TradeViewSkeleton />;

  if (query.isError) {
    return (
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
    );
  }

  return <TradeDetail trade={query.data.trade} collections={query.data.collections} />;
}

function endedText(trade: Trade, name: string) {
  if (trade.status === "failed") {
    return trade.cancelReason === "expired"
      ? m.offer_trade_failed_expired_desc({ days: TRADE_EXPIRE_DAYS })
      : m.offer_trade_failed_desc();
  }
  if (trade.status !== "cancelled") return null;
  if (trade.cancelReason === "token_moved") return m.offer_trade_cancelled_moved();
  if (trade.cancelReason === "not_transferable") {
    return m.offer_trade_cancelled_not_transferable();
  }
  if (trade.cancelReason === "expired") {
    return m.offer_trade_cancelled_expired({ days: TRADE_EXPIRE_DAYS });
  }
  return trade.cancelledByYou
    ? m.offer_trade_cancelled_by_you()
    : m.offer_trade_cancelled_by_them({ name });
}

function TradeDetail({ trade, collections }: { trade: Trade; collections: Collections }) {
  const name = trade.partner.identity.name;
  const hydrated = useHydrated();
  const [active, setActive] = useState<ValidObjekt | null>(null);
  const legsId = useId();
  const safety = useSafetyDialogs({
    userId: trade.partner.userId,
    name,
    trade: {
      id: trade.id,
      attachment: m.offer_report_attached({ trade: tradeNo(trade.id) }),
      reason: "scam",
    },
  });

  const ended = endedText(trade, name);

  const inProgress = trade.status === "in_progress";
  const completed = trade.status === "completed";
  const firstSender = inProgress ? trade.firstSender : null;
  const behind = trade.indexerBehind;
  const aside = inProgress || completed;

  return (
    <article
      className={cn(
        "bg-card grid rounded-lg border",
        aside && "lg:grid-cols-[minmax(0,1fr)_18rem]",
      )}
    >
      <div className="flex min-w-0 flex-col gap-6 p-4 sm:p-6">
        <header className="flex flex-wrap items-center gap-3">
          <Avatar className="size-10 shrink-0">
            {trade.partner.user.image ? (
              <AvatarImage src={trade.partner.user.image} alt="" />
            ) : null}
            <AvatarFallback>{name.slice(0, 1).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="flex min-w-0 flex-1 flex-col">
            <h2 className="text-base font-semibold break-words">{m.offer_trade_with({ name })}</h2>
            <TrustLine reputation={trade.partner.reputation} />
            <p className="text-muted-foreground text-xs tabular-nums">
              {tradeNo(trade.id)} · {m.offer_trade_from_offer({ offer: offerNo(trade.offerId) })}
            </p>
          </div>
          <StatusBadge tone={statusTone(trade.status)} className="shrink-0">
            {tradeStatusText(trade.status)}
          </StatusBadge>
        </header>

        {ended ? (
          <p className="text-muted-foreground text-sm text-pretty">
            {ended}
            {trade.endedAt && hydrated ? (
              <>
                {" "}
                <span className="tabular-nums">
                  {m.offer_trade_ended()}{" "}
                  <time dateTime={trade.endedAt}>{untilLabel(trade.endedAt)}</time>
                </span>
              </>
            ) : null}
          </p>
        ) : null}

        <TradeSteps trade={trade} completed={completed} hydrated={hydrated} />

        <section aria-labelledby={legsId} className="flex flex-col gap-1">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <h3 id={legsId} className="text-sm font-medium">
              {m.offer_trade_legs()}
            </h3>
            <p className="text-muted-foreground text-sm tabular-nums" aria-live="polite">
              {m.offer_progress(trade.progress)}
            </p>
          </div>
          {behind ? (
            <Alert variant="warning" className="my-1">
              <ClockCountdownIcon aria-hidden />
              <AlertDescription>
                {/* the viewer's own clock time, so it waits for the client */}
                {trade.seenUntil && hydrated
                  ? m.offer_indexer_behind({ time: untilLabel(trade.seenUntil) })
                  : m.offer_indexer_behind_unknown()}
              </AlertDescription>
            </Alert>
          ) : null}
          <LegTable
            trade={trade}
            name={name}
            collections={collections}
            hydrated={hydrated}
            onOpen={setActive}
          />
          {trade.legs.some(
            (leg) =>
              leg.state === "waiting" &&
              [leg, ...leg.substitutes].some(
                (shown) => shown.serial !== null && shown.serialEstimated,
              ),
          ) ? (
            <EstimatedSerialNote />
          ) : null}
        </section>

        {trade.topup ? (
          <p className="text-warning-foreground flex items-start gap-1.5 text-sm text-pretty">
            <WarningIcon aria-hidden weight="fill" className="mt-0.5 size-4 shrink-0" />
            {topupText(trade.topup)}
          </p>
        ) : null}

        {trade.note ? (
          <p className="bg-secondary rounded-md px-3 py-2 text-sm wrap-anywhere whitespace-pre-wrap">
            {trade.note}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            render={<Link to="/messages/$id" params={{ id: String(trade.conversationId) }} />}
          >
            <ChatCircleIcon />
            {m.offer_open_chat()}
          </Button>
          {trade.canReport ? (
            <Button variant="outline" size="sm" onClick={safety.openReport}>
              <FlagIcon />
              {m.offer_report_problem()}
            </Button>
          ) : null}
          {trade.canCancel ? (
            <span className="ms-auto">
              <CancelTrade trade={trade} collections={collections} />
            </span>
          ) : trade.cancelLocked ? (
            <p className="text-muted-foreground ms-auto flex items-center gap-1.5 text-xs text-pretty">
              <LockSimpleIcon aria-hidden className="size-3.5 shrink-0" />
              {m.offer_cancel_locked()}
            </p>
          ) : behind ? (
            <p className="text-muted-foreground ms-auto flex items-center gap-1.5 text-xs text-pretty">
              <ClockCountdownIcon aria-hidden className="size-3.5 shrink-0" />
              {m.offer_refused_indexer_behind()}
            </p>
          ) : null}
        </div>
      </div>

      {aside ? (
        <aside className="flex flex-col gap-3 border-t p-4 sm:p-6 lg:border-s lg:border-t-0">
          {firstSender ? <FirstSender sender={firstSender} name={name} /> : null}
          <Feedback trade={trade} name={name} hydrated={hydrated} />
          {inProgress ? (
            <section className="flex flex-col gap-1 rounded-lg border p-3 text-sm">
              <h3 className="font-medium">{m.offer_stall_title()}</h3>
              <p className="text-muted-foreground text-xs text-pretty">{m.offer_stall_body()}</p>
            </section>
          ) : null}
        </aside>
      ) : null}

      <ObjektDrawer objekt={active} onClose={() => setActive(null)} />
      {safety.dialogs}
    </article>
  );
}

/** Also the route's pending view. */
export function TradeViewSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <PendingStatus />
      <Skeleton className="h-8 w-1/3" />
      <Skeleton className="h-24 rounded-lg" />
    </div>
  );
}
