import { StorefrontIcon } from "@phosphor-icons/react";
import type { ValidCustomSort } from "@repo/cosmo/types/common";
import type { ValidObjekt } from "@repo/lib/types/objekt";
import { useCallback, useMemo, useState } from "react";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Shimmer } from "@/components/shared/shimmer";
import { Button } from "@/components/ui/button";
import type { ExtraFacet } from "@/features/filters/facet-controls";
import { useScopedFacets } from "@/features/filters/facets";
import { FilterBar } from "@/features/filters/filter-bar";
import { useFilters, useResetFilters } from "@/features/filters/use-filters";
import { AddToListProvider } from "@/features/list/add-to-list-dialog";
import { AddToListAction, AddToListMenuItem } from "@/features/list/add-to-list-menu-item";
import { ObjektDrawer } from "@/features/objekt/drawer";
import { ObjektCard } from "@/features/objekt/objekt-card";
import { ObjektCardMenu } from "@/features/objekt/objekt-card-menu";
import { ObjektGrid } from "@/features/objekt/objekt-grid";
import { ObjektVirtualGrid } from "@/features/objekt/objekt-virtual-grid";
import { SelectBar } from "@/features/objekt/select-bar";
import { useCurrency } from "@/features/settings/use-currency";
import { useCurrentUser } from "@/features/user/hooks";
import { m } from "@/paraglide/messages";
import { useColumns } from "@/stores/columns";
import { useClearSelectionOnNavigate, useSelection } from "@/stores/selection";

import { FloorPriceFilter } from "./filter-floor-price";
import { getPriceLabel, hasFloorPrice } from "./price-label";
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
];

function ShimmerGrid() {
  const columns = useColumns();
  return (
    <ObjektGrid columns={columns}>
      {Array.from({ length: columns * 3 }).map((_, index) => (
        <Shimmer key={index} className="aspect-photocard rounded-photocard w-full" />
      ))}
    </ObjektGrid>
  );
}

export function MarketView() {
  const { data: user } = useCurrentUser();
  const { facets, groups } = useScopedFacets();
  const { filtered, filters, totalListings, isPending } = useMarketObjekts();
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
    () => [
      {
        key: "floor",
        label: m.filter_floor_price(),
        active: floorActive,
        Control: FloorPriceFilter,
      },
    ],
    [floorActive],
  );

  const renderObjekt = useCallback(
    ({ item, rowIndex }: { item: ValidObjekt[]; rowIndex: number }) => {
      const objekt = item[0];
      if (!objekt) return null;
      return (
        <ObjektCard
          objekt={objekt}
          selected={ids.has(objekt.id)}
          onToggleSelect={(value) => toggle(value.id)}
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

      <FilterBar
        facets={facets}
        groups={groups}
        sorts={MARKET_SORTS}
        showPricedOnly
        extras={extras}
      />

      {!isPending && (
        <div className="text-muted-foreground font-mono text-[12.5px]">
          <b className="text-foreground font-semibold tabular-nums">
            {filtered.length.toLocaleString()}
          </b>
          {m.common_count_total_suffix()} ·{" "}
          <b className="text-foreground font-semibold tabular-nums">
            {m.market_listing_count({ count: totalListings.toLocaleString() })}
          </b>
        </div>
      )}

      {isPending ? (
        <ShimmerGrid />
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
        <ObjektVirtualGrid objekts={filtered} filters={filters} renderItem={renderObjekt} />
      )}

      <SelectBar visibleIds={filtered.map((objekt) => objekt.id)}>
        {user ? <AddToListAction objekts={filtered} /> : null}
      </SelectBar>
      <ObjektDrawer objekt={active} onClose={() => setActive(null)} />
    </AddToListProvider>
  );
}
