import { CurrencyDollarIcon, ScalesIcon, TrashIcon } from "@phosphor-icons/react";
import type { ListObjekt } from "@repo/lib/types/objekt";
import { useCallback } from "react";

import { MenuItem, MenuSeparator } from "@/components/ui/menu";
import type { SelectBarAction } from "@/features/objekt/select-bar";
import { m } from "@/paraglide/messages";

import { AddToListMenuItem } from "./add-to-list-menu-item";

/** The owner's writes on a list's entries: a card's menu, and the select bar's secondary actions. */
export function useListEntryActions({
  isOwner,
  canPrice,
  canRatio,
  comparing,
  openPrice,
  openRatio,
  openRemove,
  selected,
  targets,
}: {
  isOwner: boolean;
  canPrice: boolean;
  canRatio: boolean;
  comparing: boolean;
  openPrice: (objekts: ListObjekt[]) => void;
  openRatio: (objekts: ListObjekt[]) => void;
  openRemove: (objekts: ListObjekt[]) => void;
  selected: ListObjekt[];
  targets: ListObjekt[];
}) {
  const menuItems = useCallback(
    (objekts: ListObjekt[]) => {
      const objekt = objekts[0];
      if (!objekt) return null;
      return (
        <>
          <AddToListMenuItem objekts={[objekt]} />
          {canPrice && !comparing ? (
            <MenuItem onClick={() => openPrice(objekts)}>
              <CurrencyDollarIcon />
              {m.objekt_menu_set_price()}
            </MenuItem>
          ) : null}
          {canRatio && !comparing ? (
            <MenuItem onClick={() => openRatio(objekts)}>
              <ScalesIcon />
              {m.objekt_menu_set_ratio()}
            </MenuItem>
          ) : null}
          {isOwner && !comparing ? (
            <>
              <MenuSeparator />
              <MenuItem variant="destructive" onClick={() => openRemove(objekts)}>
                <TrashIcon />
                {m.objekt_menu_remove_from_list()}
              </MenuItem>
            </>
          ) : null}
        </>
      );
    },
    [isOwner, canPrice, canRatio, comparing, openPrice, openRatio, openRemove],
  );

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
    ...(canRatio
      ? [
          {
            label: m.filter_set_ratio(),
            icon: <ScalesIcon />,
            onClick: () => openRatio(targets),
          },
        ]
      : []),
  ];

  return { menuItems, ownerActions };
}
