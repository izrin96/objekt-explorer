import {
  ArrowClockwiseIcon,
  ChatCircleIcon,
  FlagIcon,
  LockSimpleIcon,
  ShieldCheckIcon,
  WarningIcon,
} from "@phosphor-icons/react";
import { type TradeView as Trade, TRADE_RATINGS, type TradeRating } from "@repo/api/schemas/offer";
import type { ValidObjekt } from "@repo/lib/types/objekt";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useHydrated } from "@tanstack/react-router";
import { useId, useState } from "react";

import { PendingStatus } from "@/components/router/pending";
import { EmptyState } from "@/components/shared/empty-state";
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogPopup,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { untilLabel } from "@/features/chat/format";
import { useSafetyDialogs } from "@/features/moderation/safety-dialogs";
import { ObjektDrawer } from "@/features/objekt/drawer";
import { orpc } from "@/lib/orpc";
import { TONE_EDGE, TONE_FILL, TONE_INK } from "@/lib/tone";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";
import { useUserSocketLive } from "@/stores/user-socket";

import { useOfferActions } from "./actions";
import {
  itemLabel,
  offerNo,
  offerRefusalOf,
  offerRefusalText,
  topupText,
  tradeNo,
  tradeStatusText,
} from "./format";
import { LegTable } from "./leg-table";
import { invalidateOfferLists, tradeOptions } from "./queries";
import { SegmentedChoice } from "./segmented-choice";
import { StatusBadge, statusTone } from "./status-badge";
import { TradeSteps } from "./trade-steps";
import { TrustLine } from "./trust-line";

type Collections = Readonly<Record<string, ValidObjekt | undefined>>;

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

  const ended =
    trade.status === "cancelled"
      ? trade.cancelReason === "token_moved"
        ? m.offer_trade_cancelled_moved()
        : trade.cancelledByYou
          ? m.offer_trade_cancelled_by_you()
          : m.offer_trade_cancelled_by_them({ name })
      : trade.status === "failed"
        ? m.offer_trade_failed_desc()
        : null;

  const inProgress = trade.status === "in_progress";
  const completed = trade.status === "completed";
  const firstSender = inProgress ? trade.firstSender : null;
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
          <LegTable
            trade={trade}
            name={name}
            collections={collections}
            hydrated={hydrated}
            onOpen={setActive}
          />
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

/** A suggestion shown the same way to both sides; nothing enforces it. */
function FirstSender({
  sender,
  name,
}: {
  sender: NonNullable<Trade["firstSender"]>;
  name: string;
}) {
  const headline = sender.you ? m.offer_first_you() : m.offer_first_them({ name });
  const follow = sender.sent
    ? sender.you
      ? m.offer_first_you_sent()
      : m.offer_first_them_sent({ name })
    : null;
  return (
    <section
      className={cn(
        "flex flex-col gap-1 rounded-lg border p-3 text-sm",
        TONE_EDGE.progress,
        TONE_FILL.progress,
      )}
    >
      <h3 className="flex items-center gap-1.5 font-medium">
        <ShieldCheckIcon
          aria-hidden
          weight="fill"
          className={cn("size-4 shrink-0", TONE_INK.progress)}
        />
        {m.offer_first_title()}
      </h3>
      <p className="text-pretty">
        {headline}
        {follow ? <> {follow}</> : null}
      </p>
      <p className="text-muted-foreground text-xs text-pretty">{m.offer_first_hint()}</p>
    </section>
  );
}

const RATING_LABEL: Record<TradeRating, () => string> = {
  positive: m.offer_rating_positive,
  neutral: m.offer_rating_neutral,
  negative: m.offer_rating_negative,
};

function Feedback({ trade, name, hydrated }: { trade: Trade; name: string; hydrated: boolean }) {
  const queryClient = useQueryClient();
  const headingId = useId();
  const [error, setError] = useState<string | null>(null);
  const rate = useMutation(
    orpc.offer.rate.mutationOptions({
      // a quick change of mind is sent after the one before it, never beside it
      scope: { id: `rate-${trade.id}` },
      onSuccess: () => {
        setError(null);
        return invalidateOfferLists(queryClient);
      },
      onError: (failure) => {
        const refusal = offerRefusalOf(failure);
        setError((refusal ? offerRefusalText(refusal, "") : null) ?? m.offer_rating_error());
        void invalidateOfferLists(queryClient);
      },
    }),
  );
  const value = rate.isPending ? rate.variables.rating : trade.rating;

  return (
    <section
      aria-labelledby={headingId}
      className={cn(
        "flex flex-col gap-2 rounded-lg border p-3",
        trade.canRate && [TONE_EDGE.success, TONE_FILL.success],
      )}
    >
      <h3 id={headingId} className="text-sm font-medium">
        {trade.status === "in_progress"
          ? m.offer_rating_pending_title()
          : m.offer_rating_title({ name })}
      </h3>
      <SegmentedChoice
        label={m.offer_rating_title({ name })}
        options={TRADE_RATINGS.map((rating) => ({ value: rating, label: RATING_LABEL[rating]() }))}
        value={value}
        disabled={!trade.canRate}
        className="grid w-full grid-cols-3 *:px-1"
        onChange={(rating) => {
          if (rating !== value) rate.mutate({ tradeId: trade.id, rating });
        }}
      />
      <p className="text-muted-foreground text-xs text-pretty">
        {trade.status === "in_progress"
          ? m.offer_rating_pending()
          : trade.canRate && trade.rateUntil && hydrated
            ? m.offer_rating_until({ time: untilLabel(trade.rateUntil) })
            : !trade.canRate
              ? m.offer_rating_closed()
              : null}{" "}
        {m.offer_rating_private()}
      </p>
      <p role="alert" className="text-destructive-foreground text-xs empty:hidden">
        {error}
      </p>
    </section>
  );
}

function CancelTrade({ trade, collections }: { trade: Trade; collections: Collections }) {
  const [open, setOpen] = useState(false);
  const actions = useOfferActions(trade.conversationId, (keys) =>
    trade.legs
      .filter((leg) => keys.has(leg.objektId ?? `any:${leg.collectionSlug}`))
      .map((leg) => itemLabel(leg, collections))
      .join(", "),
  );

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        {m.offer_trade_cancel()}
      </Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogPopup>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {m.offer_trade_cancel_title({ trade: tradeNo(trade.id) })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {m.offer_trade_cancel_desc({ name: trade.partner.identity.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogClose render={<Button variant="outline" />}>
              {m.offer_trade_keep()}
            </AlertDialogClose>
            <Button
              variant="destructive"
              loading={actions.cancelTrade.isPending}
              onClick={() =>
                actions.cancelTrade.mutate(
                  { tradeId: trade.id },
                  { onSettled: () => setOpen(false) },
                )
              }
            >
              {m.offer_trade_cancel()}
            </Button>
          </AlertDialogFooter>
        </AlertDialogPopup>
      </AlertDialog>
    </>
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
