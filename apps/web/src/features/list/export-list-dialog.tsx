import { useMutation } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPopup,
  DialogTitle,
} from "@/components/ui/dialog";
import { toastManager } from "@/components/ui/toast";
import { orpc } from "@/lib/orpc";
import { m } from "@/paraglide/messages";

export function ExportListDialog({
  slug,
  open,
  onOpenChange,
}: {
  slug: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const exportList = useMutation(
    orpc.list.export.mutationOptions({
      onSuccess: (file) => {
        const url = URL.createObjectURL(file);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = file.name;
        anchor.click();
        URL.revokeObjectURL(url);
        onOpenChange(false);
      },
      onError: ({ message }) => {
        toastManager.add({ type: "error", title: m.common_export_error(), description: message });
      },
    }),
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPopup className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display">{m.common_export_title()}</DialogTitle>
          <DialogDescription>{m.common_export_description()}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>{m.common_modal_cancel()}</DialogClose>
          <Button loading={exportList.isPending} onClick={() => exportList.mutate({ slug })}>
            {m.common_actions_export()}
          </Button>
        </DialogFooter>
      </DialogPopup>
    </Dialog>
  );
}
