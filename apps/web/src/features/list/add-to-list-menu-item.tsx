import { PlusIcon } from "@phosphor-icons/react";
import type { ValidObjekt } from "@repo/lib/types/objekt";

import { Button } from "@/components/ui/button";
import { MenuItem } from "@/components/ui/menu";
import { selectBarFillClass } from "@/features/objekt/select-bar";
import { m } from "@/paraglide/messages";
import { useSelection } from "@/stores/selection";

import { useOpenAddToList } from "./add-to-list-dialog";

/** An `ObjektCardMenu` item; must sit under an `AddToListProvider`. */
export function AddToListMenuItem({ objekts }: { objekts: ValidObjekt[] }) {
  const openAddToList = useOpenAddToList();

  return (
    <MenuItem onClick={() => openAddToList(objekts)}>
      <PlusIcon />
      {m.objekt_menu_add_to_list()}
    </MenuItem>
  );
}

/** The same action on the selection bar, over whatever of `objekts` is selected. */
export function AddToListAction({ objekts }: { objekts: ValidObjekt[] }) {
  const openAddToList = useOpenAddToList();
  const ids = useSelection((s) => s.ids);

  return (
    <Button
      size="sm"
      className={`${selectBarFillClass} shrink-0`}
      onClick={() => openAddToList(objekts.filter((objekt) => ids.has(objekt.id)))}
    >
      <PlusIcon />
      {m.filter_add_to_list()}
    </Button>
  );
}
