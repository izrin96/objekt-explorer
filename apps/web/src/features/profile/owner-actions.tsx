import {
  LockSimpleIcon,
  LockSimpleOpenIcon,
  PushPinIcon,
  PushPinSlashIcon,
} from "@phosphor-icons/react";
import type { OwnedGridObjekt } from "@repo/lib/types/objekt";

import { MenuItem } from "@/components/ui/menu";
import { m } from "@/paraglide/messages";

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
