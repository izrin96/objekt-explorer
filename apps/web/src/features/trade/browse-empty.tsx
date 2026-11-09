import { CardsThreeIcon } from "@phosphor-icons/react";

import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import type { useUserLists } from "@/features/user/hooks";
import { m } from "@/paraglide/messages";

import { type FeedSearch, forYouFallback } from "./browse-search";
import { type comparedList, pickOf, type tradeListsOf } from "./compare-rule";
import { NoMatches } from "./no-matches";

/** The feed's empty state, once its query has nothing and no page left to fetch. */
export function BrowseEmpty({
  search,
  forYou,
  mode,
  mutual,
  collectionFiltering,
  filtering,
  scopeNarrowed,
  signedIn,
  comparedTrade,
  userLists,
  tradeLists,
  onReset,
  onSearch,
}: {
  search: FeedSearch;
  forYou: boolean;
  mode: "any" | "mutual" | "off";
  mutual: boolean;
  collectionFiltering: boolean;
  filtering: boolean;
  scopeNarrowed: boolean;
  signedIn: boolean;
  comparedTrade: ReturnType<typeof comparedList>;
  userLists: ReturnType<typeof useUserLists>;
  tradeLists: ReturnType<typeof tradeListsOf>;
  onReset: () => void;
  onSearch: (patch: Partial<FeedSearch>) => void;
}) {
  const comparedName = comparedTrade?.name;
  return forYou && collectionFiltering ? (
    <EmptyState
      icon={CardsThreeIcon}
      title={m.trade_browse_no_filter_title()}
      hint={m.trade_browse_empty_hint()}
      action={
        <Button variant="outline" size="sm" onClick={onReset}>
          {m.filter_reset_filter()}
        </Button>
      }
    />
  ) : mutual ? (
    <EmptyState
      icon={CardsThreeIcon}
      title={
        comparedName
          ? m.trade_browse_no_mutual_list_title({ list: comparedName })
          : m.trade_browse_no_mutual_title()
      }
      hint={m.trade_browse_no_mutual_hint()}
      action={
        <div className="flex flex-wrap justify-center gap-2">
          {comparedName ? (
            <Button variant="outline" size="sm" onClick={() => onSearch({ list: undefined })}>
              {m.trade_list_all()}
            </Button>
          ) : null}
          <Button variant="outline" size="sm" onClick={() => onSearch({ match: "any" })}>
            {m.trade_browse_show_any()}
          </Button>
        </div>
      }
    />
  ) : mode === "any" ? (
    <NoMatches
      compared={
        comparedTrade ? userLists.find((list) => list.slug === comparedTrade.slug) : undefined
      }
      counted={
        comparedTrade
          ? [comparedTrade, pickOf(comparedTrade, tradeLists).paired].flatMap((list) =>
              list ? [list.slug] : [],
            )
          : tradeLists.map((list) => list.slug)
      }
      showAll={forYouFallback(search)}
      onAllLists={() => onSearch({ list: undefined })}
    />
  ) : (
    <EmptyState
      icon={CardsThreeIcon}
      title={m.trade_browse_empty_title()}
      hint={
        filtering
          ? m.trade_browse_empty_hint()
          : scopeNarrowed
            ? signedIn
              ? m.trade_browse_scope_empty_hint_menu()
              : m.trade_browse_scope_empty_hint_settings()
            : m.trade_browse_empty_none_hint()
      }
      action={
        filtering ? (
          <Button variant="outline" size="sm" onClick={onReset}>
            {m.filter_reset_filter()}
          </Button>
        ) : undefined
      }
    />
  );
}
