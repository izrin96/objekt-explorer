import {
  LockSimpleIcon,
  LockSimpleOpenIcon,
  PushPinIcon,
  PushPinSlashIcon,
} from "@phosphor-icons/react";
import type { GridObjekt, OwnedGridObjekt } from "@repo/lib/types/objekt";
import { useCallback } from "react";
import type { ReactNode } from "react";

import { MenuItem } from "@/components/ui/menu";
import { isObjektOwned } from "@/features/objekt/objekt-utils";
import type { SelectBarAction } from "@/features/objekt/select-bar";
import { m } from "@/paraglide/messages";
import { useSelection } from "@/stores/selection";

import { useBatchLock, useBatchPin, useBatchUnlock, useBatchUnpin } from "./actions";

export function useOwnerActions(address: string) {
  const batchPin = useBatchPin(address);
  const batchUnpin = useBatchUnpin(address);
  const batchLock = useBatchLock(address);
  const batchUnlock = useBatchUnlock(address);
  const clearSelection = useSelection((s) => s.clear);

  const togglePin = useCallback(
    (objekt: OwnedGridObjekt) =>
      (objekt.isPin ? batchUnpin : batchPin).mutate({
        address,
        tokenIds: [Number(objekt.tokenId)],
      }),
    [address, batchPin, batchUnpin],
  );

  const toggleLock = useCallback(
    (objekt: OwnedGridObjekt) =>
      (objekt.isLocked ? batchUnlock : batchLock).mutate({
        address,
        tokenIds: [Number(objekt.tokenId)],
      }),
    [address, batchLock, batchUnlock],
  );

  const selectActions = (selected: GridObjekt[]): SelectBarAction[] => {
    const run = (
      mutate: (input: { address: string; tokenIds: number[] }) => void,
      tokenIds: number[],
    ) => {
      mutate({ address, tokenIds });
      clearSelection();
    };

    return [
      ...pick(selected, (objekt) => objekt.isPin !== true, {
        label: m.objekt_menu_pin(),
        icon: <PushPinIcon />,
        run: (tokenIds) => run(batchPin.mutate, tokenIds),
      }),
      ...pick(selected, (objekt) => objekt.isPin === true, {
        label: m.objekt_menu_unpin(),
        icon: <PushPinSlashIcon />,
        run: (tokenIds) => run(batchUnpin.mutate, tokenIds),
      }),
      ...pick(selected, (objekt) => objekt.isLocked !== true, {
        label: m.objekt_menu_lock(),
        icon: <LockSimpleIcon />,
        run: (tokenIds) => run(batchLock.mutate, tokenIds),
      }),
      ...pick(selected, (objekt) => objekt.isLocked === true, {
        label: m.objekt_menu_unlock(),
        icon: <LockSimpleOpenIcon />,
        run: (tokenIds) => run(batchUnlock.mutate, tokenIds),
      }),
    ];
  };

  return { togglePin, toggleLock, selectActions };
}

export function PinMenuItem({
  objekt,
  onToggle,
}: {
  objekt: OwnedGridObjekt;
  onToggle: (objekt: OwnedGridObjekt) => void;
}) {
  return (
    <MenuItem onClick={() => onToggle(objekt)}>
      {objekt.isPin ? <PushPinSlashIcon /> : <PushPinIcon />}
      {objekt.isPin ? m.objekt_menu_unpin() : m.objekt_menu_pin()}
    </MenuItem>
  );
}

export function LockMenuItem({
  objekt,
  onToggle,
}: {
  objekt: OwnedGridObjekt;
  onToggle: (objekt: OwnedGridObjekt) => void;
}) {
  return (
    <MenuItem onClick={() => onToggle(objekt)}>
      {objekt.isLocked ? <LockSimpleOpenIcon /> : <LockSimpleIcon />}
      {objekt.isLocked ? m.objekt_menu_unlock() : m.objekt_menu_lock()}
    </MenuItem>
  );
}

/**
 * An action is offered while the selection holds anything it would change:
 * Lock while something is unlocked, Unlock while something is locked, both on
 * a mixed selection.
 */
function pick(
  objekts: GridObjekt[],
  matches: (objekt: OwnedGridObjekt) => boolean,
  action: { label: string; icon: ReactNode; run: (tokenIds: number[]) => void },
): SelectBarAction[] {
  const tokenIds: number[] = [];
  for (const objekt of objekts) {
    if (isObjektOwned(objekt) && matches(objekt)) tokenIds.push(Number(objekt.tokenId));
  }
  if (tokenIds.length === 0) return [];
  return [{ label: action.label, icon: action.icon, onClick: () => action.run(tokenIds) }];
}
