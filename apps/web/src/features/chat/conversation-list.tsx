import {
  ArchiveIcon,
  ArrowClockwiseIcon,
  BellSlashIcon,
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
import type { ValidObjekt } from "@repo/lib/types/objekt";
import { useInfiniteQuery, type UseInfiniteQueryResult, useQuery } from "@tanstack/react-query";
import { Link, useHydrated, useNavigate, useParams } from "@tanstack/react-router";
import {
  type FocusEvent,
  type ReactNode,
  type RefObject,
  useEffect,
  useRef,
  useState,
} from "react";

import { PendingStatus } from "@/components/router/pending";
import { EmptyState } from "@/components/shared/empty-state";
import { InfiniteSentinel } from "@/components/shared/infinite-sentinel";
import { PersonAvatar } from "@/components/shared/person-avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { collectionName } from "@/features/objekt/objekt-label";
import { offerNo } from "@/features/offers/format";
import { OfferThumb } from "@/features/offers/offer-item";
import { TagBadges } from "@/features/trade/tag-label";
import { useMinuteClock } from "@/hooks/use-minute-clock";
import { relativeTime } from "@/lib/time";
import { TONE_INK, TONE_SOLID } from "@/lib/tone";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

import { useSeeRequests } from "./actions";
import { ConversationMenu } from "./conversation-menu";
import { dealNo, dealTone, rowText } from "./deal-text";
import { nextDraftId, showsDraft } from "./draft-row";
import { mutedLabel } from "./format";
import { type Kept, nextKept, withKept } from "./kept-row";
import type { ConversationsData } from "./live-message";
import {
  conversationsOptions,
  inboxCountsOptions,
  requestCountOptions,
  threadOptions,
} from "./queries";
import { newestId, threadMessages } from "./thread-cache";

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
    <div
      role="group"
      aria-label={m.chat_show_label()}
      data-scroll-x
      className="flex shrink-0 gap-1.5 overflow-x-auto px-3 py-2"
    >
      {INBOX_SHOWS.map((key) => (
        <Button
          key={key}
          variant={show === key ? "default" : "outline"}
          size="sm"
          aria-pressed={show === key}
          className="shrink-0 rounded-full"
          onClick={() => {
            onPick();
            void navigate({
              to: ".",
              search: (prev) => ({ ...prev, show: key === "all" ? undefined : key }),
              replace: true,
            });
          }}
        >
          {SHOW_LABEL[key]()}
          {count(key) === null ? null : (
            <span className="font-mono text-xs tabular-nums opacity-70">{count(key)}</span>
          )}
        </Button>
      ))}
    </div>
  );
}

/**
 * Under a chip, the open conversation's row stays where it was after a refetch drops it, until
 * the filter is next applied; it reads its deal from the open thread, which every offer and
 * trade change refreshes. Component state, not a cache write, so the server's list stays the truth.
 */
function useKeptOpenRow(
  rows: ConversationRow[],
  show: InboxShow,
  filter: string,
  settled: boolean,
) {
  const openId = useParams({ strict: false, select: (params) => params.id });
  const id = openId === undefined ? null : Number(openId);
  const { data } = useInfiniteQuery({ ...threadOptions(id ?? 0), enabled: false });
  const conversation = data?.pages[0]?.conversation;
  // archived or turned into a request from the thread: it has left the Inbox
  const inInbox = !conversation || (!conversation.archived && !conversation.request);
  const [kept, setKept] = useState<Kept<ConversationRow>>(null);
  const next = nextKept(kept, rows, id, show !== "all" && inInbox, filter, settled);
  if (next !== kept) setKept(next);
  const newest = data ? threadMessages(data).at(-1) : undefined;
  // open beside the list, so read; its last message and deal come from the thread
  const live =
    next && conversation
      ? {
          ...next.row,
          deal: conversation.deal,
          muted: conversation.muted,
          unread: false,
          unreadCount: 0,
          last: newest
            ? {
                id: newest.id,
                mine: newest.mine,
                body: newest.body,
                card: newest.card?.kind ?? null,
                offerId: newest.offer?.id ?? null,
                createdAt: newest.createdAt,
                unsent: newest.unsent,
              }
            : next.row.last,
        }
      : undefined;
  return withKept(rows, next, live);
}

type Draft = { id: number; partner: ConversationRow["partner"] };

/**
 * The open thread while nothing is written in it yet: no list holds it until its first
 * message, so the Inbox shows it at the top until its real row arrives (`draft-row.ts`).
 */
function useDraftThread(rows: ConversationRow[], box: ChatBox, q: string | undefined) {
  const openId = useParams({ strict: false, select: (params) => params.id });
  const id = openId === undefined ? null : Number(openId);
  // reads the thread pane's query, never fetches it; no conversation has id 0
  const { data } = useInfiniteQuery({ ...threadOptions(id ?? 0), enabled: false });
  const conversation = data?.pages[0]?.conversation;
  const open =
    id !== null && data && conversation
      ? { id, empty: newestId(data) === 0, archived: conversation.archived }
      : null;
  const listed = rows.map((row) => row.id);
  const [draftId, setDraftId] = useState<number | null>(null);
  const next = nextDraftId(draftId, open, listed);
  if (next !== draftId) setDraftId(next);
  if (!open || !conversation || !showsDraft(next, open, listed, box, q)) return null;
  return { id: open.id, partner: conversation.partner } satisfies Draft;
}

function DraftRow({ draft }: { draft: Draft }) {
  return (
    <li data-conversation-row={draft.id} className={ROW_LINE}>
      <RowLink id={draft.id} partner={draft.partner} className="pe-2">
        <span className="truncate text-sm font-medium">{draft.partner.identity.name}</span>
        <span className="text-muted-foreground truncate text-sm italic">
          {m.chat_preview_draft()}
        </span>
      </RowLink>
    </li>
  );
}

/**
 * A line above every row but the first, from the text and not the avatar, so the avatars stay a
 * column; it gives way beside the open row, whose highlight already sets it apart.
 */
const ROW_LINE =
  "before:bg-border relative not-first:before:absolute not-first:before:start-15 not-first:before:end-2 not-first:before:top-0 not-first:before:h-px has-data-[status=active]:before:hidden [li:has([data-status=active])+&]:before:hidden";

function RowLink({
  id,
  partner,
  className,
  children,
}: {
  id: number;
  partner: ConversationRow["partner"];
  className?: string;
  children: ReactNode;
}) {
  const name = partner.identity.name;
  return (
    <Link
      to="/messages/$id"
      params={{ id: String(id) }}
      search={(prev) => prev}
      data-conversation-link={id}
      className={cn(
        "hover:bg-secondary/60 focus-visible:ring-ring data-[status=active]:bg-secondary flex items-start gap-3 rounded-lg py-2.5 ps-2 outline-none focus-visible:ring-2",
        className,
      )}
    >
      <PersonAvatar name={name} image={partner.user.image} className="size-10 shrink-0" />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">{children}</div>
    </Link>
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
  if (last.unsent) return m.chat_unsent();
  const text =
    last.body ??
    (last.offerId !== null ? m.chat_preview_offer({ offer: offerNo(last.offerId) }) : null) ??
    (last.card === "post" ? m.chat_preview_post() : m.chat_preview_card());
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
  const { partner, last, context, unread, unreadCount, muted, deal } = row;
  const contextCollection =
    context?.kind === "objekt" ? collections[context.collectionSlug] : undefined;
  const name = partner.identity.name;
  const hydrated = useHydrated();
  // the exact end of a mute is in the viewer's time zone, which the server render does not know
  const mutedText = muted ? (hydrated ? mutedLabel(muted) : m.chat_muted_always()) : null;

  return (
    <li data-conversation-row={row.id} className={ROW_LINE}>
      {/* the menu sits beside the link, not in it: a button inside a link is not allowed */}
      <RowLink id={row.id} partner={partner} className="pe-2">
        {/* only the name's line makes room for the menu, so the preview gets the row's width */}
        <span className="me-8 flex min-w-0 items-baseline gap-2">
          <span
            className={cn(
              "min-w-0 flex-1 truncate text-sm",
              unread && !muted ? "font-semibold" : "font-medium",
            )}
          >
            {name}
          </span>
          <time
            dateTime={last.createdAt}
            className="text-muted-foreground shrink-0 text-xs tabular-nums"
            suppressHydrationWarning
          >
            {relativeTime(new Date(last.createdAt).getTime(), now)}
          </time>
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
          {unread ? <UnreadMark count={unreadCount} muted={muted !== null} /> : null}
        </span>
        {deal ? (
          <DealLine deal={deal} muted={muted !== null} />
        ) : context?.kind === "objekt" ? (
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
              {context.serial !== null ? ` ${m.chat_card_serial({ serial: context.serial })}` : ""}
            </span>
          </div>
        ) : context?.kind === "post" ? (
          <div className="mt-1 flex min-w-0 items-center gap-2">
            {context.post ? (
              <>
                <TagBadges tags={context.post.tags} />
                <span className="text-muted-foreground min-w-0 truncate font-mono text-xs">
                  {m.chat_post_title({ name: context.post.owner.name })}
                </span>
              </>
            ) : (
              <span className="text-muted-foreground min-w-0 truncate font-mono text-xs">
                {m.chat_post_removed()}
              </span>
            )}
          </div>
        ) : null}
      </RowLink>
      <ConversationMenu conversation={row} name={name} className="absolute end-2 top-1.5" />
    </li>
  );
}

/** The count of unread messages; a row from before the count existed keeps the dot. */
function UnreadMark({ count, muted }: { count: number; muted: boolean }) {
  if (count === 0) {
    return (
      <span className="flex size-2 shrink-0">
        <span
          className={cn("size-full rounded-full", muted ? "bg-muted-foreground" : "bg-foreground")}
        />
        <span className="sr-only">{m.chat_unread()}</span>
      </span>
    );
  }
  const over = count >= UNREAD_COUNT_CAP;
  return (
    <span
      className={cn(
        "flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1.5 font-mono text-xs font-medium tabular-nums",
        muted ? "bg-muted text-muted-foreground" : "bg-foreground text-background",
      )}
    >
      <span aria-hidden>{over ? "99+" : count}</span>
      <span className="sr-only">
        {over
          ? m.chat_unread_count_over()
          : count === 1
            ? m.chat_unread_count_one()
            : m.chat_unread_count({ count })}
      </span>
    </span>
  );
}

/**
 * One line that never wraps: the words truncate, the number and the trailing count stay whole.
 * A muted row is neutral whatever the state.
 */
function DealLine({ deal, muted }: { deal: NonNullable<ConversationRow["deal"]>; muted: boolean }) {
  const tone = muted ? "neutral" : dealTone(deal.state);
  const { words, trailing } = rowText(deal);
  return (
    <span className={cn("mt-1 flex min-w-0 items-center gap-1.5 text-xs", TONE_INK[tone])}>
      <span aria-hidden className={cn("size-1.5 shrink-0 rounded-full", TONE_SOLID[tone])} />
      <span className="shrink-0 font-mono">{dealNo(deal)}</span>
      <span aria-hidden className="shrink-0">
        ·
      </span>
      <span className="min-w-0 truncate">{words}</span>
      {trailing ? (
        <>
          <span aria-hidden className="shrink-0">
            ·
          </span>
          <span className="shrink-0 tabular-nums">{trailing}</span>
        </>
      ) : null}
    </span>
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
