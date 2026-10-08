import { CardsThreeIcon } from "@phosphor-icons/react";
import { canBeOnTrade, tradeSideOf } from "@repo/api/schemas/list";
import type { TradeFilter } from "@repo/api/schemas/trade";
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
import { CardsSkeleton, ForYouResults } from "./for-you-results";
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
