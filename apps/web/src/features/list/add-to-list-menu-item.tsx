import { PlusIcon } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { MenuItem } from "@/components/ui/menu";
import { ToolbarButton } from "@/components/ui/toolbar";
import { selectBarFillClass, selectBarIconOnlyClass } from "@/features/objekt/select-bar";
import { m } from "@/paraglide/messages";
import { useSelection } from "@/stores/selection";

import { type AddableObjekt } from "./add-to-list-dialog";
import { useOpenAddToList } from "./use-open-add-to-list";

/** An `ObjektCardMenu` item; must sit under an `AddToListProvider`. */
export function AddToListMenuItem({
  objekts,
  combined,
}: {
  objekts: AddableObjekt[];
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
  objekts: AddableObjekt[];
  combined?: boolean;
}) {
  const openAddToList = useOpenAddToList();
  const ids = useSelection((s) => s.ids);

  return (
    // a select-bar item: it joins the bar's arrow-key order
    <ToolbarButton
      disabled={ids.size === 0}
      focusableWhenDisabled={false}
      render={
        <Button size="sm" className={`${selectBarFillClass} ${selectBarIconOnlyClass} shrink-0`} />
      }
      onClick={() =>
        openAddToList(
          objekts.filter((objekt) => ids.has(objekt.id)),
          { combined },
        )
      }
    >
      <PlusIcon />
      <span className="max-sm:sr-only">{m.filter_add_to_list()}</span>
    </ToolbarButton>
  );
}
