import {
  CurrencyDollarIcon,
  MagnifyingGlassIcon,
  SelectionPlusIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import type { ValidObjekt } from "@repo/lib/types/objekt";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useCallback, useDeferredValue, useMemo, useState } from "react";

import { EmptyState } from "@/components/shared/empty-state";
import { Shimmer } from "@/components/shared/shimmer";
import { Button } from "@/components/ui/button";
import { MenuItem } from "@/components/ui/menu";
import { CompareBanner } from "@/features/compare/compare-banner";
import { isComparing } from "@/features/compare/search-schema";
import { useCompareQuery, useCompareSearch, useSetCompare } from "@/features/compare/use-compare";
import { useScopedFacets } from "@/features/filters/facets";
import { FilterBar } from "@/features/filters/filter-bar";
import { filterObjekts } from "@/features/filters/filter-utils";
import { useCanonicalFilters, useResetFilters } from "@/features/filters/use-filters";
import { ObjektDrawer } from "@/features/objekt/drawer";
import { ObjektCard } from "@/features/objekt/objekt-card";
import { ObjektCardMenu } from "@/features/objekt/objekt-card-menu";
import { ObjektGrid } from "@/features/objekt/objekt-grid";
import { ObjektVirtualGrid } from "@/features/objekt/objekt-virtual-grid";
import { SelectBar, selectBarActionClass, selectBarFillClass } from "@/features/objekt/select-bar";
import { useCurrentUser } from "@/features/user/hooks";
import { m } from "@/paraglide/messages";
import { useColumns } from "@/stores/columns";
import { useClearSelectionOnNavigate, useSelection } from "@/stores/selection";

import { AddToListProvider } from "./add-to-list-dialog";
import { AddToListAction, AddToListMenuItem } from "./add-to-list-menu-item";
import { useListTarget } from "./list-provider";
import { listEntriesOptions } from "./queries";
import { RemoveFromListDialog } from "./remove-from-list-dialog";
import { SetPriceDialog } from "./set-price-dialog";
import { useListOwned } from "./use-list-owned";

/** the list's own currency, not the viewer's */
function formatPrice(currency: string, objekt: ValidObjekt): string {
  if (objekt.isQyop) return m.list_manage_objekt_set_price_qyop();
  if (objekt.price === undefined || objekt.price === null) return m.list_price_none();
  return `${currency} ${objekt.price.toFixed(2)}`;
}

export function ListView() {
  const list = useListTarget();

  return (
    // a bound list takes only objekts its own profile owns
    <AddToListProvider
      address={list.isProfileBind ? (list.profileAddress ?? undefined) : undefined}
    >
      <ListEntries />
    </AddToListProvider>
  );
}

function ListEntries() {
  const list = useListTarget();
  const isOwner = useListOwned();
  const { data: user } = useCurrentUser();
  const columns = list.gridColumns ?? undefined;

  const search = useCompareSearch();
  const compare = isComparing(search) ? search : null;
  const setCompare = useSetCompare();
  const clearCompare = useCallback(() => setCompare(null), [setCompare]);

  const entriesQuery = useQuery({ ...listEntriesOptions(list.slug), enabled: compare === null });
  const compareQuery = useCompareQuery(list.slug, compare);
  const query = compare !== null ? compareQuery : entriesQuery;

  const objekts = useMemo(
    () => (compare !== null ? (compareQuery.data?.objekts ?? []) : (entriesQuery.data ?? [])),
    [compare, compareQuery.data, entriesQuery.data],
  );

  const { facets, groups } = useScopedFacets();
  const filters = useCanonicalFilters();
  const deferredFilters = useDeferredValue(filters);
  const reset = useResetFilters();
  const filtered = useMemo(
    () => filterObjekts(deferredFilters, objekts),
    [deferredFilters, objekts],
  );

  const ids = useSelection((s) => s.ids);
  const toggle = useSelection((s) => s.toggle);
  const [active, setActive] = useState<ValidObjekt | null>(null);
  const [priceTarget, setPriceTarget] = useState<ValidObjekt[]>([]);
  const [removeTarget, setRemoveTarget] = useState<ValidObjekt[]>([]);
  const [priceOpen, setPriceOpen] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);

  useClearSelectionOnNavigate();

  const isSale = list.listTypeNew === "sale" && list.currency !== null;
  const canPrice = isOwner && isSale;
  const currency = list.currency ?? "";

  const openPrice = useCallback((objekts: ValidObjekt[]) => {
    setPriceTarget(objekts);
    setPriceOpen(true);
  }, []);

  const openRemove = useCallback((objekts: ValidObjekt[]) => {
    setRemoveTarget(objekts);
    setRemoveOpen(true);
  }, []);

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
          qty={item.length > 1 ? item.length : undefined}
          price={isSale ? formatPrice(currency, objekt) : undefined}
          priceMuted={isSale && (objekt.price ?? null) === null && objekt.isQyop !== true}
          priority={rowIndex < 2}
        >
          {user ? (
            <ObjektCardMenu>
              <AddToListMenuItem objekts={[objekt]} />
              {isOwner && compare === null ? (
                <MenuItem variant="destructive" onClick={() => openRemove(item)}>
                  <TrashIcon />
                  {m.objekt_menu_remove_from_list()}
                </MenuItem>
              ) : null}
              {canPrice && compare === null ? (
                <MenuItem onClick={() => openPrice(item)}>
                  <CurrencyDollarIcon />
                  {m.objekt_menu_set_price()}
                </MenuItem>
              ) : null}
            </ObjektCardMenu>
          ) : null}
        </ObjektCard>
      );
    },
    [ids, toggle, user, isOwner, canPrice, compare, currency, isSale, openPrice, openRemove],
  );

  const selected = useMemo(() => filtered.filter((objekt) => ids.has(objekt.id)), [filtered, ids]);

  if (compare !== null && compareQuery.isError) {
    return (
      <CompareBanner compare={compare} onClear={clearCompare} error={compareQuery.error.message} />
    );
  }

  return (
    <>
      <FilterBar facets={facets} groups={groups} />

      {compare !== null ? <CompareBanner compare={compare} onClear={clearCompare} /> : null}

      {query.isPending ? (
        <ShimmerGrid columns={columns} />
      ) : objekts.length === 0 ? (
        compare !== null ? (
          <EmptyState
            icon={MagnifyingGlassIcon}
            title={m.compare_view_empty_title()}
            hint={
              compare.cmp_mode === "missing"
                ? m.compare_view_empty_missing()
                : m.compare_view_empty_matches()
            }
          />
        ) : (
          <EmptyState
            icon={SelectionPlusIcon}
            title={m.list_empty_title()}
            hint={m.list_empty_hint()}
            action={
              <Button variant="outline" size="sm" render={<Link to="/" />}>
                {m.list_browse_objekts()}
              </Button>
            }
          />
        )
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={MagnifyingGlassIcon}
          title={m.home_empty_title()}
          hint={m.list_filtered_empty_hint()}
          action={
            <Button variant="outline" size="sm" onClick={reset}>
              {m.filter_reset_filter()}
            </Button>
          }
        />
      ) : (
        <>
          <div className="text-muted-foreground font-mono text-[12.5px]">
            <b className="text-foreground font-semibold tabular-nums">
              {filtered.length.toLocaleString()}
            </b>
            {m.common_count_total_suffix()}
          </div>
          <ObjektVirtualGrid
            objekts={filtered}
            filters={deferredFilters}
            columns={columns}
            renderItem={renderObjekt}
          />
        </>
      )}

      <SelectBar visibleIds={filtered.map((objekt) => objekt.id)}>
        {user ? <AddToListAction objekts={filtered} /> : null}
        {/* the list's own writes stay on while comparing: the bar acts on the
            entries behind the result, which are still this list's */}
        {isOwner ? (
          <Button
            size="sm"
            className={`${selectBarFillClass} shrink-0`}
            onClick={() => openRemove(selected)}
          >
            <TrashIcon />
            {m.filter_remove_from_list()}
          </Button>
        ) : null}
        {canPrice ? (
          <Button
            size="sm"
            variant="outline"
            className={`${selectBarActionClass} shrink-0`}
            onClick={() => openPrice(selected)}
          >
            <CurrencyDollarIcon />
            {m.filter_set_price()}
          </Button>
        ) : null}
      </SelectBar>

      <ObjektDrawer objekt={active} onClose={() => setActive(null)} />

      {canPrice ? (
        <SetPriceDialog
          open={priceOpen}
          onOpenChange={setPriceOpen}
          objekts={priceTarget}
          slug={list.slug}
          currency={currency}
        />
      ) : null}
      {isOwner ? (
        <RemoveFromListDialog
          open={removeOpen}
          onOpenChange={setRemoveOpen}
          objekts={removeTarget}
          slug={list.slug}
        />
      ) : null}
    </>
  );
}

function ShimmerGrid({ columns }: { columns?: number }) {
  const responsive = useColumns();
  const count = columns ?? responsive;

  return (
    <ObjektGrid columns={count}>
      {Array.from({ length: count * 3 }).map((_, index) => (
        <Shimmer key={index} className="aspect-photocard rounded-photocard w-full" />
      ))}
    </ObjektGrid>
  );
}
