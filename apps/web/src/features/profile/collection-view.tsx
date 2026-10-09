import { arrayMove } from "@dnd-kit/sortable";
import { CaretDownIcon, CaretUpIcon } from "@phosphor-icons/react";
import type { GridObjekt } from "@repo/lib/types/objekt";
import { useCallback, useMemo } from "react";

import { countMarkup, MessageMarkup } from "@/components/shared/message-markup";
import { MenuItem, MenuSeparator } from "@/components/ui/menu";
import { GenerateDiscordButton } from "@/features/discord/generate-discord-button";
import type { ExtraFacet } from "@/features/filters/facet-controls";
import { CombineDupsToggle, TransferableToggle } from "@/features/filters/filter-toggle";
import { LONG_TAIL } from "@/features/filters/long-tail";
import { isFiltering } from "@/features/filters/search-schema";
import { useFilters } from "@/features/filters/use-filters";
import { AddToListProvider } from "@/features/list/add-to-list-dialog";
import { AddToListAction, AddToListMenuItem } from "@/features/list/add-to-list-menu-item";
import { ObjektDrawer } from "@/features/objekt/drawer";
import type { OwnedRowMenu } from "@/features/objekt/drawer/owned";
import { useObjektLink } from "@/features/objekt/drawer/use-objekt-link";
import { ObjektCard } from "@/features/objekt/objekt-card";
import { ObjektCardMenu } from "@/features/objekt/objekt-card-menu";
import { copiesIn, isObjektOwned, ownedCopiesOf } from "@/features/objekt/objekt-utils";
import { ObjektVirtualGrid } from "@/features/objekt/objekt-virtual-grid";
import { SelectBar, SelectModeButton } from "@/features/objekt/select-bar";
import { SkeletonGrid } from "@/features/objekt/skeleton-grid";
import { useCurrentUser } from "@/features/user/hooks";
import { m } from "@/paraglide/messages";
import { selectIsSelecting, useClearSelectionOnNavigate, useSelection } from "@/stores/selection";

import { CheckpointPopover } from "./checkpoint-popover";
import { CollectionEmpty, CollectionNotices } from "./collection-states";
import { LockMenuItem, PinMenuItem, useOwnerActions } from "./owner-actions";
import { PinDnd, SortablePin } from "./pin-dnd";
import { useProfileColumns, useProfileAuthed, useProfile } from "./profile-provider";
import { ProfileToolbar } from "./profile-toolbar";
import { usePinOrder } from "./use-pin-order";
import { isSpinAddress, useProfileObjekts } from "./use-profile-objekts";

export function CollectionView() {
  const profile = useProfile();
  const address = profile.address;
  const { data: user } = useCurrentUser();
  const isProfileAuthed = useProfileAuthed();
  const columns = useProfileColumns();
  const transferable = useFilters((f) => f.transferable);
  const grouped = useFilters((f) => f.grouped);
  const selected = useSelection((s) => s.ids);
  const selecting = useSelection(selectIsSelecting);
  const toggleSelect = useSelection((s) => s.toggle);

  const {
    filtered,
    allOwned,
    catalogue,
    filters,
    rarityMap,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    isPending,
  } = useProfileObjekts();

  const { togglePin, toggleLock, selectActions } = useOwnerActions(address);
  const { objekts, pinned, pinnedIds, reorder } = usePinOrder(
    address,
    filtered,
    filters.hidePin === true,
  );

  useClearSelectionOnNavigate();

  // copies the filters hide still open from a link, and the catalogue covers
  // a collection the profile does not hold
  const { active, open, close } = useObjektLink<GridObjekt>(
    [objekts, allOwned, catalogue ?? []],
    !isPending && !hasNextPage,
  );

  // a fresh array each render would re-run the facet parity effect forever
  const extras = useMemo<ExtraFacet[]>(
    () => [
      {
        key: "transferable",
        active: transferable === true,
        quick: true,
        Control: TransferableToggle,
      },
      { key: "grouped", active: grouped === true, quick: true, Control: CombineDupsToggle },
    ],
    [transferable, grouped],
  );

  // a past state belongs to nobody to edit, and a signed-out visitor has
  // nothing to act with
  const showActions = Boolean(user) && filters.at === undefined;

  // one pin has nowhere to go
  const dndEnabled =
    isProfileAuthed &&
    showActions &&
    !isFiltering(filters) &&
    filters.hidePin !== true &&
    pinnedIds.length > 1;

  const objektMenuItems = useCallback(
    (objekt: GridObjekt) => {
      const owned = isObjektOwned(objekt) ? objekt : null;
      const canEdit = isProfileAuthed && owned !== null;
      // the pins lead the grid topmost-first, so "up" is one index earlier.
      // A filter hides pins, and renumbering only the visible ones would tie
      // them with the hidden ones, so moves wait for the full list as a drag does.
      const pinIndex =
        owned?.isPin === true && !isFiltering(filters) ? pinnedIds.indexOf(owned.tokenId) : -1;
      const move = (to: number) => reorder(arrayMove(pinnedIds, pinIndex, to), true);
      return (
        <>
          {canEdit && owned && (
            <>
              <PinMenuItem objekt={owned} onToggle={togglePin} />
              {pinIndex !== -1 && (
                <>
                  <MenuItem disabled={pinIndex === 0} onClick={() => move(pinIndex - 1)}>
                    <CaretUpIcon />
                    {m.objekt_menu_move_up()}
                  </MenuItem>
                  <MenuItem
                    disabled={pinIndex === pinnedIds.length - 1}
                    onClick={() => move(pinIndex + 1)}
                  >
                    <CaretDownIcon />
                    {m.objekt_menu_move_down()}
                  </MenuItem>
                </>
              )}
              <LockMenuItem objekt={owned} onToggle={toggleLock} />
            </>
          )}
          <AddToListMenuItem objekts={[objekt]} combined={grouped === true} />
        </>
      );
    },
    [filters, grouped, reorder, isProfileAuthed, pinnedIds, togglePin, toggleLock],
  );

  const renderCard = useCallback(
    (objekt: GridObjekt, qty?: number, priority = false, sortable = false) => {
      const owned = isObjektOwned(objekt) ? objekt : null;
      return (
        <ObjektCard
          objekt={objekt}
          selected={selected.has(objekt.id)}
          // a past state is read-only, so the cards carry no check control
          onToggleSelect={showActions ? (item) => toggleSelect(item.id) : undefined}
          // a pin's long press lifts it for reordering; the Select button selects
          longPressSelect={!sortable}
          onOpen={open}
          pin={owned?.isPin === true}
          lock={owned?.isLocked === true}
          faded={owned === null && objekt.copies === undefined}
          qty={qty}
          hideSerial={grouped === true}
          priority={priority}
        >
          {showActions && <ObjektCardMenu>{objektMenuItems(objekt)}</ObjektCardMenu>}
        </ObjektCard>
      );
    },
    [objektMenuItems, selected, showActions, toggleSelect, grouped, open],
  );

  const renderItem = useCallback(
    ({ item, rowIndex }: { item: GridObjekt[]; rowIndex: number }) => {
      const objekt = item[0];
      if (!objekt) return null;
      const sortable = dndEnabled && isObjektOwned(objekt) && objekt.isPin === true;
      // in select mode a pin takes taps and long presses like any other card
      const qty = copiesIn(item);
      const card = renderCard(
        objekt,
        qty > 1 ? qty : undefined,
        rowIndex < 2,
        sortable && !selecting,
      );
      // only the grid cell is sortable: the drag overlay renders the same card
      // and a second `useSortable` on its id would own the droppable instead.
      // Select mode disables the sortable rather than unwrapping it, so the
      // pins keep their subtree and do not remount on every toggle
      return sortable ? (
        <SortablePin id={objekt.tokenId} disabled={selecting}>
          {card}
        </SortablePin>
      ) : (
        card
      );
    },
    [dndEnabled, renderCard, selecting],
  );

  // the floating copy is artwork only: a caption under it would cast the
  // overlay's shadow below the card as a dark blob
  const renderOverlay = useCallback(
    (id: string) => {
      const objekt = pinned.find((item) => item.tokenId === id);
      // the overlay has no container of its own, so the radius would read the viewport
      return objekt ? (
        <div className="@container">
          <ObjektCard objekt={objekt} pin hideLabel className="rounded-photocard shadow-xl" />
        </div>
      ) : null;
    },
    [pinned],
  );

  const ownedCopies = useMemo(() => ownedCopiesOf(filtered, active), [active, filtered]);

  const ownedMenu = useCallback<OwnedRowMenu>(
    (item) => (
      <>
        {isProfileAuthed && (
          <>
            <PinMenuItem objekt={item} onToggle={togglePin} />
            <LockMenuItem objekt={item} onToggle={toggleLock} />
            <MenuSeparator />
          </>
        )}
        <AddToListMenuItem objekts={[item]} />
      </>
    ),
    [isProfileAuthed, togglePin, toggleLock],
  );

  const uniqueCount = new Set(filtered.map((objekt) => objekt.collectionId)).size;
  const ownerActions = isProfileAuthed
    ? selectActions(filtered.filter((objekt) => selected.has(objekt.id)))
    : [];

  return (
    <AddToListProvider address={address}>
      <ProfileToolbar
        longTail={LONG_TAIL.collection}
        extras={extras}
        // Spin is counted from today's holdings alone
        extra={isSpinAddress(address) ? undefined : <CheckpointPopover />}
        actions={<GenerateDiscordButton objekts={filtered} />}
      />

      <CollectionNotices address={address} at={filters.at} />

      {isPending ? (
        <SkeletonGrid columns={columns} />
      ) : (
        <>
          <div className="flex items-center justify-between gap-2">
            <p className="text-muted-foreground font-mono text-xs tabular-nums">
              <MessageMarkup
                parts={m.profile_count_summary.parts({
                  shown: `${copiesIn(filtered).toLocaleString()}${hasNextPage ? "+" : ""}`,
                  unique: uniqueCount.toLocaleString(),
                })}
                markup={countMarkup}
              />
            </p>
            {showActions && filtered.length > 0 && <SelectModeButton />}
          </div>

          {filtered.length === 0 ? (
            <CollectionEmpty filtering={isFiltering(filters)} />
          ) : (
            <PinDnd
              ids={pinnedIds}
              onReorder={reorder}
              renderOverlay={renderOverlay}
              disabled={!dndEnabled}
            >
              <ObjektVirtualGrid
                objekts={objekts}
                filters={filters}
                columns={columns}
                rarityMap={rarityMap}
                isProfile
                renderItem={renderItem}
                onLoadMore={fetchNextPage}
                hasNextPage={hasNextPage}
                isFetchingNextPage={isFetchingNextPage}
              />
            </PinDnd>
          )}
        </>
      )}

      {showActions && (
        <SelectBar objekts={filtered} secondary={ownerActions}>
          <AddToListAction objekts={filtered} combined={grouped === true} />
        </SelectBar>
      )}

      <ObjektDrawer
        objekt={active}
        onClose={close}
        // Spin is counted per collection, so it has no tokens to list
        owned={isSpinAddress(address) ? undefined : ownedCopies}
        ownedMenu={showActions ? ownedMenu : undefined}
        selected={active !== null && selected.has(active.id)}
        onToggleSelect={showActions ? (item) => toggleSelect(item.id) : undefined}
        menu={showActions && active !== null ? objektMenuItems(active) : undefined}
      />
    </AddToListProvider>
  );
}
