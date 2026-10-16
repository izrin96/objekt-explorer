import { ChatsCircleIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";

import { UnreadDot } from "@/components/shared/unread-dot";
import { Button } from "@/components/ui/button";
import { m } from "@/paraglide/messages";
import { useUserSocketLive } from "@/stores/user-socket";

import { useRequestsUnseen } from "./actions";
import { chatUnreadOptions } from "./queries";

/** Counts unread Inbox conversations that are not muted; requests add the dot but no number. */
export function MessagesIcon() {
  const live = useUserSocketLive((state) => state.live);
  const { data: unread = 0 } = useQuery(chatUnreadOptions(live));
  const unseen = useRequestsUnseen();
  const label = unseen
    ? unread > 0
      ? m.chat_icon_label_unread_requests({ count: unread })
      : m.chat_icon_label_requests()
    : unread > 0
      ? m.chat_icon_label_unread({ count: unread })
      : m.chat_icon_label();

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={label}
      className="data-[status=active]:bg-secondary data-[status=active]:text-foreground relative shrink-0"
      render={<Link to="/messages" />}
    >
      <ChatsCircleIcon />
      <UnreadDot count={unread + Number(unseen)} />
    </Button>
  );
}
