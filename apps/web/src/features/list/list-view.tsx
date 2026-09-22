import {
  CurrencyDollarIcon,
  MagnifyingGlassIcon,
  SelectionPlusIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import type { ValidCustomSort } from "@repo/cosmo/types/common";
import type { ValidObjekt } from "@repo/lib/types/objekt";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useCallback, useDeferredValue, useMemo, useState } from "react";

import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { MenuItem } from "@/components/ui/menu";
import { CompareBanner } from "@/features/compare/compare-banner";
import { isComparing } from "@/features/compare/search-schema";
import { useCompareQuery, useCompareSearch, useSetCompare } from "@/features/compare/use-compare";
import { GenerateDiscordButton } from "@/features/discord/generate-discord-button";
import { useScopedFacets } from "@/features/filters/facets";
import { FilterBar } from "@/features/filters/filter-bar";
import { LONG_TAIL } from "@/features/filters/filter-popover";
import { filterObjekts } from "@/features/filters/filter-utils";
import { useCanonicalFilters, useResetFilters } from "@/features/filters/use-filters";
import { ObjektDrawer } from "@/features/objekt/drawer";
import { ObjektCard } from "@/features/objekt/objekt-card";
import { ObjektCardMenu } from "@/features/objekt/objekt-card-menu";
import { ownedCopiesOf } from "@/features/objekt/objekt-utils";
import { ObjektVirtualGrid } from "@/features/objekt/objekt-virtual-grid";
import { SelectBar, selectBarActionClass, selectBarFillClass } from "@/features/objekt/select-bar";
import { ShimmerGrid } from "@/features/objekt/shimmer-grid";
import { useCollectionRarity } from "@/features/objekt/use-collection-rarity";
import { useCurrentUser } from "@/features/user/hooks";
import { m } from "@/paraglide/messages";
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
  const { rarityMap, isLoading: rarityLoading } = useCollectionRarity();
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

  // a list card can stand for several copies, so it always sorts by duplicate
  // count; by serial only where the cards carry one, by price only on a sale list
  const sorts = useMemo<readonly ValidCustomSort[]>(
    () => [
      "date",
      "season",
      "collectionNo",
      "member",
      ...(list.isProfileBind && list.hideSerial !== true ? (["serial"] as const) : []),
      "duplicate",
      "rare",
      ...(list.listTypeNew === "sale" ? (["price"] as const) : []),
    ],
    [list.isProfileBind, list.hideSerial, list.listTypeNew],
  );

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
          hideSerial={list.hideSerial === true}
          price={isSale ? formatPrice(currency, objekt) : undefined}
          priceMuted={isSale && (objekt.price ?? null) === null && objekt.isQyop !== true}
          note={isSale ? objekt.note : undefined}
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
    [
      ids,
      toggle,
      user,
      isOwner,
      canPrice,
      compare,
      currency,
      isSale,
      list.hideSerial,
      openPrice,
      openRemove,
    ],
  );

  const selected = useMemo(() => filtered.filter((objekt) => ids.has(objekt.id)), [filtered, ids]);

  // a bound list hiding serials is a list of collections as far as the drawer
  // is concerned, exactly as the website decides its default tab
  const showOwned = list.isProfileBind && list.hideSerial !== true;
  const ownedCopies = useMemo(
    () => (showOwned ? ownedCopiesOf(filtered, active) : []),
    [active, filtered, showOwned],
  );

  if (compare !== null && compareQuery.isError) {
    return (
      <CompareBanner compare={compare} onClear={clearCompare} error={compareQuery.error.message} />
    );
  }

  return (
    <>
      <FilterBar
        facets={facets}
        groups={groups}
        sorts={sorts}
        longTail={LONG_TAIL.list}
        extra={<GenerateDiscordButton objekts={filtered} />}
      />

      {compare !== null ? <CompareBanner compare={compare} onClear={clearCompare} /> : null}

      {query.isPending || rarityLoading ? (
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
            rarityMap={rarityMap}
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

      <ObjektDrawer
        objekt={active}
        onClose={() => setActive(null)}
        owned={showOwned ? ownedCopies : undefined}
        ownedMenu={user ? (item) => <AddToListMenuItem objekts={[item]} /> : undefined}
      />

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
