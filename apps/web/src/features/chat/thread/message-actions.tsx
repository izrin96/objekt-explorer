import { ArrowBendUpLeftIcon, DotsThreeIcon, TrashSimpleIcon } from "@phosphor-icons/react";
import { type RefObject, useRef, useState } from "react";

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
import { useUnsendMessage } from "@/features/chat/actions";
import { canUnsend, type ThreadPage } from "@/features/chat/thread-cache";
import { m } from "@/paraglide/messages";

/** Reply on any text or card message, and Unsend on the viewer's own while it can still be unsent. */
export function MessageActions({
  conversationId,
  message,
  unsendable,
  replyFocus,
  onReply,
}: {
  conversationId: number;
  message: ThreadPage["messages"][number];
  unsendable: boolean;
  /** where focus goes after Reply, rather than back to the menu's button */
  replyFocus: RefObject<HTMLElement | null>;
  onReply: (() => void) | null;
}) {
  const [confirming, setConfirming] = useState(false);
  const replying = useRef(false);
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
        <MenuPopup
          align="end"
          finalFocus={() => {
            if (!replying.current) return true;
            replying.current = false;
            return replyFocus.current;
          }}
        >
          {onReply ? (
            <MenuItem
              onClick={() => {
                replying.current = true;
                onReply();
              }}
            >
              <ArrowBendUpLeftIcon />
              {m.chat_reply()}
            </MenuItem>
          ) : null}
          {unsendable ? (
            <MenuItem variant="destructive" onClick={confirm}>
              <TrashSimpleIcon />
              {m.chat_unsend()}
            </MenuItem>
          ) : null}
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
