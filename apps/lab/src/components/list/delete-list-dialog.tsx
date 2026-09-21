import type { ReactElement } from "react";

import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogPopup,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { toastManager } from "@/components/ui/toast";
import { type LabList, useLists } from "@/store/lists";

/**
 * Port of `list/modal/delete-list-modal.tsx`. The app uses a modal with
 * `role="alertdialog"`; cnippet ships that as its own `AlertDialog`, which
 * also blocks dismissal by backdrop click.
 */
export function DeleteListDialog({
  list,
  onDeleted,
  children,
}: {
  list: LabList;
  /** the detail page leaves for `/list`; the grid stays put */
  onDeleted?: () => void;
  children: ReactElement;
}) {
  const remove = useLists((s) => s.remove);

  return (
    <AlertDialog>
      <AlertDialogTrigger render={children} />
      <AlertDialogPopup className="max-w-sm">
        <AlertDialogHeader>
          <AlertDialogTitle className="font-display">Delete list?</AlertDialogTitle>
          <AlertDialogDescription>
            <span className="text-foreground">{list.name}</span> and its {list.entries.length}{" "}
            objekt entries are removed. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogClose render={<Button variant="outline" />}>Cancel</AlertDialogClose>
          <AlertDialogClose
            render={<Button variant="destructive" />}
            onClick={() => {
              remove(list.id);
              toastManager.add({ type: "success", title: "List deleted", description: list.name });
              onDeleted?.();
            }}
          >
            Delete
          </AlertDialogClose>
        </AlertDialogFooter>
      </AlertDialogPopup>
    </AlertDialog>
  );
}
