import { UsersIcon } from "@phosphor-icons/react";
import type { TradeFilter } from "@repo/api/schemas/trade";
import type { ValidObjekt } from "@repo/lib/types/objekt";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { ObjektDrawer } from "@/features/objekt/drawer";
import { addActionToast } from "@/lib/action-toast";
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
  const loaded = query.data !== undefined;
  // rows start open unless idle; this holds the ones the user (or a link) flipped
  const [toggled, setToggled] = useState<ReadonlySet<string>>(new Set());
  const [opened, setOpened] = useState<string>();
  const target = partner ? query.data?.partners.find((item) => item.userId === partner) : undefined;
  if (partner && target?.idle && opened !== partner) {
    setOpened(partner);
    setToggled(new Set(toggled).add(partner));
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

  const { partners, collections, notShown } = query.data;

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
          <p className="text-muted-foreground text-sm tabular-nums">
            {m.trade_partner_count({ count: partners.length })}
          </p>
          <div className="flex flex-col gap-3">
            {partners.map((item) => (
              <PartnerRow
                key={item.userId}
                id={partnerRowId(item.userId)}
                partner={item}
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
