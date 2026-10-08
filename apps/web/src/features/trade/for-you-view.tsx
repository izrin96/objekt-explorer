import { ArrowClockwiseIcon, CardsThreeIcon, UsersIcon, WarningIcon } from "@phosphor-icons/react";
import { canBeOnTrade, tradeSideOf } from "@repo/api/schemas/list";
import type { TradeFilter } from "@repo/api/schemas/trade";
import type { ValidObjekt } from "@repo/lib/types/objekt";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { PendingStatus } from "@/components/router/pending";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SingleSelect } from "@/features/filters/single-select";
import { LIST_TYPE_LABEL } from "@/features/list/list-type-badge";
import { ObjektDrawer } from "@/features/objekt/drawer";
import { useUserLists } from "@/features/user/hooks";
import { addActionToast } from "@/lib/action-toast";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

import { useHidePartner, useUnhidePartner } from "./actions";
import { BrowsePostSkeleton } from "./browse-post";
import { HiddenPartnersDialog } from "./hidden-partners-dialog";
import { PartnerCard, type TradePartner } from "./partner-card";
import { forYouOptions } from "./queries";
import type { ForYouSearch } from "./search-schema";

const MATCHES: { value: TradeFilter; label: () => string }[] = [
  { value: "all", label: m.trade_show_everyone },
  { value: "mutual", label: m.trade_filter_mutual },
  { value: "they_want", label: m.trade_filter_they_want },
  { value: "they_have", label: m.trade_filter_they_have },
];

type Compared = "have" | "want" | "both";
type TradeList = { name: string; listTypeNew: "have" | "want" | "sale" };

/** the kind of list a one-way view compares; both ways it is either */
const SIDE: Record<TradeFilter, Compared> = {
  all: "both",
  mutual: "both",
  they_want: "have",
  they_have: "want",
};

/**
 * Per kind compared: the All option and what is compared. Both ways, a named list narrows
 * only its own direction, so the other keeps every list; a one-way view names only its side.
 */
const COMPARE: Record<
  Compared,
  { allLabel: () => string; all: () => string; one: (list: TradeList) => string }
> = {
  have: {
    allLabel: m.trade_list_all_have,
    all: m.trade_compare_all_have,
    one: (list) => m.trade_compare_have_only({ list: list.name }),
  },
  want: {
    allLabel: m.trade_list_all_want,
    all: m.trade_compare_all_want,
    one: (list) => m.trade_compare_want_only({ list: list.name }),
  },
  both: {
    allLabel: m.trade_list_all,
    all: m.trade_compare_all,
    one: (list) =>
      tradeSideOf(list.listTypeNew) === "have"
        ? m.trade_compare_have({ list: list.name })
        : m.trade_compare_want({ list: list.name }),
  },
};

/** no list slug is this short, so it cannot collide with one */
const ALL_LISTS = "all";

const partnerCardId = (userId: string) => `partner-${userId}`;
const HIGHLIGHT_MS = 2000;

export function ForYouView({
  filter,
  list,
  partner,
}: {
  filter: TradeFilter;
  list: string | undefined;
  partner: string | undefined;
}) {
  const navigate = useNavigate({ from: "/trade/for-you" });
  const tradeLists = useUserLists().filter((l): l is typeof l & TradeList =>
    canBeOnTrade(l.listTypeNew, l.isProfileBind),
  );
  // a one-way view compares only one kind of list, so the picker offers only that kind
  const side = SIDE[filter];
  const compare = COMPARE[side];
  const pickable =
    side === "both" ? tradeLists : tradeLists.filter((l) => tradeSideOf(l.listTypeNew) === side);
  // a slug that is not one of mine, or not this view's kind, reads as All lists
  const selected = pickable.find((l) => l.slug === list);
  const selectedList = selected?.slug ?? ALL_LISTS;
  const applies = (match: TradeFilter, slug: string) =>
    SIDE[match] === "both" ||
    tradeSideOf(tradeLists.find((l) => l.slug === slug)?.listTypeNew ?? "general") === SIDE[match];

  const setSearch = (next: { match?: TradeFilter; list?: string }) =>
    void navigate({
      search: (prev): ForYouSearch => {
        const match = next.match ?? prev.match ?? "all";
        const merged = next.list ?? prev.list ?? ALL_LISTS;
        return {
          match: match === "all" ? undefined : match,
          list: merged === ALL_LISTS ? undefined : merged,
        };
      },
      resetScroll: false,
    });

  return (
    <>
      <p className="text-muted-foreground text-sm text-pretty">{m.trade_for_you_description()}</p>

      <div className="flex flex-wrap items-center gap-2">
        <SingleSelect<TradeFilter>
          label={m.trade_match_label()}
          options={MATCHES.map((item) => ({ value: item.value, label: item.label() }))}
          value={filter}
          defaultValue="all"
          onChange={(value) =>
            setSearch({
              match: value,
              ...(selectedList !== ALL_LISTS && !applies(value, selectedList)
                ? { list: ALL_LISTS }
                : {}),
            })
          }
        />

        {tradeLists.length > 0 ? (
          <SingleSelect
            label={m.trade_list_label()}
            options={[
              { value: ALL_LISTS, label: compare.allLabel() },
              ...pickable.map((l) => ({
                value: l.slug,
                label: m.trade_list_option({
                  name: l.name,
                  type: LIST_TYPE_LABEL[l.listTypeNew](),
                }),
              })),
            ]}
            value={selectedList}
            defaultValue={ALL_LISTS}
            onChange={(value) => setSearch({ list: value })}
          />
        ) : null}
      </div>

      {tradeLists.length > 0 ? (
        <p className="text-muted-foreground -mt-1 text-xs text-pretty">
          {selected ? compare.one(selected) : compare.all()}
        </p>
      ) : null}

      {tradeLists.length === 0 ? (
        <EmptyState
          icon={CardsThreeIcon}
          title={m.trade_empty_title()}
          hint={m.trade_no_lists_hint()}
          action={
            <Button size="sm" render={<Link to="/list" />}>
              {m.nav_manage_list()}
            </Button>
          }
        />
      ) : (
        <ForYouResults
          filter={filter}
          list={selectedList === ALL_LISTS ? undefined : selectedList}
          partner={partner}
          onShowAll={() => setSearch({ match: "all" })}
        />
      )}
    </>
  );
}

function ForYouResults({
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

function NotShown({
  notShown,
  onShowHidden,
}: {
  notShown: { notOwned: number; notTransferable: number; hidden: number; blocked: number };
  onShowHidden: () => void;
}) {
  const parts = [
    notShown.notOwned > 0 ? m.trade_not_shown_not_owned({ count: notShown.notOwned }) : null,
    notShown.notTransferable > 0
      ? m.trade_not_shown_not_transferable({ count: notShown.notTransferable })
      : null,
    notShown.hidden > 0 ? m.trade_not_shown_hidden({ count: notShown.hidden }) : null,
    notShown.blocked > 0 ? m.trade_not_shown_blocked({ count: notShown.blocked }) : null,
  ].filter((part) => part !== null);

  if (parts.length === 0) return null;

  return (
    <div className="text-muted-foreground flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-lg border border-dashed px-4 py-2.5 text-sm">
      <p className="text-pretty tabular-nums">
        <span className="text-foreground font-medium">{m.trade_not_shown()}</span>{" "}
        {parts.join(" · ")}
      </p>
      {notShown.hidden > 0 ? (
        <Button variant="ghost" size="sm" onClick={onShowHidden}>
          {m.trade_hidden_partners()}
        </Button>
      ) : null}
    </div>
  );
}

/** The route's pending view, under the layout's header and tabs. */
export function ForYouPending() {
  return (
    <>
      <PendingStatus />
      <Skeleton className="h-4 w-80 max-w-full" />
      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-8 w-32 rounded-md" />
        <Skeleton className="h-8 w-32 rounded-md" />
      </div>
      <CardsSkeleton />
    </>
  );
}

function CardsSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <BrowsePostSkeleton />
      <BrowsePostSkeleton />
      <BrowsePostSkeleton />
    </div>
  );
}
