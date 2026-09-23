import { TrashSimpleIcon } from "@phosphor-icons/react";

import { notImplemented } from "@/components/shared/not-implemented";
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

export function DangerSection({ name }: { name: string }) {
  return (
    <div className="border-destructive/32 flex flex-col gap-2 rounded-lg border p-3">
      <span className="text-destructive-foreground text-sm font-medium">Danger zone</span>
      <span className="text-muted-foreground text-xs">
        Deleting the account removes your lists, pins and Cosmo links.
      </span>
      <div className="flex">
        <AlertDialog>
          <AlertDialogTrigger render={<Button variant="destructive-outline" size="sm" />}>
            <TrashSimpleIcon />
            Delete account
          </AlertDialogTrigger>
          <AlertDialogPopup className="max-w-sm">
            <AlertDialogHeader>
              <AlertDialogTitle className="font-display">Delete account?</AlertDialogTitle>
              <AlertDialogDescription>
                This permanently removes <span className="text-foreground">{name}</span>, every list
                and every Cosmo link. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogClose render={<Button variant="outline" />}>Cancel</AlertDialogClose>
              <AlertDialogClose
                render={<Button variant="destructive" />}
                onClick={() => notImplemented({ type: "error", title: "Account deleted" })}
              >
                Delete
              </AlertDialogClose>
            </AlertDialogFooter>
          </AlertDialogPopup>
        </AlertDialog>
      </div>
    </div>
  );
}
