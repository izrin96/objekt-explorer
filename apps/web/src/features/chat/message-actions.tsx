import { DotsThreeIcon } from "@phosphor-icons/react";
import { useState } from "react";

import {
  AlertDialog,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogPopup,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Menu, MenuItem, MenuPopup, MenuTrigger } from "@/components/ui/menu";
import { toastManager } from "@/components/ui/toast";
import { m } from "@/paraglide/messages";

import { useUnsendMessage } from "./actions";
import { canUnsend, type ThreadPage } from "./thread-cache";

/** The menu on one of the viewer's own messages; shown only while it can still be unsent. */
export function MessageActions({
  conversationId,
  message,
}: {
  conversationId: number;
  message: ThreadPage["messages"][number];
}) {
  const [confirming, setConfirming] = useState(false);
  const unsend = useUnsendMessage(conversationId);
  // the menu's clock moves once a minute, so the window is checked again when Unsend is chosen
  const confirm = () => {
    if (canUnsend(message, Date.now())) setConfirming(true);
    else toastManager.add({ type: "error", title: m.chat_refused_unsend_closed() });
  };

  return (
    <>
      <Menu>
        <MenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label={m.chat_message_actions()}
              className="text-muted-foreground data-popup-open:opacity-100 pointer-fine:opacity-0 pointer-fine:group-focus-within:opacity-100 pointer-fine:group-hover:opacity-100"
            />
          }
        >
          <DotsThreeIcon weight="bold" />
        </MenuTrigger>
        <MenuPopup align="end">
          <MenuItem variant="destructive" onClick={confirm}>
            {m.chat_unsend()}
          </MenuItem>
        </MenuPopup>
      </Menu>
      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogPopup className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display">{m.chat_unsend_title()}</AlertDialogTitle>
            <AlertDialogDescription>{m.chat_unsend_desc()}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setConfirming(false)}>
              {m.common_modal_cancel()}
            </Button>
            <Button
              variant="destructive"
              loading={unsend.isPending}
              onClick={() =>
                unsend.mutate({ messageId: message.id }, { onSettled: () => setConfirming(false) })
              }
            >
              {m.chat_unsend()}
            </Button>
          </AlertDialogFooter>
        </AlertDialogPopup>
      </AlertDialog>
    </>
  );
}
