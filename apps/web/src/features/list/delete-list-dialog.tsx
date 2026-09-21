import { useNavigate } from "@tanstack/react-router";

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

import { useDeleteList } from "./actions";

export function DeleteListDialog({
  slug,
  name,
  open,
  onOpenChange,
  /** the detail page leaves for `/list`; a card in the grid stays put */
  redirectOnDelete = false,
}: {
  slug: string;
  name: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  redirectOnDelete?: boolean;
}) {
  const navigate = useNavigate();
  const remove = useDeleteList();

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogPopup className="max-w-sm">
        <AlertDialogHeader>
          <AlertDialogTitle className="font-display">{m.list_delete_title()}</AlertDialogTitle>
          <AlertDialogDescription>
            <span className="text-foreground">{name}</span> — {m.list_delete_description()}
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
                { slug },
                {
                  onSuccess: () => {
                    onOpenChange(false);
                    if (redirectOnDelete) void navigate({ to: "/list" });
                  },
                },
              )
            }
          >
            {m.list_card_delete()}
          </Button>
        </AlertDialogFooter>
      </AlertDialogPopup>
    </AlertDialog>
  );
}
