import {
  ArrowClockwiseIcon,
  ArrowRightIcon,
  ChatCircleIcon,
  CheckIcon,
  FlagIcon,
  LockSimpleIcon,
  WarningIcon,
} from "@phosphor-icons/react";
import { type TradeView as Trade, TRADE_RATINGS, type TradeRating } from "@repo/api/schemas/offer";
import { truncateAddress } from "@repo/lib/address";
import type { ValidObjekt } from "@repo/lib/types/objekt";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useHydrated } from "@tanstack/react-router";
import { useId, useState } from "react";

import { PendingStatus } from "@/components/router/pending";
import { CopyButton } from "@/components/shared/copy-button";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { untilLabel } from "@/features/chat/format";
import { useSafetyDialogs } from "@/features/moderation/safety-dialogs";
import { ObjektDrawer } from "@/features/objekt/drawer";
import { orpc } from "@/lib/orpc";
import { m } from "@/paraglide/messages";
import { useUserSocketLive } from "@/stores/user-socket";

import { useOfferActions } from "./actions";
import {
  agoLabel,
  itemLabel,
  offerNo,
  offerRefusalOf,
  offerRefusalText,
  topupText,
  tradeNo,
  tradeStatusText,
} from "./format";
import { ItemLabel } from "./item-label";
import { OfferThumb } from "./offer-item";
import { invalidateOfferLists, tradeOptions } from "./queries";
import { SegmentedChoice } from "./segmented-choice";
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

  const times = [
    { label: m.offer_trade_proposed(), at: trade.proposedAt },
    { label: m.offer_trade_accepted(), at: trade.acceptedAt },
    ...(trade.endedAt ? [{ label: m.offer_trade_ended(), at: trade.endedAt }] : []),
  ];

  return (
    <article className="flex flex-col gap-6">
      <header className="flex flex-wrap items-center gap-3">
        <Avatar className="size-10 shrink-0">
          {trade.partner.user.image ? <AvatarImage src={trade.partner.user.image} alt="" /> : null}
          <AvatarFallback>{name.slice(0, 1).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="flex min-w-0 flex-1 flex-col">
          <h2 className="text-base font-semibold break-words">{m.offer_trade_with({ name })}</h2>
          <TrustLine reputation={trade.partner.reputation} />
          <p className="text-muted-foreground text-xs tabular-nums">
            {tradeNo(trade.id)} · {m.offer_trade_from_offer({ offer: offerNo(trade.offerId) })}
          </p>
        </div>
        <Badge variant="outline" className="shrink-0">
          {tradeStatusText(trade.status)}
        </Badge>
      </header>

      {ended ? <p className="text-muted-foreground text-sm text-pretty">{ended}</p> : null}

      <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-6 gap-y-1 text-sm">
        {times.map((time) => (
          <div key={time.label} className="contents">
            <dt className="text-muted-foreground">{time.label}</dt>
            {/* in the viewer's zone, unknown to the server render */}
            <dd className="tabular-nums">
              <time dateTime={time.at}>{hydrated ? untilLabel(time.at) : null}</time>
            </dd>
          </div>
        ))}
      </dl>

      {trade.firstSender ? <FirstSender sender={trade.firstSender} name={name} /> : null}

      <section aria-labelledby={legsId} className="flex flex-col gap-2">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <h3 id={legsId} className="text-sm font-medium">
            {m.offer_trade_legs()}
          </h3>
          <p className="text-muted-foreground text-sm tabular-nums" aria-live="polite">
            {m.offer_progress(trade.progress)}
          </p>
        </div>
        <ul className="flex flex-col divide-y rounded-lg border">
          {trade.legs.map((leg) => (
            <li key={leg.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 p-3">
              <OfferThumb
                slug={leg.collectionSlug}
                collection={collections[leg.collectionSlug]}
                onOpen={setActive}
                className="w-10"
              />
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-sm font-medium break-words">
                  <ItemLabel item={leg} collections={collections} />
                </span>
                <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
                  <span>{leg.fromYou ? m.offer_you() : name}</span>
                  <ArrowRightIcon aria-hidden className="size-3" />
                  <span className="sr-only">{m.offer_trade_to()}</span>
                  <span>{leg.fromYou ? name : m.offer_you()}</span>
                </span>
              </span>
              <LegState leg={leg} lastCheckedAt={trade.lastCheckedAt} hydrated={hydrated} />
            </li>
          ))}
        </ul>
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

      {trade.canRate || trade.rating !== null ? (
        <Feedback trade={trade} name={name} hydrated={hydrated} />
      ) : null}

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            render={<Link to="/messages/$id" params={{ id: String(trade.conversationId) }} />}
          >
            <ChatCircleIcon />
            {m.offer_open_chat()}
          </Button>
          {trade.canCancel ? <CancelTrade trade={trade} collections={collections} /> : null}
          {trade.canReport ? (
            <Button variant="outline" size="sm" onClick={safety.openReport}>
              <FlagIcon />
              {m.offer_report_problem()}
            </Button>
          ) : null}
        </div>
        {trade.cancelLocked ? (
          <p className="text-muted-foreground flex items-center gap-1.5 text-xs text-pretty">
            <LockSimpleIcon aria-hidden className="size-3.5 shrink-0" />
            {m.offer_cancel_locked()}
          </p>
        ) : null}
      </div>

      <ObjektDrawer objekt={active} onClose={() => setActive(null)} />
      {safety.dialogs}
    </article>
  );
}

function LegState({
  leg,
  lastCheckedAt,
  hydrated,
}: {
  leg: Trade["legs"][number];
  lastCheckedAt: string | null;
  hydrated: boolean;
}) {
  if (leg.state === "verified") {
    return (
      <span className="flex flex-col items-end gap-0.5 text-xs">
        <Badge variant="outline">
          <CheckIcon weight="bold" aria-hidden />
          {m.offer_leg_verified()}
        </Badge>
        {leg.txHash ? (
          <span className="text-muted-foreground flex items-center gap-1">
            <span className="font-mono" title={leg.txHash}>
              {truncateAddress(leg.txHash)}
            </span>
            <CopyButton
              text={leg.txHash}
              label={m.offer_copy_hash()}
              toastTitle={m.offer_hash_copied()}
            />
            {/* relative to the viewer's clock, so it waits for the client */}
            {leg.verifiedAt && hydrated ? (
              <time dateTime={leg.verifiedAt}>{agoLabel(leg.verifiedAt)}</time>
            ) : null}
          </span>
        ) : null}
      </span>
    );
  }
  if (leg.state === "waiting") {
    return (
      <span className="flex flex-col items-end gap-0.5 text-xs">
        <Badge variant="outline">{m.offer_leg_waiting()}</Badge>
        {lastCheckedAt && hydrated ? (
          <time dateTime={lastCheckedAt} className="text-muted-foreground">
            {m.offer_leg_checked({ time: agoLabel(lastCheckedAt) })}
          </time>
        ) : null}
      </span>
    );
  }
  return (
    <Badge variant="outline" className="text-muted-foreground">
      {m.offer_leg_closed()}
    </Badge>
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
    <section className="flex flex-col gap-1 rounded-lg border p-3 text-sm">
      <p className="font-medium text-pretty">
        {headline}
        {follow ? <span className="font-normal"> {follow}</span> : null}
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
    <section aria-labelledby={headingId} className="flex flex-col gap-2">
      <h3 id={headingId} className="text-sm font-medium">
        {m.offer_rating_title({ name })}
      </h3>
      <SegmentedChoice
        label={m.offer_rating_title({ name })}
        options={TRADE_RATINGS.map((rating) => ({ value: rating, label: RATING_LABEL[rating]() }))}
        value={value}
        disabled={!trade.canRate}
        onChange={(rating) => {
          if (rating !== value) rate.mutate({ tradeId: trade.id, rating });
        }}
      />
      <p className="text-muted-foreground text-xs text-pretty">
        {trade.canRate && trade.rateUntil && hydrated
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
