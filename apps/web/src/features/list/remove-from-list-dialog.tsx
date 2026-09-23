import type { ValidObjekt } from "@repo/lib/types/objekt";

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
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  objekts: ValidObjekt[];
  slug: string;
}) {
  const remove = useRemoveObjektsFromList();
  const clearSelection = useSelection((s) => s.clear);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogPopup className="max-w-sm">
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
                { slug, entryIds: objekts.map((objekt) => Number(objekt.id)) },
                {
                  // the removed entries are gone from the grid, so a selection of them would linger unseen
                  onSuccess: () => {
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
