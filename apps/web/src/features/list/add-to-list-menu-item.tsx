import { PlusIcon } from "@phosphor-icons/react";
import type { ValidObjekt } from "@repo/lib/types/objekt";

import { Button } from "@/components/ui/button";
import { MenuItem } from "@/components/ui/menu";
import { selectBarFillClass, selectBarIconOnlyClass } from "@/features/objekt/select-bar";
import { m } from "@/paraglide/messages";
import { useSelection } from "@/stores/selection";

import { useOpenAddToList } from "./add-to-list-dialog";

/** An `ObjektCardMenu` item; must sit under an `AddToListProvider`. */
export function AddToListMenuItem({
  objekts,
  combined,
}: {
  objekts: ValidObjekt[];
  combined?: boolean;
}) {
  const openAddToList = useOpenAddToList();

  return (
    <MenuItem onClick={() => openAddToList(objekts, { combined })}>
      <PlusIcon />
      {m.objekt_menu_add_to_list()}
    </MenuItem>
  );
}

/** The same action on the selection bar, over whatever of `objekts` is selected. */
export function AddToListAction({
  objekts,
  combined,
}: {
  objekts: ValidObjekt[];
  combined?: boolean;
}) {
  const openAddToList = useOpenAddToList();
  const ids = useSelection((s) => s.ids);

  return (
    <Button
      size="sm"
      className={`${selectBarFillClass} ${selectBarIconOnlyClass} shrink-0`}
      disabled={ids.size === 0}
      onClick={() =>
        openAddToList(
          objekts.filter((objekt) => ids.has(objekt.id)),
          { combined },
        )
      }
    >
      <PlusIcon />
      <span className="max-sm:sr-only">{m.filter_add_to_list()}</span>
    </Button>
  );
}
