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
import { BrowsePostSkeleton } from "./browse-post";
import { HiddenPartnersDialog } from "./hidden-partners-dialog";
import { LoadError } from "./load-error";
import { NotShown } from "./not-shown";
import { PartnerCard, type TradePartner } from "./partner-card";
import { forYouOptions } from "./queries";

const partnerCardId = (userId: string) => `partner-${userId}`;
const HIGHLIGHT_MS = 2000;

export function ForYouResults({
  filter,
  list,
  partner,
  onShowAll,
}: {
  filter: TradeFilter;
  list: string | undefined;
  /** scrolled to and highlighted once the cards are in */
  partner: string | undefined;
  onShowAll: () => void;
}) {
  const query = useQuery(forYouOptions(filter, list));
  const hide = useHidePartner();
  const unhide = useUnhidePartner();
  const [active, setActive] = useState<ValidObjekt | null>(null);
  const [hiddenOpen, setHiddenOpen] = useState(false);
  const loaded = query.data !== undefined;

  useEffect(() => {
    if (!partner || !loaded) return;
    const card = document.getElementById(partnerCardId(partner));
    if (!card) return;
    card.scrollIntoView({ block: "start" });
    card.dataset.highlight = "";
    const timer = setTimeout(() => delete card.dataset.highlight, HIGHLIGHT_MS);
    return () => {
      clearTimeout(timer);
      delete card.dataset.highlight;
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

  if (query.isPending) return <CardsSkeleton />;

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
          <div className="flex flex-col gap-4">
            {partners.map((item) => (
              <PartnerCard
                key={item.userId}
                id={partnerCardId(item.userId)}
                partner={item}
                collections={collections}
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

export function CardsSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <BrowsePostSkeleton />
      <BrowsePostSkeleton />
      <BrowsePostSkeleton />
    </div>
  );
}
