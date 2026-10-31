import { MagnifyingGlassIcon, StorefrontIcon } from "@phosphor-icons/react";
import type { ValidCustomSort } from "@repo/cosmo/types/common";
import type { MarketObjekt, ValidObjekt } from "@repo/lib/types/objekt";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";

import { CountBar, TotalCount } from "@/components/shared/count-bar";
import { EmptyState } from "@/components/shared/empty-state";
import { countMarkup, MessageMarkup } from "@/components/shared/message-markup";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { CompareBanner } from "@/features/compare/compare-banner";
import { useSetCompare } from "@/features/compare/use-compare";
import type { ExtraFacet } from "@/features/filters/facet-controls";
import { useScopedFacets } from "@/features/filters/facets";
import { FilterBar } from "@/features/filters/filter-bar";
import { LONG_TAIL } from "@/features/filters/long-tail";
import { MemberChips } from "@/features/filters/member-chips";
import { useFilters, useResetFilters } from "@/features/filters/use-filters";
import { AddToListProvider } from "@/features/list/add-to-list-dialog";
import { AddToListAction, AddToListMenuItem } from "@/features/list/add-to-list-menu-item";
import { ShowMyMatches } from "@/features/list/show-my-matches";
import { ObjektDrawer } from "@/features/objekt/drawer";
import { ObjektCard } from "@/features/objekt/objekt-card";
import { ObjektCardMenu } from "@/features/objekt/objekt-card-menu";
import { ObjektVirtualGrid } from "@/features/objekt/objekt-virtual-grid";
import { SelectBar, SelectModeButton } from "@/features/objekt/select-bar";
import { SkeletonGrid } from "@/features/objekt/skeleton-grid";
import { useCurrency } from "@/features/settings/use-currency";
import { marketMatchesOptions } from "@/features/trade/queries";
import { useCurrentUser } from "@/features/user/hooks";
import { m } from "@/paraglide/messages";
import { useClearSelectionOnNavigate, useSelection } from "@/stores/selection";

import { FloorPriceFilter } from "./filter-floor-price";
import { MarketCompareButton } from "./market-compare-button";
import { getPriceLabel, hasFloorPrice } from "./price-label";
import { useMarketCompare } from "./use-market-compare";
import { useMarketObjekts } from "./use-market-objekts";

/** a listing has a floor, an age and a depth; a catalogue row has none of the three */
const MARKET_SORTS: readonly ValidCustomSort[] = [
  "listedAt",
  "floor",
  "supply",
  "date",
  "season",
  "collectionNo",
  "member",
  "rare",
];

export function MarketView() {
  const { data: user } = useCurrentUser();
  const { facets, groups } = useScopedFacets();
  const marketCompare = useMarketCompare();
  const { compare } = marketCompare;
  const setCompare = useSetCompare();
  const clearCompare = useCallback(() => setCompare(null), [setCompare]);
  const [showMatches, setShowMatches] = useState(false);
  const matchesOn = !!user && showMatches;
  const matchesQuery = useQuery(marketMatchesOptions(matchesOn));
  const wanted = matchesOn ? matchesQuery.data?.want : undefined;
  const market = useMarketObjekts(marketCompare.ownedSlugs, wanted);
  const { filtered, filters, rarityMap, totalListings } = market;
  const isPending =
    market.isPending || marketCompare.isPending || (matchesOn && matchesQuery.isPending);
  // the banner, or Show my matches, carries the error; an unfiltered grid under it would read
  // as the result
  const narrowingFailed = marketCompare.error !== undefined || (matchesOn && matchesQuery.isError);
  const { formatUsd } = useCurrency();
  const reset = useResetFilters();
  const floorMin = useFilters((f) => f.floor_min);
  const floorMax = useFilters((f) => f.floor_max);
  const ids = useSelection((s) => s.ids);
  const toggle = useSelection((s) => s.toggle);
  const [active, setActive] = useState<ValidObjekt | null>(null);

  useClearSelectionOnNavigate();

  const floorActive = floorMin !== undefined || floorMax !== undefined;
  // a fresh array each render would re-run the facet parity effect forever
  const extras = useMemo<ExtraFacet[]>(
    () => [{ key: "floor", active: floorActive, Control: FloorPriceFilter }],
    [floorActive],
  );

  const renderObjekt = useCallback(
    ({ item, rowIndex }: { item: MarketObjekt[]; rowIndex: number }) => {
      const objekt = item[0];
      if (!objekt) return null;
      return (
        <ObjektCard
          objekt={objekt}
          selected={ids.has(objekt.id)}
          onToggleSelect={user ? (value) => toggle(value.id) : undefined}
          onOpen={setActive}
          qty={objekt.listingCount}
          price={getPriceLabel(objekt, formatUsd)}
          priceMuted={!hasFloorPrice(objekt)}
          priority={rowIndex < 2}
        >
          {user ? (
            <ObjektCardMenu>
              <AddToListMenuItem objekts={[objekt]} />
            </ObjektCardMenu>
          ) : null}
        </ObjektCard>
      );
    },
    [ids, toggle, formatUsd, user],
  );

  return (
    <AddToListProvider>
      <PageHeader title={m.market_title()} description={m.market_description()} />

      <MemberChips />
      <FilterBar
        facets={facets}
        groups={groups}
        sorts={MARKET_SORTS}
        longTail={LONG_TAIL.market}
        extras={extras}
        actions={
          user ? (
            <>
              <ShowMyMatches
                matching="want"
                on={showMatches}
                onChange={setShowMatches}
                count={wanted ? market.listedCount : null}
                listIds={market.matchedListIds}
                pending={matchesOn && matchesQuery.isPending}
                error={matchesOn ? matchesQuery.error : null}
              />
              <MarketCompareButton activeAddress={marketCompare.activeAddress} />
            </>
          ) : undefined
        }
      />

      {compare !== null ? (
        <CompareBanner compare={compare} onClear={clearCompare} error={marketCompare.error} />
      ) : null}

      {!isPending && !narrowingFailed && (
        <CountBar aside={user && filtered.length > 0 && <SelectModeButton />}>
          <TotalCount count={filtered.length} />
          {" · "}
          <MessageMarkup
            parts={m.market_listing_count.parts({ count: totalListings.toLocaleString() })}
            markup={countMarkup}
          />
        </CountBar>
      )}

      {narrowingFailed ? null : isPending ? (
        <SkeletonGrid />
      ) : wanted && filtered.length === 0 ? (
        <EmptyState
          icon={MagnifyingGlassIcon}
          title={m.list_matches_empty_title()}
          hint={m.market_matches_empty_hint()}
          action={
            <Button variant="outline" size="sm" onClick={() => setShowMatches(false)}>
              {m.list_matches_show_all()}
            </Button>
          }
        />
      ) : compare !== null && market.listedCount === 0 ? (
        <EmptyState
          icon={MagnifyingGlassIcon}
          title={m.compare_view_empty_title()}
          hint={m.market_compare_empty()}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={StorefrontIcon}
          title={m.market_empty()}
          hint={m.market_empty_hint()}
          action={
            <Button variant="outline" size="sm" onClick={reset}>
              {m.filter_reset_filter()}
            </Button>
          }
        />
      ) : (
        <ObjektVirtualGrid
          objekts={filtered}
          filters={filters}
          rarityMap={rarityMap}
          renderItem={renderObjekt}
        />
      )}

      {user && (
        <SelectBar objekts={filtered}>
          <AddToListAction objekts={filtered} />
        </SelectBar>
      )}
      <ObjektDrawer
        objekt={active}
        onClose={() => setActive(null)}
        defaultTab="market"
        selectable={Boolean(user)}
        menu={user && active ? <AddToListMenuItem objekts={[active]} /> : undefined}
      />
    </AddToListProvider>
  );
}
