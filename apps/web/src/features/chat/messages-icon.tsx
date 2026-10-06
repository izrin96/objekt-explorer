import { ChatsCircleIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { m } from "@/paraglide/messages";

import { chatUnreadOptions } from "./queries";

/** Counts unread Inbox conversations that are not muted; requests never count. */
export function MessagesIcon({ live }: { live: boolean }) {
  const { data: unread = 0 } = useQuery(chatUnreadOptions(live));

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={unread > 0 ? m.chat_icon_label_unread({ count: unread }) : m.chat_icon_label()}
      className="relative shrink-0"
      render={<Link to="/messages" />}
    >
      <ChatsCircleIcon />
      {unread > 0 ? (
        <span
          aria-hidden
          className="bg-accent-solid ring-background absolute top-0.5 right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] leading-none font-semibold text-white tabular-nums ring-2"
        >
          {unread > 9 ? "9+" : unread}
        </span>
      ) : null}
    </Button>
  );
}
