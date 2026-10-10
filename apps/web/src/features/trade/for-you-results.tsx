import { UsersIcon } from "@phosphor-icons/react";
import type { TradeFilter } from "@repo/api/schemas/trade";
import type { ValidObjekt } from "@repo/lib/types/objekt";
import { useQuery } from "@tanstack/react-query";
import { Link, useHydrated } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { ObjektDrawer } from "@/features/objekt/drawer";
import { MonoMessage } from "@/features/offers/mono";
import { useMinuteClock } from "@/hooks/use-minute-clock";
import { addActionToast } from "@/lib/action-toast";
import { relativeTime } from "@/lib/time";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

import { useHidePartner, useUnhidePartner } from "./actions";
import { HiddenPartnersDialog } from "./hidden-partners-dialog";
import { LoadError } from "./load-error";
import { NotShown } from "./not-shown";
import { PartnerRow, PartnerRowSkeleton, type TradePartner } from "./partner-row";
import { forYouOptions } from "./queries";

const partnerRowId = (userId: string) => `partner-${userId}`;
const HIGHLIGHT_MS = 2000;

export function ForYouResults({
  filter,
  list,
  partner,
  onShowAll,
}: {
  filter: TradeFilter;
  list: string | undefined;
  /** scrolled to and highlighted once the rows are in */
  partner: string | undefined;
  onShowAll: () => void;
}) {
  const query = useQuery(forYouOptions(filter, list));
  const hide = useHidePartner();
  const unhide = useUnhidePartner();
  const [active, setActive] = useState<ValidObjekt | null>(null);
  const [hiddenOpen, setHiddenOpen] = useState(false);
  // the times are relative to the viewer's clock, so they wait for hydration
  const hydrated = useHydrated();
  const clock = useMinuteClock();
  const now = hydrated ? clock : undefined;
  const loaded = query.data !== undefined;
  // rows start open unless idle; this holds the ones the user (or a link) flipped
  const [toggled, setToggled] = useState<ReadonlySet<string>>(new Set());
  const [opened, setOpened] = useState<string>();
  const target = partner ? query.data?.partners.find((item) => item.userId === partner) : undefined;
  if (partner && target && opened !== partner) {
    setOpened(partner);
    const next = new Set(toggled);
    if (target.idle) next.add(partner);
    else next.delete(partner);
    setToggled(next);
  }
  const toggle = (userId: string) => {
    const next = new Set(toggled);
    if (!next.delete(userId)) next.add(userId);
    setToggled(next);
  };

  useEffect(() => {
    if (!partner || !loaded) return;
    const row = document.getElementById(partnerRowId(partner));
    if (!row) return;
    row.scrollIntoView({ block: "start" });
    row.dataset.highlight = "";
    const timer = setTimeout(() => delete row.dataset.highlight, HIGHLIGHT_MS);
    return () => {
      clearTimeout(timer);
      delete row.dataset.highlight;
    };
  }, [partner, loaded]);

  const onHide = (partner: TradePartner) =>
    hide.mutate(
      { userId: partner.userId },
      {
        onSuccess: () =>
          addActionToast(
            { type: "success", title: m.trade_hide_success({ name: partner.identity.name }) },
            {
              label: m.common_actions_undo(),
              onClick: () => unhide.mutate({ userId: partner.userId }),
            },
          ),
      },
    );

  if (query.isPending) return <RowsSkeleton />;

  if (query.isError) {
    return <LoadError onRetry={() => void query.refetch()} />;
  }

  const { partners, collections, notShown, checkedAt } = query.data;

  return (
    <div
      aria-busy={query.isPlaceholderData}
      className={cn("flex flex-col gap-3", query.isPlaceholderData && "opacity-60")}
    >
      {partners.length === 0 ? (
        <EmptyState
          icon={UsersIcon}
          title={m.trade_empty_title()}
          hint={m.trade_empty_hint()}
          action={
            filter === "all" ? (
              <Button variant="outline" size="sm" render={<Link to="/list" />}>
                {m.nav_manage_list()}
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={onShowAll}>
                {m.trade_show_all()}
              </Button>
            )
          }
        />
      ) : (
        <>
          <p className="text-muted-foreground flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-sm tabular-nums">
            <MonoMessage
              values={[partners.length]}
              text={([count]) => m.trade_partner_count({ count: count! })}
            />
            <time dateTime={checkedAt} className="font-mono text-xs">
              {now !== undefined
                ? m.trade_checked_at({
                    time: relativeTime(Math.min(Date.parse(checkedAt), now), now),
                  })
                : null}
            </time>
          </p>
          <div className="flex flex-col gap-3">
            {partners.map((item) => (
              <PartnerRow
                key={item.userId}
                id={partnerRowId(item.userId)}
                partner={item}
                now={now}
                collections={collections}
                open={!item.idle !== toggled.has(item.userId)}
                onOpenChange={() => toggle(item.userId)}
                onOpen={setActive}
                onHide={onHide}
              />
            ))}
          </div>
        </>
      )}

      <NotShown notShown={notShown} onShowHidden={() => setHiddenOpen(true)} />

      <ObjektDrawer objekt={active} onClose={() => setActive(null)} />
      <HiddenPartnersDialog open={hiddenOpen} onOpenChange={setHiddenOpen} />
    </div>
  );
}

export function RowsSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <PartnerRowSkeleton />
      <PartnerRowSkeleton />
      <PartnerRowSkeleton />
    </div>
  );
}
