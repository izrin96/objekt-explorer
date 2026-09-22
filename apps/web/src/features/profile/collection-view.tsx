import { arrayMove } from "@dnd-kit/sortable";
import {
  CaretDownIcon,
  CaretUpIcon,
  ImagesSquareIcon,
  LockSimpleIcon,
  LockSimpleOpenIcon,
  MagnifyingGlassIcon,
  PushPinIcon,
  PushPinSlashIcon,
} from "@phosphor-icons/react";
import type { OwnedObjekt, ValidObjekt } from "@repo/lib/types/objekt";
import { format } from "date-fns";
import { useCallback, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { MenuItem, MenuSeparator } from "@/components/ui/menu";
import { toastManager } from "@/components/ui/toast";
import { GenerateDiscordButton } from "@/features/discord/generate-discord-button";
import type { ExtraFacet } from "@/features/filters/facet-controls";
import { LONG_TAIL } from "@/features/filters/filter-popover";
import { CombineDupsToggle, TransferableToggle } from "@/features/filters/filter-toggle";
import { isFiltering } from "@/features/filters/search-schema";
import { useFilters, useResetFilters } from "@/features/filters/use-filters";
import { AddToListProvider } from "@/features/list/add-to-list-dialog";
import { AddToListAction, AddToListMenuItem } from "@/features/list/add-to-list-menu-item";
import { ObjektDrawer } from "@/features/objekt/drawer";
import type { OwnedRowMenu } from "@/features/objekt/drawer/owned";
import { ObjektCard } from "@/features/objekt/objekt-card";
import { ObjektCardMenu } from "@/features/objekt/objekt-card-menu";
import { isObjektOwned, ownedCopiesOf } from "@/features/objekt/objekt-utils";
import { ObjektVirtualGrid } from "@/features/objekt/objekt-virtual-grid";
import { SelectBar, type SelectBarAction } from "@/features/objekt/select-bar";
import { ShimmerGrid } from "@/features/objekt/shimmer-grid";
import { useCurrentUser } from "@/features/user/hooks";
import { m } from "@/paraglide/messages";
import { useClearSelectionOnNavigate, useSelection } from "@/stores/selection";

import {
  pinOrderFor,
  useBatchLock,
  useBatchPin,
  useBatchUnlock,
  useBatchUnpin,
  useReorderPins,
} from "./actions";
import { CheckpointPopover, checkpointDate } from "./checkpoint-popover";
import { PinDnd, SortablePin } from "./pin-dnd";
import { useProfileColumns, useProfileAuthed, useProfileTarget } from "./profile-provider";
import { ProfileToolbar } from "./profile-toolbar";
import { useProfileObjekts } from "./use-profile-objekts";

export function CollectionView() {
  const profile = useProfileTarget()!;
  const address = profile.address;
  const { data: user } = useCurrentUser();
  const isProfileAuthed = useProfileAuthed();
  const columns = useProfileColumns();
  const reset = useResetFilters();
  const transferable = useFilters((f) => f.transferable);
  const grouped = useFilters((f) => f.grouped);
  const selected = useSelection((s) => s.ids);
  const toggleSelect = useSelection((s) => s.toggle);
  const clearSelection = useSelection((s) => s.clear);
  const [active, setActive] = useState<ValidObjekt | null>(null);

  const {
    filtered,
    filters,
    rarityMap,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    isPending,
  } = useProfileObjekts();

  const batchPin = useBatchPin(address);
  const batchUnpin = useBatchUnpin(address);
  const batchLock = useBatchLock(address);
  const batchUnlock = useBatchUnlock(address);
  const reorderPins = useReorderPins(address);

  useClearSelectionOnNavigate();

  // a fresh array each render would re-run the facet parity effect forever
  const extras = useMemo<ExtraFacet[]>(
    () => [
      { key: "transferable", active: transferable === true, Control: TransferableToggle },
      { key: "grouped", active: grouped === true, Control: CombineDupsToggle },
    ],
    [transferable, grouped],
  );

  // a past state belongs to nobody to edit, and a signed-out visitor has
  // nothing to act with
  const showActions = Boolean(user) && filters.at === undefined;

  // applied in the same commit as dnd-kit's own drag-end cleanup, so the drop
  // frame shows the final order without waiting on React Query's notify
  // scheduler, which lands the optimistic cache write a tick later
  const [pinOrderOverride, setPinOrderOverride] = useState<ReadonlyMap<string, number> | null>(
    null,
  );

  // a drop shows its own result, so only the menu route confirms in words
  const handleReorder = useCallback(
    (tokenIds: string[], notify = false) => {
      setPinOrderOverride(pinOrderFor(tokenIds));
      reorderPins.mutate(
        { address, tokenIds: tokenIds.map(Number) },
        {
          onSuccess: notify
            ? () => toastManager.add({ type: "success", title: m.actions_move_pin_success() })
            : undefined,
          onSettled: () => setPinOrderOverride(null),
        },
      );
    },
    [address, reorderPins],
  );

  const objekts = useMemo(() => {
    if (!pinOrderOverride) return filtered;
    return filtered.map((objekt) => {
      const order = pinOrderOverride.get(objekt.id);
      return order === undefined ? objekt : Object.assign({}, objekt, { pinOrder: order });
    });
  }, [filtered, pinOrderOverride]);

  const pinned = useMemo(
    () =>
      filters.hidePin === true
        ? []
        : objekts
            .filter((objekt) => isObjektOwned(objekt) && objekt.isPin === true)
            .toSorted((a, b) => pinOrder(b) - pinOrder(a)),
    [objekts, filters.hidePin],
  );

  const pinnedIds = useMemo(() => pinned.map((objekt) => objekt.id), [pinned]);

  // one pin has nowhere to go, and an armed drag would only fight the long press
  const dndEnabled =
    isProfileAuthed &&
    showActions &&
    !isFiltering(filters) &&
    filters.hidePin !== true &&
    pinnedIds.length > 1;

  const renderCard = useCallback(
    (objekt: ValidObjekt, qty?: number, priority = false) => {
      const owned = isObjektOwned(objekt) ? objekt : null;
      const canEdit = showActions && isProfileAuthed && owned !== null;
      // the pins lead the grid topmost-first, so "up" is one index earlier
      const pinIndex = owned?.isPin === true ? pinnedIds.indexOf(owned.id) : -1;
      const move = (to: number) => handleReorder(arrayMove(pinnedIds, pinIndex, to), true);
      return (
        <ObjektCard
          objekt={objekt}
          selected={selected.has(objekt.id)}
          // a past state is read-only, so the cards carry no check control
          onToggleSelect={showActions ? (item) => toggleSelect(item.id) : undefined}
          onOpen={setActive}
          pin={owned?.isPin === true}
          lock={owned?.isLocked === true}
          faded={owned === null}
          qty={qty}
          priority={priority}
        >
          {showActions && (
            <ObjektCardMenu>
              {canEdit && owned && (
                <>
                  <MenuItem
                    onClick={() =>
                      owned.isPin
                        ? batchUnpin.mutate({ address, tokenIds: [Number(owned.id)] })
                        : batchPin.mutate({ address, tokenIds: [Number(owned.id)] })
                    }
                  >
                    {owned.isPin ? <PushPinSlashIcon /> : <PushPinIcon />}
                    {owned.isPin ? m.objekt_menu_unpin() : m.objekt_menu_pin()}
                  </MenuItem>
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
                  <MenuItem
                    onClick={() =>
                      owned.isLocked
                        ? batchUnlock.mutate({ address, tokenIds: [Number(owned.id)] })
                        : batchLock.mutate({ address, tokenIds: [Number(owned.id)] })
                    }
                  >
                    {owned.isLocked ? <LockSimpleOpenIcon /> : <LockSimpleIcon />}
                    {owned.isLocked ? m.objekt_menu_unlock() : m.objekt_menu_lock()}
                  </MenuItem>
                </>
              )}
              <AddToListMenuItem objekts={[objekt]} />
            </ObjektCardMenu>
          )}
        </ObjektCard>
      );
    },
    [
      address,
      batchLock,
      batchPin,
      batchUnlock,
      batchUnpin,
      handleReorder,
      isProfileAuthed,
      pinnedIds,
      selected,
      showActions,
      toggleSelect,
    ],
  );

  const renderItem = useCallback(
    ({ item, rowIndex }: { item: ValidObjekt[]; rowIndex: number }) => {
      const objekt = item[0];
      if (!objekt) return null;
      const card = renderCard(objekt, item.length > 1 ? item.length : undefined, rowIndex < 2);
      // only the grid cell is sortable: the drag overlay renders the same card
      // and a second `useSortable` on its id would own the droppable instead
      return dndEnabled && isObjektOwned(objekt) && objekt.isPin === true ? (
        <SortablePin id={objekt.id}>{card}</SortablePin>
      ) : (
        card
      );
    },
    [dndEnabled, renderCard],
  );

  const renderOverlay = useCallback(
    (id: string) => {
      const objekt = pinned.find((item) => item.id === id);
      return objekt ? renderCard(objekt) : null;
    },
    [pinned, renderCard],
  );

  const ownedCopies = useMemo(() => ownedCopiesOf(filtered, active), [active, filtered]);

  const ownedMenu = useCallback<OwnedRowMenu>(
    (item) => (
      <>
        {isProfileAuthed && (
          <>
            <MenuItem
              onClick={() =>
                item.isPin
                  ? batchUnpin.mutate({ address, tokenIds: [Number(item.id)] })
                  : batchPin.mutate({ address, tokenIds: [Number(item.id)] })
              }
            >
              {item.isPin ? <PushPinSlashIcon /> : <PushPinIcon />}
              {item.isPin ? m.objekt_menu_unpin() : m.objekt_menu_pin()}
            </MenuItem>
            <MenuItem
              onClick={() =>
                item.isLocked
                  ? batchUnlock.mutate({ address, tokenIds: [Number(item.id)] })
                  : batchLock.mutate({ address, tokenIds: [Number(item.id)] })
              }
            >
              {item.isLocked ? <LockSimpleOpenIcon /> : <LockSimpleIcon />}
              {item.isLocked ? m.objekt_menu_unlock() : m.objekt_menu_lock()}
            </MenuItem>
            <MenuSeparator />
          </>
        )}
        <AddToListMenuItem objekts={[item]} />
      </>
    ),
    [address, batchLock, batchPin, batchUnlock, batchUnpin, isProfileAuthed],
  );

  const at = checkpointDate(filters.at);
  const uniqueCount = new Set(filtered.map((objekt) => objekt.collectionId)).size;

  const selectedObjekts = filtered.filter((objekt) => selected.has(objekt.id));
  const run = (mutate: (input: { address: string; tokenIds: number[] }) => void, ids: string[]) => {
    mutate({ address, tokenIds: ids.map(Number) });
    clearSelection();
  };

  const ownerActions: SelectBarAction[] = isProfileAuthed
    ? [
        ...pick(selectedObjekts, (objekt) => objekt.isPin !== true, {
          label: m.objekt_menu_pin(),
          icon: <PushPinIcon />,
          run: (ids) => run(batchPin.mutate, ids),
        }),
        ...pick(selectedObjekts, (objekt) => objekt.isPin === true, {
          label: m.objekt_menu_unpin(),
          icon: <PushPinSlashIcon />,
          run: (ids) => run(batchUnpin.mutate, ids),
        }),
        ...pick(selectedObjekts, (objekt) => objekt.isLocked !== true, {
          label: m.objekt_menu_lock(),
          icon: <LockSimpleIcon />,
          run: (ids) => run(batchLock.mutate, ids),
        }),
        ...pick(selectedObjekts, (objekt) => objekt.isLocked === true, {
          label: m.objekt_menu_unlock(),
          icon: <LockSimpleOpenIcon />,
          run: (ids) => run(batchUnlock.mutate, ids),
        }),
      ]
    : [];

  return (
    <AddToListProvider address={address}>
      <ProfileToolbar
        longTail={LONG_TAIL.collection}
        extras={extras}
        extra={
          <>
            <CheckpointPopover />
            <GenerateDiscordButton objekts={filtered} />
          </>
        }
      />

      {at && (
        <p className="text-muted-foreground text-sm">
          {m.profile_checkpoint_notice({ date: format(at, "d MMM yyyy") })}
        </p>
      )}

      {isPending ? (
        <ShimmerGrid columns={columns} />
      ) : (
        <>
          <p className="text-muted-foreground font-mono text-xs tabular-nums">
            {m.profile_count_summary({
              shown: filtered.length.toLocaleString(),
              unique: uniqueCount.toLocaleString(),
              owned: `${filtered.length.toLocaleString()}${hasNextPage ? "+" : ""}`,
            })}
          </p>

          {filtered.length === 0 ? (
            <EmptyState
              icon={isFiltering(filters) ? MagnifyingGlassIcon : ImagesSquareIcon}
              title={isFiltering(filters) ? m.home_empty_title() : m.profile_empty_title()}
              hint={isFiltering(filters) ? m.profile_no_match_hint() : m.profile_empty_hint()}
              action={
                isFiltering(filters) ? (
                  <Button variant="outline" size="sm" onClick={reset}>
                    {m.filter_reset_filter()}
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <PinDnd
              ids={pinnedIds}
              onReorder={handleReorder}
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
          <AddToListAction objekts={filtered} />
        </SelectBar>
      )}

      <ObjektDrawer
        objekt={active}
        onClose={() => setActive(null)}
        owned={ownedCopies}
        ownedMenu={showActions ? ownedMenu : undefined}
        locked={active !== null && isObjektOwned(active) && active.isLocked === true}
        onToggleLock={
          showActions && isProfileAuthed && active !== null && isObjektOwned(active)
            ? () =>
                active.isLocked
                  ? batchUnlock.mutate({ address, tokenIds: [Number(active.id)] })
                  : batchLock.mutate({ address, tokenIds: [Number(active.id)] })
            : undefined
        }
      />
    </AddToListProvider>
  );
}

function pinOrder(objekt: ValidObjekt): number {
  return isObjektOwned(objekt) ? (objekt.pinOrder ?? 0) : 0;
}

/**
 * An action is offered while the selection holds anything it would change:
 * Lock while something is unlocked, Unlock while something is locked, both on
 * a mixed selection.
 */
function pick(
  objekts: ValidObjekt[],
  matches: (objekt: OwnedObjekt) => boolean,
  action: { label: string; icon: ReactNode; run: (ids: string[]) => void },
): SelectBarAction[] {
  const ids: string[] = [];
  for (const objekt of objekts) {
    if (isObjektOwned(objekt) && matches(objekt)) ids.push(objekt.id);
  }
  if (ids.length === 0) return [];
  return [{ label: action.label, icon: action.icon, onClick: () => action.run(ids) }];
}
