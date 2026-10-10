import { CardsThreeIcon } from "@phosphor-icons/react";
import { canBeOnTrade, pickedSides, tradeSideOf } from "@repo/api/schemas/list";
import { filterFits, type TradeFilter } from "@repo/api/schemas/trade";
import { Link, useNavigate } from "@tanstack/react-router";

import { PendingStatus } from "@/components/router/pending";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SingleSelect } from "@/features/filters/single-select";
import { LIST_TYPE_LABEL } from "@/features/list/list-type-badge";
import { useUserLists } from "@/features/user/hooks";
import { m } from "@/paraglide/messages";

import { ALL_LISTS, COMPARE, MATCHES, SIDE, type TradeList } from "./for-you-compare";
import { RowsSkeleton, ForYouResults } from "./for-you-results";
import { MatchHelp } from "./match-help";
import type { ForYouSearch } from "./search-schema";

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
  const tradeLists: TradeList[] = useUserLists().flatMap((l) =>
    l.listTypeNew !== "general" && canBeOnTrade(l.listTypeNew, l.isProfileBind)
      ? [
          {
            id: l.id,
            slug: l.slug,
            name: l.name,
            listTypeNew: l.listTypeNew,
            linkedListId: l.linkedList?.id ?? null,
          },
        ]
      : [],
  );
  const pickOf = (l: TradeList) => {
    const sides = pickedSides(l, tradeLists);
    return {
      paired: sides.paired,
      ways: { have: sides.haveListIds.length > 0, want: sides.wantListIds.length > 0 },
    };
  };
  // a one-way view compares only one kind of list, so the picker offers only that kind
  const ofKind = (match: TradeFilter, l: TradeList) =>
    SIDE[match] === "both" || tradeSideOf(l.listTypeNew) === SIDE[match];
  const compare = COMPARE[SIDE[filter]];
  const pickable = tradeLists.filter((l) => ofKind(filter, l));
  // a view a list cannot fill is offered disabled rather than shown empty
  const canShow = (match: TradeFilter, l: TradeList) => filterFits(match, pickOf(l).ways);
  // a slug that is not one of mine, or that this view cannot show, reads as All lists
  const selected = pickable.find((l) => l.slug === list && canShow(filter, l));
  const selectedList = selected?.slug ?? ALL_LISTS;

  const setSearch = (next: { match?: TradeFilter; list?: string }) =>
    void navigate({
      search: (prev): ForYouSearch => {
        const match = next.match ?? prev.match ?? "all";
        // the list as read, so a slug that read as All lists does not come back on the next change
        const merged = next.list ?? selectedList;
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
          options={MATCHES.map((item) => ({
            value: item.value,
            label: item.label(),
            disabled: selected !== undefined && !canShow(item.value, selected),
          }))}
          value={filter}
          defaultValue="all"
          onChange={(value) => {
            // a one-way view of the other kind names the linked list, so the pair stays compared
            const paired = selected && pickOf(selected).paired;
            const nextList =
              !selected || ofKind(value, selected)
                ? undefined
                : paired && ofKind(value, paired)
                  ? paired.slug
                  : ALL_LISTS;
            setSearch({ match: value, list: nextList });
          }}
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
                disabled: !canShow(filter, l),
              })),
            ]}
            value={selectedList}
            defaultValue={ALL_LISTS}
            onChange={(value) => setSearch({ list: value })}
          />
        ) : null}

        <MatchHelp view="forYou" />
      </div>

      {tradeLists.length > 0 ? (
        <p className="text-muted-foreground -mt-1 text-xs text-pretty">
          {selected ? compare.one(selected, pickOf(selected).paired) : compare.all()}
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
      <RowsSkeleton />
    </>
  );
}
