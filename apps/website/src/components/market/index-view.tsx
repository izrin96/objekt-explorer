import { StorefrontIcon } from "@phosphor-icons/react/dist/ssr";
import type { ValidObjekt } from "@repo/lib/types/objekt";
import { QueryErrorResetBoundary } from "@tanstack/react-query";
import { useCallback } from "react";
import { ErrorBoundary } from "react-error-boundary";

import { useConfigStore } from "@/hooks/use-config";
import { useMarketObjekts } from "@/hooks/use-market-objekts";
import { useCurrentUser } from "@/hooks/use-user";
import { formatPrice } from "@/lib/utils";
import { m } from "@/paraglide/messages";

import { ObjektCount } from "../collection/objekt-count";
import { ObjektGridView } from "../collection/objekt-grid";
import { ObjektViewProvider } from "../collection/objekt-view-provider";
import { ObjektVirtualGrid } from "../collection/objekt-virtual-grid";
import { FilterContainer } from "../filters/filter-container";
import { Loader } from "../intentui/loader";
import { AddToListMenu } from "../objekt/actions/list";
import { ObjektStaticMenu } from "../objekt/actions/static-menu";
import ErrorFallbackRender from "../router/error-boundary";
import MarketFilter from "./filter";

export default function MarketRender() {
  return (
    <ObjektViewProvider modalTab="market">
      <div className="flex flex-col gap-4">
        <h2 className="font-display text-xl font-semibold">{m.market_title()}</h2>

        <FilterContainer>
          <div className="flex w-full flex-col gap-4">
            <MarketFilter />
          </div>
        </FilterContainer>

        <QueryErrorResetBoundary>
          {({ reset }) => (
            <ErrorBoundary onReset={reset} FallbackComponent={ErrorFallbackRender}>
              <MarketView />
            </ErrorBoundary>
          )}
        </QueryErrorResetBoundary>
      </div>
    </ObjektViewProvider>
  );
}

function getPriceLabel(objekt: ValidObjekt) {
  if (objekt.floorPrice !== null && objekt.floorPrice !== undefined) {
    return m.market_floor_price({ price: formatPrice(objekt.floorPrice, "USD") });
  }
  return objekt.hasQyop ? m.objekt_qyop() : m.market_price_ask();
}

function MarketView() {
  const { data: user } = useCurrentUser();
  const hideLabel = useConfigStore((a) => a.hideLabel);
  const { filtered, filters, rarityMap, totalListings, isPending } = useMarketObjekts();

  const renderObjekt = useCallback(
    ({ item, rowIndex }: { item: ValidObjekt[]; rowIndex: number }) => {
      const objekt = item[0];
      if (!objekt) return null;
      return (
        <ObjektGridView
          objekts={item}
          hideLabel={hideLabel}
          isPriority={rowIndex < 3}
          priceLabel={getPriceLabel(objekt)}
          staticMenu={
            user && (
              <ObjektStaticMenu>
                <AddToListMenu objekts={[objekt]} />
              </ObjektStaticMenu>
            )
          }
        >
          <ListingCountPill count={objekt.listingCount ?? 0} />
        </ObjektGridView>
      );
    },
    [user, hideLabel],
  );

  if (isPending) {
    return (
      <div className="flex justify-center">
        <Loader variant="ring" />
      </div>
    );
  }

  if (filtered.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-10">
        <StorefrontIcon size={64} weight="light" />
        <span>{m.market_empty()}</span>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <ObjektCount filtered={filtered} />
        <span className="text-muted-fg">·</span>
        <span className="text-muted-fg">
          {m.market_listing_count({ count: totalListings.toLocaleString() })}
        </span>
      </div>
      <ObjektVirtualGrid
        objekts={filtered}
        filters={filters}
        rarityMap={rarityMap}
        renderItem={renderObjekt}
      />
    </>
  );
}

function ListingCountPill({ count }: { count: number }) {
  if (count < 1) return null;
  return (
    <div className="bg-bg text-fg text-xxs pointer-events-none m-1 flex self-end justify-self-start overflow-hidden rounded-full px-1.5 py-0.5 font-medium tabular-nums sm:px-2 sm:py-1 sm:text-xs">
      {count.toLocaleString()}
    </div>
  );
}
