import {
  ArchiveIcon,
  ArrowClockwiseIcon,
  BellSlashIcon,
  ChatsCircleIcon,
  MagnifyingGlassIcon,
  TrayIcon,
  WarningIcon,
} from "@phosphor-icons/react";
import type { ChatBox, ConversationRow } from "@repo/api/schemas/chat";
import type { ValidObjekt } from "@repo/lib/types/objekt";
import { useInfiniteQuery, type UseInfiniteQueryResult, useQuery } from "@tanstack/react-query";
import { Link, useHydrated } from "@tanstack/react-router";
import { type FocusEvent, type RefObject, useEffect, useRef } from "react";

import { PendingStatus } from "@/components/router/pending";
import { EmptyState } from "@/components/shared/empty-state";
import { InfiniteSentinel } from "@/components/shared/infinite-sentinel";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { collectionName } from "@/features/objekt/objekt-label";
import { offerNo } from "@/features/offers/format";
import { OfferThumb } from "@/features/offers/offer-item";
import { useMinuteClock } from "@/hooks/use-minute-clock";
import { relativeTime } from "@/lib/time";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

import { ConversationMenu } from "./conversation-menu";
import { mutedLabel } from "./format";
import type { ConversationsData } from "./live-message";
import { conversationsOptions, requestCountOptions } from "./queries";

const EMPTY = {
  inbox: { icon: ChatsCircleIcon, title: m.chat_empty_inbox, hint: m.chat_empty_inbox_hint },
  requests: { icon: TrayIcon, title: m.chat_empty_requests, hint: m.chat_empty_requests_hint },
  archived: { icon: ArchiveIcon, title: m.chat_empty_archived, hint: m.chat_empty_archived_hint },
} as const;

export function ConversationList({ box, q }: { box: ChatBox; q: string | undefined }) {
  const query = useInfiniteQuery(conversationsOptions(box, q));
  const now = useMinuteClock();
  const region = useRef<HTMLDivElement>(null);
  const rows = query.data?.pages.flatMap((page) => page.items) ?? [];
  const onFocus = useFocusAfterLeave(region, rows);

  // one node for every state, so a change of its text is announced rather than a new node
  // appearing with its text already in it; the previous query's results are not read as the new one's
  const announcement =
    q === undefined || !query.isSuccess || query.isPlaceholderData
      ? null
      : rows.length === 0
        ? m.chat_search_none()
        : m.chat_search_results({ count: query.hasNextPage ? `${rows.length}+` : rows.length });

  return (
    <div
      ref={region}
      tabIndex={-1}
      onFocus={onFocus}
      className="flex min-h-0 flex-1 flex-col outline-none"
    >
      <p role="status" className="sr-only">
        {announcement}
      </p>
      <ConversationListBody query={query} rows={rows} box={box} q={q} now={now} />
    </div>
  );
}

function ConversationListBody({
  query,
  rows,
  box,
  q,
  now,
}: {
  query: UseInfiniteQueryResult<ConversationsData>;
  rows: ConversationRow[];
  box: ChatBox;
  q: string | undefined;
  now: number;
}) {
  if (query.isPending) return <ConversationListSkeleton />;

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

  const collections = Object.assign({}, ...query.data.pages.map((page) => page.collections));
  if (rows.length === 0 && q !== undefined) {
    return (
      <EmptyState
        icon={MagnifyingGlassIcon}
        bordered={false}
        title={m.chat_empty_search({ query: q })}
        hint={m.chat_empty_search_hint()}
        action={
          <Button
            variant="outline"
            size="sm"
            render={<Link to="." search={(prev) => ({ ...prev, q: undefined })} replace />}
          >
            {m.chat_search_clear()}
          </Button>
        }
      />
    );
  }
  if (rows.length === 0) {
    const empty = EMPTY[box];
    return (
      <EmptyState
        icon={empty.icon}
        bordered={false}
        title={empty.title()}
        hint={empty.hint()}
        action={box === "inbox" ? <WaitingRequests /> : undefined}
      />
    );
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
      <ul className="flex flex-col p-2">
        {rows.map((row) => (
          <ConversationItem key={row.id} row={row} collections={collections} now={now} />
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

/** The empty Inbox points at the requests waiting, which never reach the Inbox or its badge. */
function WaitingRequests() {
  const { data: count } = useQuery(requestCountOptions());
  if (!count) return null;
  return (
    <div className="flex flex-col items-center gap-2">
      <p className="text-sm">{m.chat_empty_inbox_requests({ count })}</p>
      <Button
        variant="outline"
        size="sm"
        render={<Link to="/messages" search={(prev) => ({ ...prev, box: "requests" })} />}
      >
        {m.chat_empty_inbox_requests_link()}
      </Button>
    </div>
  );
}

/**
 * When the row that held focus leaves the list (archived, declined, accepted), focus moves to
 * the row now in its place, or the last one, or the list when none is left. `onFocus` goes on
 * the list's region.
 */
function useFocusAfterLeave(region: RefObject<HTMLDivElement | null>, rows: ConversationRow[]) {
  const held = useRef<{ id: number; index: number } | null>(null);
  const ids = rows.map((row) => row.id);

  useEffect(() => {
    const previous = held.current;
    if (!previous || ids.includes(previous.id)) return;
    held.current = null;
    // focus already went somewhere on purpose, as a dialog does
    if (document.activeElement && document.activeElement !== document.body) return;
    const next = ids[Math.min(previous.index, ids.length - 1)];
    const target =
      next === undefined
        ? region.current
        : region.current?.querySelector<HTMLElement>(`[data-conversation-link="${next}"]`);
    target?.focus();
  }, [ids.join(","), region]);

  return (event: FocusEvent<HTMLElement>) => {
    const row = (event.target as HTMLElement).closest<HTMLElement>("[data-conversation-row]");
    const id = Number(row?.dataset.conversationRow);
    held.current = row ? { id, index: ids.indexOf(id) } : null;
  };
}

function preview(last: ConversationRow["last"]) {
  // the starter's row of a conversation nobody has written in yet
  if (!last) return m.chat_preview_empty();
  if (last.unsent) return m.chat_unsent();
  const text =
    last.body ??
    (last.offerId !== null ? m.chat_preview_offer({ offer: offerNo(last.offerId) }) : null) ??
    m.chat_preview_card();
  return last.mine ? m.chat_preview_mine({ text }) : text;
}

function ConversationItem({
  row,
  collections,
  now,
}: {
  row: ConversationRow;
  collections: Record<string, ValidObjekt>;
  now: number;
}) {
  const { partner, last, context, unread, muted } = row;
  const contextCollection = context ? collections[context.collectionSlug] : undefined;
  const name = partner.identity.name;
  const hydrated = useHydrated();
  // the exact end of a mute is in the viewer's time zone, which the server render does not know
  const mutedText = muted ? (hydrated ? mutedLabel(muted) : m.chat_muted_always()) : null;

  return (
    <li data-conversation-row={row.id} className="relative">
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
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
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
          {context ? (
            <div className="mt-1 flex min-w-0 items-center gap-2">
              <div aria-hidden className="flex">
                <OfferThumb
                  slug={context.collectionSlug}
                  collection={contextCollection}
                  className="w-7"
                />
              </div>
              <span className="text-muted-foreground min-w-0 truncate font-mono text-xs">
                {collectionName(context.collectionSlug, contextCollection)}
                {context.serial !== null
                  ? ` ${m.chat_card_serial({ serial: context.serial })}`
                  : ""}
              </span>
            </div>
          ) : null}
        </div>
      </Link>
      <ConversationMenu
        conversation={row}
        name={name}
        className="absolute end-2 top-1/2 -translate-y-1/2"
      />
    </li>
  );
}

export function ConversationListSkeleton() {
  return (
    <div className="flex flex-col gap-1 p-2">
      <PendingStatus />
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
