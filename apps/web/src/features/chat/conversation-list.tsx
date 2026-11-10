import {
  ArchiveIcon,
  ArrowClockwiseIcon,
  ChatsCircleIcon,
  ChecksIcon,
  MagnifyingGlassIcon,
  TrayIcon,
  WarningIcon,
} from "@phosphor-icons/react";
import {
  type ChatBox,
  type ConversationRow,
  INBOX_SHOWS,
  type InboxShow,
  UNREAD_COUNT_CAP,
} from "@repo/api/schemas/chat";
import { useInfiniteQuery, type UseInfiniteQueryResult, useQuery } from "@tanstack/react-query";
import { Link, useHydrated, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";

import { PendingStatus } from "@/components/router/pending";
import { EmptyState } from "@/components/shared/empty-state";
import { InfiniteSentinel } from "@/components/shared/infinite-sentinel";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TogglePrimitive } from "@/components/ui/toggle";
import { ToggleGroupPrimitive } from "@/components/ui/toggle-group";
import { WantedRuleNotice } from "@/features/offers/wanted-rule-notice";
import { useMinuteClock } from "@/hooks/use-minute-clock";
import { formatCount } from "@/lib/number";
import { m } from "@/paraglide/messages";

import { useSeeRequests } from "./actions";
import { useDraftThread, useFocusAfterLeave, useKeptOpenRow } from "./conversation-list-hooks";
import { ConversationItem, DraftRow } from "./conversation-row";
import type { ConversationsData } from "./live-message";
import { conversationsOptions, inboxCountsOptions, requestCountOptions } from "./queries";

const EMPTY = {
  inbox: { icon: ChatsCircleIcon, title: m.chat_empty_inbox, hint: m.chat_empty_inbox_hint },
  requests: { icon: TrayIcon, title: m.chat_empty_requests, hint: m.chat_empty_requests_hint },
  archived: { icon: ArchiveIcon, title: m.chat_empty_archived, hint: m.chat_empty_archived_hint },
} as const;

const SHOW_LABEL: Record<InboxShow, () => string> = {
  all: m.offer_filter_all,
  unread: m.chat_unread,
  "needs-you": m.offer_filter_needs_you,
};

const SHOW_EMPTY = {
  unread: { icon: ChecksIcon, title: m.chat_show_empty_unread },
  "needs-you": { icon: ChecksIcon, title: m.chat_show_empty_needs_you },
} as const;

export function ConversationList({
  box,
  q,
  show,
}: {
  box: ChatBox;
  q: string | undefined;
  show: InboxShow;
}) {
  useSeeRequests(box === "requests" && !q);
  const query = useInfiniteQuery(conversationsOptions(box, q, show));
  const now = useMinuteClock();
  const region = useRef<HTMLDivElement>(null);
  // a chip picked again counts as applying the filter, which lets the kept open row go
  const [picks, setPicks] = useState(0);
  const listed = query.data?.pages.flatMap((page) => page.items) ?? [];
  const rows = useKeptOpenRow(
    listed,
    show,
    `${show}:${q ?? ""}:${picks}`,
    !query.isPlaceholderData,
  );
  const onFocus = useFocusAfterLeave(region, rows);

  // one node for every state, so a change of its text is announced rather than a new node
  // appearing with its text already in it; the previous query's results are not read as the new one's
  const announcement =
    q === undefined || !query.isSuccess || query.isPlaceholderData
      ? null
      : rows.length === 0
        ? m.chat_search_none()
        : m.chat_search_results({
            count: `${formatCount(rows.length)}${query.hasNextPage ? "+" : ""}`,
          });

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
      {box === "inbox" && q === undefined ? <WantedRuleNotice /> : null}
      {box === "inbox" ? <ShowChips show={show} onPick={() => setPicks((n) => n + 1)} /> : null}
      <ConversationListBody query={query} rows={rows} box={box} q={q} show={show} now={now} />
    </div>
  );
}

function ConversationListBody({
  query,
  rows,
  box,
  q,
  show,
  now,
}: {
  query: UseInfiniteQueryResult<ConversationsData>;
  rows: ConversationRow[];
  box: ChatBox;
  q: string | undefined;
  show: InboxShow;
  now: number;
}) {
  const draft = useDraftThread(rows, box, q);
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
  if (rows.length === 0 && show !== "all") {
    const empty = SHOW_EMPTY[show];
    return (
      <EmptyState
        icon={empty.icon}
        bordered={false}
        title={empty.title()}
        action={
          <Button
            variant="outline"
            size="sm"
            render={<Link to="." search={(prev) => ({ ...prev, show: undefined })} replace />}
          >
            {m.offer_exchange_show_all()}
          </Button>
        }
      />
    );
  }
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
  if (rows.length === 0 && !draft) {
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
        {draft ? <DraftRow draft={draft} /> : null}
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

/** All, Unread and Needs you, under the Inbox's search; the counts leave out muted conversations. */
function ShowChips({ show, onPick }: { show: InboxShow; onPick: () => void }) {
  const navigate = useNavigate();
  const { data: counts } = useQuery(inboxCountsOptions());
  // the server's render can't wait for the counts, which stream in after it
  const hydrated = useHydrated();
  const count = (key: InboxShow) => {
    if (!hydrated) return null;
    const value = key === "unread" ? counts?.unread : key === "needs-you" ? counts?.needsYou : null;
    if (value === null || value === undefined) return null;
    return value >= UNREAD_COUNT_CAP ? "99+" : String(value);
  };
  return (
    <ToggleGroupPrimitive
      value={[show]}
      // pressing the active chip again would empty the group; one show is always picked
      onValueChange={([next]: InboxShow[]) => {
        if (!next) return;
        onPick();
        void navigate({
          to: ".",
          search: (prev) => ({ ...prev, show: next === "all" ? undefined : next }),
          replace: true,
        });
      }}
      aria-label={m.chat_show_label()}
      data-scroll-x
      className="flex shrink-0 gap-1.5 overflow-x-auto px-3 py-2"
    >
      {INBOX_SHOWS.map((key) => (
        <TogglePrimitive
          key={key}
          value={key}
          render={
            <Button
              variant={show === key ? "default" : "outline"}
              size="sm"
              className="shrink-0 rounded-full"
            />
          }
        >
          {SHOW_LABEL[key]()}
          {count(key) === null ? null : <span className="text-xs opacity-70">{count(key)}</span>}
        </TogglePrimitive>
      ))}
    </ToggleGroupPrimitive>
  );
}

/** The empty Inbox points at the requests waiting, which never reach the Inbox or its badge. */
function WaitingRequests() {
  const { data: count } = useQuery(requestCountOptions());
  if (!count) return null;
  return (
    <div className="flex flex-col items-center gap-2">
      <p className="text-sm">{m.chat_empty_inbox_requests({ count: formatCount(count) })}</p>
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
