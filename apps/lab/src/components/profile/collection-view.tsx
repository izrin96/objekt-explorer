import {
  ImagesSquareIcon,
  LockSimpleIcon,
  LockSimpleOpenIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  PushPinIcon,
} from "@phosphor-icons/react";
import { format } from "date-fns";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";

import { useScopedFacets } from "@/components/filters/facets";
import { activeChips, applyFilters, useFilters } from "@/components/filters/filter-store";
import { ObjektCard } from "@/components/objekt-card";
import { ObjektDrawer } from "@/components/objekt-drawer";
import { ObjektGrid } from "@/components/objekt-grid";
import { PinDnd, SortablePin } from "@/components/profile/pin-dnd";
import type { Profile } from "@/components/profile/profile-data";
import { uniqueCollections } from "@/components/profile/profile-data";
import { ProfileToolbar, SnapshotPopover } from "@/components/profile/profile-toolbar";
import { SetPriceDialog } from "@/components/profile/set-price-dialog";
import {
  SelectBar,
  type SelectBarAction,
  selectBarActionClass,
  selectBarFillClass,
} from "@/components/select-bar";
import { EmptyState } from "@/components/shared/empty-state";
import { notImplemented } from "@/components/shared/not-implemented";
import { Button } from "@/components/ui/button";
import { toastManager } from "@/components/ui/toast";
import type { LabObjekt } from "@/fixtures/objekts";
import { useCosmoLinks } from "@/store/link";
import { useLocks } from "@/store/lock";
import { usePins } from "@/store/pins";
import { useSelection } from "@/store/selection";
import { useSession } from "@/store/session";
import { useSnapshotProfile } from "@/store/snapshot";

/**
 * Collection tab: toolbar, pinned shelf, grid. Same card interaction as Home
 * and Market — body click opens the drawer, the round check toggles selection
 * in the shared store — with Pin / Lock / Set price added to the select bar.
 */
export function CollectionView({ profile: live }: { profile: Profile }) {
  const [active, setActive] = useState<LabObjekt | null>(null);
  const { ids, toggle, clear } = useSelection();
  const filters = useFilters();

  // everything below the toolbar reads the snapshot profile, so the grid, the
  // shelf, the count line and the facets cannot disagree about what was held
  const { profile, date } = useSnapshotProfile(live);
  const snapshot = date !== null;

  const { scope } = useScopedFacets(profile.objekts);
  const pins = usePins(profile);
  const locks = useLocks(profile);

  useEffect(() => useSelection.getState().clear, []);

  // the same pipeline Home and Market run, so the toolbar's sort, columns and
  // long-tail switches land on this grid too
  const rows = useMemo(
    () => applyFilters(profile.objekts, filters, pins.idSet, locks.idSet, scope),
    [profile.objekts, filters, pins.idSet, locks.idSet, scope],
  );

  const byId = useMemo(() => new Map(profile.objekts.map((o) => [o.id, o])), [profile.objekts]);
  const pinned = pins.ids.map((id) => byId.get(id)).filter((o) => o !== undefined);

  // Editing is the owner's change to their own live collection, so it takes
  // the same conditions the website gates it on: the viewer owns this Cosmo,
  // and the page is not showing a past snapshot, which is a state nobody can
  // edit. Reorder adds two more — see below.
  const signedIn = useSession((s) => s.signedIn);
  const linked = useCosmoLinks((s) => s.links.some((l) => l.nickname === profile.nickname));
  const canEdit = signedIn && linked && !snapshot;
  const canReorder =
    canEdit &&
    // a filtered shelf would commit an order over rows that are not on screen
    activeChips(filters).length === 0 &&
    // one pin has nowhere to go, so the hint would be an instruction with no move
    pinned.length > 1;

  const card = (o: LabObjekt, extra?: { pin?: boolean; qty?: number; handle?: ReactNode }) => (
    <ObjektCard
      key={o.id}
      objekt={o}
      selected={ids.has(o.id)}
      // a past state is read-only, so the cards carry no check control at all
      onToggleSelect={snapshot ? undefined : (x) => toggle(x.id)}
      onOpen={setActive}
      pin={extra?.pin}
      lock={locks.idSet.has(o.id)}
      qty={extra?.qty}
    >
      {extra?.handle}
    </ObjektCard>
  );

  /**
   * A bulk action that reports what it did and drops the selection. Pin and
   * Lock are the two the lab can really perform — both stores are the
   * profile's own — so only Add to list says the same thing with nothing
   * behind it.
   */
  const bulkDone = (title: string, count: number) => {
    toastManager.add({ type: "success", title: `${title} ${count} objekts` });
    clear();
  };

  const bulkStub = (title: string) => () => {
    notImplemented({ type: "success", title: `${title} ${ids.size} objekts` });
    clear();
  };

  // a profile that holds nothing has no toolbar to offer and no grid to filter
  if (live.objekts.length === 0) {
    return (
      <EmptyState
        icon={ImagesSquareIcon}
        title="No objekts yet"
        hint={`${profile.nickname} does not hold anything the selected artists cover. Widen the artist scope in the avatar menu, or check back once they mint.`}
      />
    );
  }

  // the same grid as below it, so a pinned card sits in the same column as the
  // card under it at every column count
  const shelf = (
    <ObjektGrid columns={filters.columns}>
      {canReorder
        ? pinned.map((o) => (
            <SortablePin key={o.id} id={o.id}>
              {(handle) => card(o, { pin: true, handle })}
            </SortablePin>
          ))
        : pinned.map((o) => card(o, { pin: true }))}
    </ObjektGrid>
  );

  const selected = [...ids];
  const toLock = selected.filter((id) => !locks.idSet.has(id));
  const toUnlock = selected.filter((id) => locks.idSet.has(id));
  // Lock shows while anything selected is unlocked, Unlock while anything is
  // locked, both on a mixed selection — the website's select bar carries the
  // pair unconditionally, but it also knows the mutation is a no-op
  const lockActions: SelectBarAction[] = canEdit
    ? [
        ...(toLock.length > 0
          ? [
              {
                label: "Lock",
                icon: <LockSimpleIcon />,
                onClick: () => {
                  locks.lock(toLock);
                  bulkDone("Locked", toLock.length);
                },
              },
            ]
          : []),
        ...(toUnlock.length > 0
          ? [
              {
                label: "Unlock",
                icon: <LockSimpleOpenIcon />,
                onClick: () => {
                  locks.unlock(toUnlock);
                  bulkDone("Unlocked", toUnlock.length);
                },
              },
            ]
          : []),
      ]
    : [];

  return (
    <>
      <ProfileToolbar
        source={profile.objekts}
        showLock={canEdit}
        extra={<SnapshotPopover nickname={profile.nickname} />}
      />

      {/* the trigger carries the date, but the grid under it looks like an
          ordinary collection that has quietly lost two thirds of its cards */}
      {date !== null && (
        <p className="text-muted-foreground text-[13px]">
          {`Showing ${profile.nickname}'s collection as of `}
          <b className="text-foreground font-medium">{format(date, "d MMM yyyy")}</b> ·{" "}
          <span className="font-mono">{profile.objekts.length}</span> objekts
        </p>
      )}

      {/* an empty shelf under a "Pinned" heading is a section explaining that
          it has nothing to say; the heading only appears with a card under it */}
      {pinned.length > 0 && (
        <>
          <div className="flex items-center gap-2">
            <PushPinIcon weight="fill" className="size-4" />
            <h2 className="font-display text-sm font-semibold">Pinned</h2>
            {canReorder && <span className="text-muted-foreground text-xs">drag to reorder</span>}
          </div>
          {canReorder ? (
            <PinDnd
              ids={pins.ids}
              onReorder={pins.reorder}
              renderOverlay={(id) => {
                const objekt = byId.get(id);
                return objekt ? card(objekt, { pin: true }) : null;
              }}
            >
              {shelf}
            </PinDnd>
          ) : (
            shelf
          )}
        </>
      )}

      <p className="text-muted-foreground font-mono text-[12.5px]">
        <b className="text-foreground font-semibold">{rows.length}</b> shown ·{" "}
        <b className="text-foreground font-semibold">{uniqueCollections(profile.objekts)}</b> unique
        of <b className="text-foreground font-semibold">{profile.objekts.length}</b> owned
      </p>

      {rows.length === 0 && (
        <EmptyState
          icon={MagnifyingGlassIcon}
          title="No objekts match"
          hint="Nothing this profile holds fits the current filters."
          action={
            <Button variant="outline" size="sm" onClick={filters.reset}>
              Clear filters
            </Button>
          }
        />
      )}

      <ObjektGrid columns={filters.columns}>
        {rows.map(({ objekt, qty }) =>
          card(objekt, {
            pin: pins.idSet.has(objekt.id),
            qty: filters.combine && qty > 1 ? qty : undefined,
          }),
        )}
      </ObjektGrid>

      <SelectBar
        visibleIds={rows.map((r) => r.objekt.id)}
        secondary={[
          {
            label: "Pin",
            icon: <PushPinIcon />,
            onClick: () => {
              for (const id of ids) pins.pin(id);
              bulkDone("Pinned", ids.size);
            },
          },
          ...lockActions,
        ]}
      >
        <SetPriceDialog count={ids.size}>
          <Button size="sm" className={`${selectBarFillClass} shrink-0`}>
            Set price
          </Button>
        </SetPriceDialog>
        <Button
          size="sm"
          variant="outline"
          onClick={bulkStub("Added")}
          className={`${selectBarActionClass} shrink-0`}
        >
          <PlusIcon />
          Add to list
        </Button>
      </SelectBar>

      <ObjektDrawer
        objekt={active}
        onClose={() => setActive(null)}
        locked={active !== null && locks.idSet.has(active.id)}
        onToggleLock={canEdit && active !== null ? () => locks.toggle(active.id) : undefined}
      />
    </>
  );
}
