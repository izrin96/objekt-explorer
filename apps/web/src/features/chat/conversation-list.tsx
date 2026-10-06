import {
  ArchiveIcon,
  ArrowClockwiseIcon,
  BellSlashIcon,
  ChatsCircleIcon,
  TrayIcon,
  WarningIcon,
} from "@phosphor-icons/react";
import type { ChatBox, ConversationRow } from "@repo/api/schemas/chat";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { EmptyState } from "@/components/shared/empty-state";
import { InfiniteSentinel } from "@/components/shared/infinite-sentinel";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useHydrated } from "@/hooks/use-hydrated";
import { relativeTime } from "@/lib/time";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

import { ConversationMenu } from "./conversation-menu";
import { mutedLabel } from "./format";
import { conversationsOptions } from "./queries";

const EMPTY = {
  inbox: { icon: ChatsCircleIcon, title: m.chat_empty_inbox, hint: m.chat_empty_inbox_hint },
  requests: { icon: TrayIcon, title: m.chat_empty_requests, hint: m.chat_empty_requests_hint },
  archived: { icon: ArchiveIcon, title: m.chat_empty_archived, hint: m.chat_empty_archived_hint },
} as const;

const MINUTE = 60_000;

/** Relative times re-read once a minute while the list stays open beside a thread. */
function useMinuteClock() {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), MINUTE);
    return () => clearInterval(timer);
  }, []);
  return now;
}

export function ConversationList({ box }: { box: ChatBox }) {
  const query = useInfiniteQuery(conversationsOptions(box));
  const now = useMinuteClock();

  if (query.isPending) {
    return (
      <div className="flex flex-col gap-1 p-2">
        {[0, 1, 2, 3].map((row) => (
          <div key={row} className="flex items-center gap-3 px-2 py-2.5">
            <Skeleton className="size-10 shrink-0 rounded-full" />
            <div className="flex flex-1 flex-col gap-1.5">
              <Skeleton className="h-3.5 w-1/2" />
              <Skeleton className="h-3.5 w-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (query.isError) {
    return (
      <EmptyState
        icon={WarningIcon}
        bordered={false}
        title={m.common_error_loading_data()}
        action={
          <Button variant="outline" size="sm" onClick={() => void query.refetch()}>
            <ArrowClockwiseIcon />
            {m.common_error_retry()}
          </Button>
        }
      />
    );
  }

  const rows = query.data.pages.flatMap((page) => page.items);
  if (rows.length === 0) {
    const empty = EMPTY[box];
    return (
      <EmptyState icon={empty.icon} bordered={false} title={empty.title()} hint={empty.hint()} />
    );
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
      <ul className="flex flex-col p-2">
        {rows.map((row) => (
          <ConversationItem key={row.id} row={row} now={now} />
        ))}
      </ul>
      <InfiniteSentinel
        label={m.infinite_query_load_more_aria()}
        hasNextPage={query.hasNextPage}
        isFetchingNextPage={query.isFetchingNextPage}
        isError={query.isFetchNextPageError}
        fetchNextPage={() => void query.fetchNextPage()}
      />
    </div>
  );
}

function preview(last: ConversationRow["last"]) {
  // the starter's row of a conversation nobody has written in yet
  if (!last) return m.chat_preview_empty();
  const text = last.body ?? m.chat_preview_card();
  return last.mine ? m.chat_preview_mine({ text }) : text;
}

function ConversationItem({ row, now }: { row: ConversationRow; now: number }) {
  const { partner, last, unread, muted } = row;
  const name = partner.identity.name;
  const hydrated = useHydrated();
  // the exact end of a mute is in the viewer's time zone, which the server render does not know
  const mutedText = muted ? (hydrated ? mutedLabel(muted) : m.chat_muted_always()) : null;

  return (
    <li className="relative">
      {/* the menu sits beside the link, not in it: a button inside a link is not allowed */}
      <Link
        to="/messages/$id"
        params={{ id: String(row.id) }}
        search={(prev) => prev}
        data-conversation-link={row.id}
        className="hover:bg-secondary/60 focus-visible:ring-ring data-[status=active]:bg-secondary flex items-center gap-3 rounded-lg py-2.5 ps-2 pe-11 outline-none focus-visible:ring-2"
      >
        <Avatar className="size-10 shrink-0">
          {partner.user.image ? <AvatarImage src={partner.user.image} alt="" /> : null}
          <AvatarFallback>{name.slice(0, 1).toUpperCase()}</AvatarFallback>
        </Avatar>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="flex min-w-0 items-baseline gap-2">
            <span
              className={cn(
                "min-w-0 flex-1 truncate text-sm",
                unread ? "font-semibold" : "font-medium",
              )}
            >
              {name}
            </span>
            {last ? (
              <time
                dateTime={last.createdAt}
                className="text-muted-foreground shrink-0 text-xs tabular-nums"
                suppressHydrationWarning
              >
                {relativeTime(new Date(last.createdAt).getTime(), now)}
              </time>
            ) : null}
          </span>
          <span className="flex min-w-0 items-center gap-1.5">
            <span
              className={cn(
                "min-w-0 flex-1 truncate text-sm",
                unread ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {preview(last)}
            </span>
            {mutedText ? (
              <span className="text-muted-foreground shrink-0" title={mutedText}>
                <BellSlashIcon className="size-3.5" aria-hidden />
                <span className="sr-only">{mutedText}</span>
              </span>
            ) : null}
            {unread ? (
              <span className="flex size-2 shrink-0">
                <span className="bg-foreground size-full rounded-full" />
                <span className="sr-only">{m.chat_unread()}</span>
              </span>
            ) : null}
          </span>
        </span>
      </Link>
      <ConversationMenu
        conversation={row}
        name={name}
        className="absolute end-2 top-1/2 -translate-y-1/2"
      />
    </li>
  );
}
