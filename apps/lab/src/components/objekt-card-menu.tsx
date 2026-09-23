import { DotsThreeIcon } from "@phosphor-icons/react";
import { useState } from "react";

import { AddToListDialog } from "@/components/add-to-list-dialog";
import { Menu, MenuItem, MenuPopup, MenuTrigger } from "@/components/ui/menu";

/**
 * "⋯" hover menu rendered into ObjektCard's children slot.
 * The wrapper stops click/keydown propagation so menu + dialog interaction
 * (including portaled popups, which bubble through the React tree) never
 * toggles the card's selection.
 *
 * Home / Market / Activity / Lists cards are collections, not owned tokens, so
 * there is no owner to link to; the menu carries collection actions only.
 */
export function ObjektCardMenu({ objektId }: { objektId: string }) {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
      className="contents"
    >
      <Menu>
        <MenuTrigger
          aria-label="More actions"
          className="relative z-10 grid size-[14cqi] place-items-center rounded-[4cqi] bg-[rgba(10,12,16,.78)] text-white backdrop-blur-sm outline-none focus-visible:ring-2 focus-visible:ring-white [&>svg]:size-[9cqi]"
        >
          <DotsThreeIcon weight="bold" />
        </MenuTrigger>
        <MenuPopup align="start" className="min-w-44">
          <MenuItem onClick={() => setDialogOpen(true)}>Add to list</MenuItem>
        </MenuPopup>
      </Menu>
      <AddToListDialog open={dialogOpen} onOpenChange={setDialogOpen} objektIds={[objektId]} />
    </div>
  );
}
