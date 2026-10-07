import { ArrowClockwiseIcon, CardsThreeIcon, UsersIcon, WarningIcon } from "@phosphor-icons/react";
import type { TradeFilter } from "@repo/api/schemas/trade";
import type { ValidObjekt } from "@repo/lib/types/objekt";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { PendingStatus } from "@/components/router/pending";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toastManager } from "@/components/ui/toast";
import { SingleSelect } from "@/features/filters/single-select";
import { LIST_TYPE_LABEL } from "@/features/list/list-type-badge";
import { ObjektDrawer } from "@/features/objekt/drawer";
import { useUserLists } from "@/features/user/hooks";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

import { useHidePartner, useUnhidePartner } from "./actions";
import { HiddenPartnersDialog } from "./hidden-partners-dialog";
import { PartnerRow, type TradePartner } from "./partner-row";
import { forYouOptions } from "./queries";
import type { ForYouSearch } from "./search-schema";

const MATCHES: { value: TradeFilter; label: () => string }[] = [
  { value: "all", label: m.trade_show_everyone },
  { value: "mutual", label: m.trade_filter_mutual },
  { value: "they_want", label: m.trade_filter_they_want },
  { value: "they_have", label: m.trade_filter_they_have },
];

/** the kind of list a one-way view compares; both ways it is either */
const SIDE: Record<TradeFilter, "have" | "want" | null> = {
  all: null,
  mutual: null,
  they_want: "have",
  they_have: "want",
};

const ALL_LABEL = {
  both: m.trade_list_all,
  have: m.trade_list_all_have,
  want: m.trade_list_all_want,
};

/** no list slug is this short, so it cannot collide with one */
const ALL_LISTS = "all";

const partnerRowId = (userId: string) => `partner-${userId}`;

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
  const tradeLists = useUserLists().filter(
    (l) => l.listTypeNew === "have" || l.listTypeNew === "want",
  );
  // a one-way view compares only one kind of list, so the picker offers only that kind
  const side = SIDE[filter];
  const pickable = side ? tradeLists.filter((l) => l.listTypeNew === side) : tradeLists;
  // a slug that is not one of mine, or not this view's kind, reads as All lists
  const selectedList = pickable.some((l) => l.slug === list) ? list! : ALL_LISTS;
  const applies = (match: TradeFilter, slug: string) =>
    !SIDE[match] || tradeLists.find((l) => l.slug === slug)?.listTypeNew === SIDE[match];

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
              { value: ALL_LISTS, label: ALL_LABEL[side ?? "both"]() },
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
          {compareSentence(
            pickable.find((l) => l.slug === selectedList),
            side,
          )}
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
  /** opened and scrolled to once the rows are in */
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
    document.getElementById(partnerRowId(partner))?.scrollIntoView({ block: "start" });
  }, [partner, loaded]);

  const onHide = (partner: TradePartner) =>
    hide.mutate(
      { userId: partner.userId },
      {
        onSuccess: () =>
          toastManager.add({
            type: "success",
            title: m.trade_hide_success({ name: partner.identity.name }),
            actionProps: {
              children: m.common_actions_undo(),
              onClick: () => unhide.mutate({ userId: partner.userId }),
            },
          }),
      },
    );

  if (query.isPending) return <PartnerRowsSkeleton />;

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
          <div className="flex flex-col divide-y rounded-lg border">
            {partners.map((item) => (
              <PartnerRow
                key={item.userId}
                id={partnerRowId(item.userId)}
                defaultOpen={item.userId === partner}
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

function PartnerRowsSkeleton() {
  return (
    <div className="flex flex-col gap-1.5">
      <Skeleton className="h-16 rounded-lg" />
      <Skeleton className="h-16 rounded-lg" />
      <Skeleton className="h-16 rounded-lg" />
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
      <PartnerRowsSkeleton />
    </>
  );
}

/**
 * What is compared. Both ways, a named list narrows only its own direction, so the other
 * keeps every list; a one-way view names only the side it shows.
 */
function compareSentence(
  list: { name: string; listTypeNew: string } | undefined,
  side: "have" | "want" | null,
) {
  if (side === "have") {
    return list ? m.trade_compare_have_only({ list: list.name }) : m.trade_compare_all_have();
  }
  if (side === "want") {
    return list ? m.trade_compare_want_only({ list: list.name }) : m.trade_compare_all_want();
  }
  if (!list) return m.trade_compare_all();
  return list.listTypeNew === "have"
    ? m.trade_compare_have({ list: list.name })
    : m.trade_compare_want({ list: list.name });
}
