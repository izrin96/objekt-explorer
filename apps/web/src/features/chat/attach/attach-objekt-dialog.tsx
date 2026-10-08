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
import { Tabs, TabsList, TabsPanel, TabsTab } from "@/components/ui/tabs";
import type { Attachment } from "@/features/chat/attachment";
import { m } from "@/paraglide/messages";

import { ListPicker } from "./attach-list-picker";
import { OwnedPicker } from "./attach-owned-picker";

const PANEL = "flex min-h-0 flex-col px-6 pt-4 pb-4";

export function AttachObjektDialog({
  open,
  onOpenChange,
  onPick,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (attachment: Attachment) => void;
}) {
  const pick = (attachment: Attachment) => {
    onPick(attachment);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* a fixed height, so the grid scrolls inside it and stays virtualised */}
      <DialogPopup className="h-[min(48rem,calc(100dvh-(--spacing(8))))] max-w-3xl max-sm:h-[calc(100dvh-(--spacing(12)))]">
        <DialogHeader>
          <DialogTitle className="font-display">{m.chat_attach_title()}</DialogTitle>
          <DialogDescription>{m.chat_attach_description()}</DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="objekts" className="min-h-0 flex-1 gap-0">
          <div className="mx-6 shrink-0">
            <TabsList variant="underline" className="w-full justify-start border-b">
              <TabsTab value="objekts">{m.chat_attach_objekts()}</TabsTab>
              <TabsTab value="lists">{m.chat_attach_lists()}</TabsTab>
            </TabsList>
          </div>
          <TabsPanel value="objekts" className={PANEL}>
            <OwnedPicker onPick={pick} />
          </TabsPanel>
          <TabsPanel value="lists" className={PANEL}>
            <ListPicker onPick={pick} />
          </TabsPanel>
        </Tabs>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>{m.common_modal_cancel()}</DialogClose>
        </DialogFooter>
      </DialogPopup>
    </Dialog>
  );
}
