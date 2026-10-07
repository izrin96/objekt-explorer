import { ChatsCircleIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";

import { CountBadge } from "@/components/shared/count-badge";
import { Button } from "@/components/ui/button";
import { m } from "@/paraglide/messages";
import { useUserSocketLive } from "@/stores/user-socket";

import { chatUnreadOptions } from "./queries";

/** Counts unread Inbox conversations that are not muted; requests never count. */
export function MessagesIcon() {
  const live = useUserSocketLive((state) => state.live);
  const { data: unread = 0 } = useQuery(chatUnreadOptions(live));

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={unread > 0 ? m.chat_icon_label_unread({ count: unread }) : m.chat_icon_label()}
      className="data-[status=active]:bg-secondary data-[status=active]:text-foreground relative shrink-0"
      render={<Link to="/messages" />}
    >
      <ChatsCircleIcon />
      <CountBadge count={unread} />
    </Button>
  );
}
