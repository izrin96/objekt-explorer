import type { ListObjekt } from "@repo/lib/types/objekt";

import {
  AlertDialog,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogPopup,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { m } from "@/paraglide/messages";
import { useSelection } from "@/stores/selection";

import { useRemoveObjektsFromList } from "./actions";

export function RemoveFromListDialog({
  open,
  onOpenChange,
  objekts,
  slug,
  finalFocus,
  onRemoved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  objekts: ListObjekt[];
  slug: string;
  /** the element focus returns to, looked up as the dialog closes */
  finalFocus?: () => HTMLElement | null;
  /** before the dialog closes, so a caller can move `finalFocus` off an objekt that just left */
  onRemoved?: () => void;
}) {
  const remove = useRemoveObjektsFromList();
  const clearSelection = useSelection((s) => s.clear);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogPopup className="max-w-sm" finalFocus={finalFocus}>
        <AlertDialogHeader>
          <AlertDialogTitle className="font-display">
            {m.list_manage_objekt_remove_title()}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {m.list_manage_objekt_remove_description()}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {m.common_modal_cancel()}
          </Button>
          <Button
            variant="destructive"
            loading={remove.isPending}
            onClick={() =>
              remove.mutate(
                { slug, entryIds: objekts.map((objekt) => objekt.entryId) },
                {
                  // the removed entries are gone from the grid, so a selection of them would linger unseen
                  onSuccess: () => {
                    onRemoved?.();
                    clearSelection();
                    onOpenChange(false);
                  },
                },
              )
            }
          >
            {m.common_actions_remove()}
          </Button>
        </AlertDialogFooter>
      </AlertDialogPopup>
    </AlertDialog>
  );
}
