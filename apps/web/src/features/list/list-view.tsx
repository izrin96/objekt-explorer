import { CurrencyDollarIcon, MagnifyingGlassIcon, TrashIcon } from "@phosphor-icons/react";
import { ruleLine } from "@repo/api/schemas/list-rule";
import type { ValidCustomSort } from "@repo/cosmo/types/common";
import { truncateAddress } from "@repo/lib/address";
import type { ListObjekt } from "@repo/lib/types/objekt";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useDeferredValue, useMemo, useState } from "react";

import { CountBar, TotalCount } from "@/components/shared/count-bar";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { MenuItem } from "@/components/ui/menu";
import { useCosmoArtist } from "@/features/artist/cosmo-artist-provider";
import { CompareBanner } from "@/features/compare/compare-banner";
import { isComparing } from "@/features/compare/search-schema";
import { useCompareQuery, useCompareSearch, useSetCompare } from "@/features/compare/use-compare";
import { GenerateDiscordButton } from "@/features/discord/generate-discord-button";
import type { ExtraFacet } from "@/features/filters/facet-controls";
import { useScopedFacets } from "@/features/filters/facets";
import { FilterBar } from "@/features/filters/filter-bar";
import { CombineDupsToggle } from "@/features/filters/filter-toggle";
import { filterObjekts } from "@/features/filters/filter-utils";
import { LONG_TAIL } from "@/features/filters/long-tail";
import { useCanonicalFilters, useResetFilters } from "@/features/filters/use-filters";
import { ObjektDrawer } from "@/features/objekt/drawer";
import { ObjektCard } from "@/features/objekt/objekt-card";
import { ObjektCardMenu } from "@/features/objekt/objekt-card-menu";
import { ownedCopiesOf } from "@/features/objekt/objekt-utils";
import { type CardRing, ObjektVirtualGrid } from "@/features/objekt/objekt-virtual-grid";
import { SelectBar, type SelectBarAction, SelectModeButton } from "@/features/objekt/select-bar";
import { SkeletonGrid } from "@/features/objekt/skeleton-grid";
import { useCollectionRarity } from "@/features/objekt/use-collection-rarity";
import { useCurrency } from "@/features/settings/use-currency";
import { NearNote } from "@/features/trade/near-note";
import { PostComposer, useComposer } from "@/features/trade/post-list-dialog";
import { useCurrentUser } from "@/features/user/hooks";
import { refusalText } from "@/lib/refusal";
import { m } from "@/paraglide/messages";
import { useClearSelectionOnNavigate, useSelection } from "@/stores/selection";

import { AddToListProvider } from "./add-to-list-dialog";
import { AddToListAction, AddToListMenuItem } from "./add-to-list-menu-item";
import { EmptyList } from "./list-empty";
import { formatConvertedPrice, formatPrice } from "./list-price";
import { useListTarget } from "./list-provider";
import { listEntriesOptions } from "./queries";
import { RemoveFromListDialog } from "./remove-from-list-dialog";
import { listRulesOptions } from "./rules/queries";
import { RulesStrip } from "./rules/rules-strip";
import { SetPriceDialog } from "./set-price-dialog";
import { canShowMatches, NearMatches, ShowMyMatches, useListMatches } from "./show-my-matches";
import { useEntryDialogs } from "./use-entry-dialogs";
import { useListOwned } from "./use-list-owned";

export function ListView() {
  const list = useListTarget();

  return (
    // a bound list takes only objekts its own profile owns
    <AddToListProvider
      address={list.isProfileBind ? (list.profileAddress ?? undefined) : undefined}
      sourceList={list.isProfileBind && list.hideSerial === true ? list.slug : undefined}
    >
      <RulesStrip />
      <ListEntries />
    </AddToListProvider>
  );
}

function ListEntries() {
  const list = useListTarget();
  const isOwner = useListOwned();
  const { data: user } = useCurrentUser();
  // the owner's column count is ignored while the Objekt Columns setting is removed
  // const columns = list.gridColumns ?? undefined;

  const search = useCompareSearch();
  const compare = isComparing(search) ? search : null;
  const setCompare = useSetCompare();
  const clearCompare = useCallback(() => setCompare(null), [setCompare]);

  // a Compare result is already narrowed to its own question, so the outlines give way to it
  const matchable = canShowMatches(list, !!user, isOwner) && compare === null;
  const [showMatches, setShowMatches] = useState(false);
  const matches = useListMatches(list, matchable && showMatches);

  const { data: rules } = useQuery({
    ...listRulesOptions(list.slug),
    enabled: list.listType === "want",
  });
  const ruleLines =
    list.listType === "want" && rules && rules.length > 0 ? rules.map(ruleLine) : undefined;

  const { selectedArtistIds } = useCosmoArtist();
  const entriesQuery = useQuery({
    ...listEntriesOptions(list.slug, selectedArtistIds),
    enabled: compare === null,
  });
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
  // Show my matches narrows the grid to what matches: an outline is lost on a long list
  const kept = useMemo(() => filterObjekts(deferredFilters, objekts), [deferredFilters, objekts]);
  const filtered = useMemo(() => {
    const matched = matches.slugs;
    return matched ? kept.filter((objekt) => matched.has(objekt.slug)) : kept;
  }, [kept, matches.slugs]);
  const nearObjekts = useMemo(() => {
    const near = matches.near?.slugs;
    return near ? kept.filter((o) => near.has(o.slug)) : [];
  }, [kept, matches.near]);

  const grouped = filters.grouped === true;
  // a fresh array each render would re-run the facet parity effect forever
  const extras = useMemo<ExtraFacet[]>(
    () => [{ key: "grouped", active: grouped, quick: true, Control: CombineDupsToggle }],
    [grouped],
  );

  const ids = useSelection((s) => s.ids);
  const toggle = useSelection((s) => s.toggle);
  // the menu acts on every copy the card stands for, so the open card holds its
  // whole group
  const [activeGroup, setActiveGroup] = useState<ListObjekt[]>([]);

  useClearSelectionOnNavigate();

  const isSale = list.listType === "sale" && list.currency !== null;
  const canPrice = isOwner && isSale;
  const currency = list.currency ?? "";
  const { formatConverted } = useCurrency();

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
      ...(list.listType === "sale" ? (["price"] as const) : []),
    ],
    [list.isProfileBind, list.hideSerial, list.listType],
  );

  const dialogs = useEntryDialogs();
  const { openPrice, openRemove } = dialogs;

  const menuItems = useCallback(
    (objekts: ListObjekt[]) => {
      const objekt = objekts[0];
      if (!objekt) return null;
      return (
        <>
          <AddToListMenuItem objekts={[objekt]} />
          {isOwner && compare === null ? (
            <MenuItem variant="destructive" onClick={() => openRemove(objekts)}>
              <TrashIcon />
              {m.objekt_menu_remove_from_list()}
            </MenuItem>
          ) : null}
          {canPrice && compare === null ? (
            <MenuItem onClick={() => openPrice(objekts)}>
              <CurrencyDollarIcon />
              {m.objekt_menu_set_price()}
            </MenuItem>
          ) : null}
        </>
      );
    },
    [isOwner, canPrice, compare, openPrice, openRemove],
  );

  const renderObjekt = useCallback(
    ({ item, rowIndex, ring }: { item: ListObjekt[]; rowIndex: number; ring?: CardRing }) => {
      const objekt = item[0];
      if (!objekt) return null;
      const unpriced = objekt.price === null && !objekt.isQyop;

      return (
        <ObjektCard
          objekt={objekt}
          selected={ids.has(objekt.id)}
          onToggleSelect={user ? (value) => toggle(value.id) : undefined}
          onOpen={() => setActiveGroup(item)}
          qty={item.length > 1 ? item.length : undefined}
          hideSerial={grouped || list.hideSerial === true}
          price={isSale ? formatPrice(currency, objekt, canPrice) : undefined}
          priceMuted={isSale && unpriced}
          priceConverted={
            isSale ? formatConvertedPrice(currency, objekt, formatConverted) : undefined
          }
          onPriceClick={canPrice && compare === null ? () => openPrice(item) : undefined}
          note={isSale ? objekt.note : undefined}
          priority={rowIndex < 2}
          imageClassName={ring?.className}
          description={ring?.description}
        >
          {user ? <ObjektCardMenu>{menuItems(item)}</ObjektCardMenu> : null}
        </ObjektCard>
      );
    },
    [
      ids,
      toggle,
      user,
      currency,
      formatConverted,
      isSale,
      canPrice,
      compare,
      openPrice,
      grouped,
      list.hideSerial,
      menuItems,
    ],
  );

  const selected = useMemo(() => filtered.filter((objekt) => ids.has(objekt.id)), [filtered, ids]);

  // a bound list hiding serials is a list of collections as far as the drawer
  // is concerned, exactly as the website decides its default tab
  const showOwned = list.isProfileBind && list.hideSerial !== true;
  const activeObjekt = activeGroup[0] ?? null;
  const composer = useComposer();
  // a near card's drawer says why it isn't counted, as a Trade strip's does; a near collection
  // is never a match, so the only card that opens one is in the near section
  const activeNear =
    activeObjekt && matches.near?.slugs.has(activeObjekt.slug) && isTradeRole(list.listType)
      ? {
          verb: matches.near.side.verb,
          role: list.listType,
          theirList: list.name,
          myListIds: matches.near.listIdsOf[activeObjekt.slug] ?? [],
          // as Trade names a person with no name: by the profile's address
          person:
            list.user?.name ??
            (list.profileAddress ? truncateAddress(list.profileAddress) : undefined),
        }
      : null;
  const ownedCopies = useMemo(
    () => (showOwned ? ownedCopiesOf(filtered, activeObjekt) : []),
    [activeObjekt, filtered, showOwned],
  );

  if (compare !== null && compareQuery.isError) {
    return (
      <CompareBanner
        compare={compare}
        onClear={clearCompare}
        error={refusalText(compareQuery.error)}
      />
    );
  }

  // below `sm` these fold into the bar's "⋯" menu, so the bar fits a phone;
  // the list's own writes stay on while comparing: the bar acts on the entries
  // behind the result, which are still this list's
  const ownerActions: SelectBarAction[] = [
    ...(isOwner
      ? [
          {
            label: m.filter_remove_from_list(),
            icon: <TrashIcon />,
            onClick: () => openRemove(selected),
          },
        ]
      : []),
    ...(canPrice
      ? [
          {
            label: m.filter_set_price(),
            icon: <CurrencyDollarIcon />,
            onClick: () => openPrice(selected),
          },
        ]
      : []),
  ];

  const nearSection =
    matches.near && nearObjekts.length > 0 ? (
      <NearMatches
        near={matches.near.side}
        objekts={nearObjekts}
        filters={deferredFilters}
        rarityMap={rarityMap}
        renderItem={renderObjekt}
      />
    ) : null;
  return (
    <>
      <FilterBar
        facets={facets}
        groups={groups}
        sorts={sorts}
        longTail={LONG_TAIL.list}
        extras={extras}
        actions={
          <>
            {matchable ? (
              <ShowMyMatches
                matching={list.listType === "want" ? "have" : "want"}
                on={showMatches}
                onChange={setShowMatches}
                count={matches.slugs?.size ?? null}
                listIds={matches.listIds}
                near={matches.near?.side}
                pending={matches.pending}
                error={matches.error}
              />
            ) : null}
            <GenerateDiscordButton objekts={filtered} rules={ruleLines} />
          </>
        }
      />

      {compare !== null ? <CompareBanner compare={compare} onClear={clearCompare} /> : null}

      {query.isPending || rarityLoading ? (
        <SkeletonGrid />
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
          <EmptyList />
        )
      ) : filtered.length === 0 && matches.slugs ? (
        <>
          <EmptyState
            icon={MagnifyingGlassIcon}
            title={m.list_matches_empty_title()}
            // the near matches under it are on the viewer's lists, which the hint says none are
            hint={nearSection ? undefined : m.list_matches_empty_hint()}
            action={
              <Button variant="outline" size="sm" onClick={() => setShowMatches(false)}>
                {m.list_matches_show_all()}
              </Button>
            }
          />
          {nearSection}
        </>
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
          <CountBar aside={user && <SelectModeButton />}>
            <TotalCount count={filtered.length} />
          </CountBar>
          <ObjektVirtualGrid
            objekts={filtered}
            filters={deferredFilters}
            rarityMap={rarityMap}
            renderItem={renderObjekt}
          />
          {nearSection}
        </>
      )}

      {user && (
        <SelectBar objekts={filtered} secondary={ownerActions}>
          <AddToListAction objekts={filtered} />
        </SelectBar>
      )}

      <ObjektDrawer
        objekt={activeObjekt}
        onClose={() => setActiveGroup([])}
        owned={showOwned ? ownedCopies : undefined}
        ownedMenu={user ? (item) => <AddToListMenuItem objekts={[item]} /> : undefined}
        selected={activeObjekt !== null && ids.has(activeObjekt.id)}
        onToggleSelect={user ? (value) => toggle(value.id) : undefined}
        menu={user ? menuItems(activeGroup) : undefined}
        note={
          activeObjekt && activeNear ? (
            <NearNote
              objekt={activeObjekt}
              near={activeNear}
              onClose={() => setActiveGroup([])}
              onCompose={composer.openWith}
            />
          ) : undefined
        }
      />
      {user ? <PostComposer {...composer.dialog} /> : null}

      {canPrice ? <SetPriceDialog {...dialogs.price} slug={list.slug} currency={currency} /> : null}
      {isOwner ? <RemoveFromListDialog {...dialogs.remove} slug={list.slug} /> : null}
    </>
  );
}

function isTradeRole(listType: string): listType is "have" | "want" | "sale" {
  return listType === "have" || listType === "want" || listType === "sale";
}
