import { ArrowClockwiseIcon, ChatCircleIcon, WarningIcon } from "@phosphor-icons/react";
import type { TradeView as Trade } from "@repo/api/schemas/offer";
import type { ValidObjekt } from "@repo/lib/types/objekt";
import { useQuery } from "@tanstack/react-query";
import { Link, useHydrated } from "@tanstack/react-router";
import { useState } from "react";

import { PendingStatus } from "@/components/router/pending";
import { CopyButton } from "@/components/shared/copy-button";
import { EmptyState } from "@/components/shared/empty-state";
import { PersonAvatar } from "@/components/shared/person-avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useSafetyDialogs } from "@/features/moderation/safety-dialogs";
import { ObjektDrawer } from "@/features/objekt/drawer";
import { m } from "@/paraglide/messages";
import { useUserSocketLive } from "@/stores/user-socket";

import { CancelTrade } from "./cancel-trade";
import { offerNo, tradeNo, tradeStatusText } from "./format";
import { Mono, MonoMessage } from "./mono";
import { NextStepBanner } from "./next-step-banner";
import type { Collections } from "./pick";
import { tradeOptions } from "./queries";
import { StatusBadge, statusTone } from "./status-badge";
import { TradeClockPanel } from "./trade-clock-panel";
import { TradeHistoryPanel } from "./trade-history-panel";
import { TradeLegs } from "./trade-legs";
import { TradeMenu } from "./trade-menu";
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

function TradeDetail({ trade, collections }: { trade: Trade; collections: Collections }) {
  const name = trade.partner.identity.name;
  const address = trade.partner.identity.address;
  const hydrated = useHydrated();
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

  const openChat = (bar: boolean) => (
    <Button
      variant={bar ? "default" : "outline"}
      size={bar ? "xl" : "sm"}
      className={bar ? "flex-1" : undefined}
      render={<Link to="/messages/$id" params={{ id: String(trade.conversationId) }} />}
    >
      <ChatCircleIcon />
      {m.offer_open_chat()}
    </Button>
  );

  return (
    <article className="bg-card grid grid-cols-1 rounded-xl border lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="flex min-w-0 flex-col gap-6 p-4 sm:p-6">
        <header className="flex items-center gap-3">
          <PersonAvatar name={name} image={trade.partner.user.image} className="size-10 shrink-0" />
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex min-w-0 items-center gap-1">
              <h2 className="truncate font-mono text-base font-semibold" title={name}>
                {name}
              </h2>
              {address ? (
                <CopyButton
                  text={address}
                  label={m.offer_copy_address()}
                  toastTitle={m.profile_header_address_copied()}
                />
              ) : null}
            </div>
            <TrustLine reputation={trade.partner.reputation} />
            <p className="text-muted-foreground truncate text-xs">
              <Mono>{tradeNo(trade.id)}</Mono> ·{" "}
              <MonoMessage
                values={[offerNo(trade.offerId)]}
                text={([offer]) => m.offer_trade_from_offer({ offer: offer! })}
              />
            </p>
          </div>
          <StatusBadge tone={statusTone(trade.status)} className="shrink-0">
            {tradeStatusText(trade.status)}
          </StatusBadge>
          <div className="flex shrink-0 items-center gap-2 max-sm:hidden">
            {openChat(false)}
            <TradeMenu
              trade={trade}
              hydrated={hydrated}
              onReport={safety.openReport}
              onCancel={() => setCancelOpen(true)}
            />
          </div>
        </header>

        <NextStepBanner
          trade={trade}
          collections={collections}
          name={name}
          hydrated={hydrated}
          onCancel={() => setCancelOpen(true)}
          onReport={safety.openReport}
        />

        <TradeSteps trade={trade} hydrated={hydrated} />

        <TradeLegs trade={trade} collections={collections} hydrated={hydrated} onOpen={setActive} />
      </div>

      <aside className="border-t p-4 sm:p-6 lg:border-s lg:border-t-0">
        {trade.status === "in_progress" ? (
          <TradeClockPanel
            trade={trade}
            collections={collections}
            name={name}
            hydrated={hydrated}
          />
        ) : (
          <TradeHistoryPanel
            trade={trade}
            collections={collections}
            name={name}
            hydrated={hydrated}
          />
        )}
      </aside>

      <div className="bg-card sticky bottom-0 flex items-center gap-2 rounded-b-xl border-t p-3 pb-[calc(env(safe-area-inset-bottom,0px)+--spacing(3))] sm:hidden">
        {openChat(true)}
        <TradeMenu
          trade={trade}
          hydrated={hydrated}
          size="icon-xl"
          onReport={safety.openReport}
          onCancel={() => setCancelOpen(true)}
        />
      </div>

      <CancelTrade
        trade={trade}
        collections={collections}
        open={cancelOpen}
        onOpenChange={setCancelOpen}
      />
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
