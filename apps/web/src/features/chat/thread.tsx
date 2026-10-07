import {
  ArrowClockwiseIcon,
  ArrowLeftIcon,
  BellSlashIcon,
  ChatsCircleIcon,
  ProhibitIcon,
  WarningIcon,
} from "@phosphor-icons/react";
import type { ChatMessage } from "@repo/api/schemas/chat";
import type { ValidObjekt } from "@repo/lib/types/objekt";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useHydrated } from "@tanstack/react-router";
import { Fragment, type ReactNode, useEffect, useLayoutEffect, useRef, useState } from "react";

import { PendingStatus } from "@/components/router/pending";
import { EmptyState } from "@/components/shared/empty-state";
import { InfiniteSentinel } from "@/components/shared/infinite-sentinel";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useUnblock } from "@/features/moderation/actions";
import { ObjektDrawer } from "@/features/objekt/drawer";
import { useOfferBuilder } from "@/features/offers/offer-builder";
import { counterRequest, OfferCard } from "@/features/offers/offer-card";
import { TrustLine } from "@/features/offers/trust-line";
import { ProfileLink } from "@/features/profile/profile-hover-card";
import { orpc } from "@/lib/orpc";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";
import { useUserSocketLive } from "@/stores/user-socket";

import { useConversationActions } from "./actions";
import { CautionLine } from "./caution-line";
import { Composer } from "./composer";
import { ConversationMenu } from "./conversation-menu";
import { dayLabel, messageTime, mutedLabel, untilLabel } from "./format";
import { ObjektCardMessage } from "./objekt-card-message";
import { fetchNewer, invalidateChatLists, threadOptions } from "./queries";
import { latestOfferId, mergeCollections, threadMessages, type ThreadPage } from "./thread-cache";

/** Within this, consecutive messages from one side share one time stamp. */
const GROUP_MS = 5 * 60_000;
/** How close to the bottom still counts as reading the newest message. */
const STICK_PX = 96;
/** How often an open thread asks for newer messages while the socket is down. */
const CATCH_UP_MS = 10_000;

export function Thread({ id }: { id: number }) {
  const query = useInfiniteQuery(threadOptions(id));
  useCatchUp(id);

  if (query.isPending) return <ThreadSkeleton />;

  if (query.isError) {
    return (
      <EmptyState
        icon={WarningIcon}
        bordered={false}
        title={m.common_error_loading_data()}
        className="flex-1"
        action={
          <Button variant="outline" size="sm" onClick={() => void query.refetch()}>
            <ArrowClockwiseIcon />
            {m.common_error_retry()}
          </Button>
        }
      />
    );
  }

  const conversation = query.data.pages[0]!.conversation;
  return (
    <ThreadView
      conversation={conversation}
      messages={threadMessages(query.data)}
      collections={mergeCollections(query.data)}
      olderPage={{
        has: query.hasNextPage,
        loading: query.isFetchingNextPage,
        failed: query.isFetchNextPageError,
        load: () => query.fetchNextPage(),
      }}
    />
  );
}

function ThreadView({
  conversation,
  messages,
  collections,
  olderPage,
}: {
  conversation: ThreadPage["conversation"];
  messages: ChatMessage[];
  collections: ThreadPage["collections"];
  olderPage: { has: boolean; loading: boolean; failed: boolean; load: () => Promise<unknown> };
}) {
  const { id, partner, muted } = conversation;
  const name = partner.identity.name;
  const scroller = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<ValidObjekt | null>(null);
  const stick = useRef(true);
  const heightBeforeOlder = useRef<number | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const hydrated = useHydrated();
  const builder = useOfferBuilder();
  const latestOffer = latestOfferId(messages);

  // below `md` the list just hid, taking focus with it: start the reader at the thread
  useEffect(() => {
    if (window.matchMedia("(width < 48rem)").matches) heading.current?.focus();
  }, []);

  const oldest = messages[0]?.id;
  const newest = messages.at(-1);

  // an older page is prepended: keep the reader's place instead of jumping to the top
  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el || heightBeforeOlder.current === null) return;
    el.scrollTop += el.scrollHeight - heightBeforeOlder.current;
    heightBeforeOlder.current = null;
  }, [oldest]);

  // a new message, or the first paint: follow it when reading the end or when it is mine
  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el) return;
    if (stick.current || newest?.mine) el.scrollTop = el.scrollHeight;
  }, [newest?.id, newest?.mine]);

  // card art loads after the first paint and grows the thread; stay on the newest message
  useEffect(() => {
    const el = scroller.current;
    const content = el?.firstElementChild;
    if (!el || !content) return;
    const observer = new ResizeObserver(() => {
      if (stick.current) el.scrollTop = el.scrollHeight;
    });
    observer.observe(content);
    return () => observer.disconnect();
  }, []);

  useMarkRead(id, newest, conversation.lastReadMessageId);
  useMuteEnd(id, conversation.sendBlocked?.until ?? null);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex items-center gap-3 border-b px-3 py-2.5 md:px-4">
        <Button
          variant="ghost"
          size="icon-sm"
          className="-ms-1 shrink-0 md:hidden"
          aria-label={m.chat_back()}
          render={<Link to="/messages" search={(prev) => prev} />}
        >
          <ArrowLeftIcon />
        </Button>
        <Avatar className="size-9 shrink-0">
          {partner.user.image ? <AvatarImage src={partner.user.image} alt="" /> : null}
          <AvatarFallback>{name.slice(0, 1).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="flex min-w-0 flex-1 flex-col">
          <h2
            ref={heading}
            tabIndex={-1}
            className="truncate text-base leading-snug font-semibold outline-none"
          >
            {partner.identity.address ? (
              <ProfileLink
                address={partner.identity.address}
                nickname={name}
                className="underline-offset-2 hover:underline"
              >
                {name}
              </ProfileLink>
            ) : (
              name
            )}
          </h2>
          <TrustLine reputation={partner.reputation} className="truncate" />
          {muted ? (
            <p className="text-muted-foreground flex items-center gap-1 text-xs">
              <BellSlashIcon aria-hidden className="size-3.5 shrink-0" />
              {/* the exact end is in the viewer's time zone, unknown to the server render */}
              <span className="truncate">
                {hydrated ? mutedLabel(muted) : m.chat_muted_always()}
              </span>
            </p>
          ) : null}
        </div>
        <ConversationMenu conversation={conversation} name={name} />
      </header>

      <div
        ref={scroller}
        role="log"
        aria-label={m.chat_thread_label({ name })}
        tabIndex={0}
        onScroll={(event) => {
          const el = event.currentTarget;
          stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < STICK_PX;
        }}
        className="focus-visible:ring-ring min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4 outline-none focus-visible:ring-2 focus-visible:ring-inset md:px-4"
      >
        <div className="flex min-h-full flex-col justify-end">
          {olderPage.has ? (
            <InfiniteSentinel
              label={m.chat_load_older()}
              direction="up"
              hasNextPage={olderPage.has}
              isFetchingNextPage={olderPage.loading}
              isError={olderPage.failed}
              fetchNextPage={() => {
                heightBeforeOlder.current = scroller.current?.scrollHeight ?? null;
                void olderPage.load();
              }}
            />
          ) : null}

          {messages.length === 0 ? (
            <EmptyState
              icon={ChatsCircleIcon}
              bordered={false}
              title={m.chat_thread_empty({ name })}
              hint={m.chat_thread_empty_hint()}
            />
          ) : (
            <ol className="flex flex-col gap-1">
              {messages.map((message, i) => {
                const previous = messages[i - 1];
                const next = messages[i + 1];
                // days and times are the viewer's, so they wait for the client
                const newDay =
                  hydrated &&
                  (!previous || dayLabel(previous.createdAt) !== dayLabel(message.createdAt));
                const showTime =
                  !next ||
                  next.mine !== message.mine ||
                  new Date(next.createdAt).getTime() - new Date(message.createdAt).getTime() >
                    GROUP_MS;
                return (
                  <Fragment key={message.id}>
                    {newDay ? (
                      <li className="text-muted-foreground py-2 text-center text-xs font-medium">
                        {dayLabel(message.createdAt)}
                      </li>
                    ) : null}
                    <MessageItem
                      message={message}
                      name={name}
                      collection={
                        message.card ? collections[message.card.collectionSlug] : undefined
                      }
                      offerCard={
                        message.offer ? (
                          <OfferCard
                            offer={message.offer}
                            name={name}
                            collections={collections}
                            collapsed={message.offer.id !== latestOffer}
                            hydrated={hydrated}
                            onCounter={(offer) =>
                              builder.open(counterRequest(offer, name, collections))
                            }
                            onOpen={setActive}
                          />
                        ) : null
                      }
                      showTime={showTime}
                      hydrated={hydrated}
                      onOpen={setActive}
                    />
                  </Fragment>
                );
              })}
            </ol>
          )}
        </div>
      </div>

      {conversation.request && !conversation.archived ? <RequestBar id={id} name={name} /> : null}
      {conversation.sendBlocked ? (
        <MuteNotice notice={conversation.sendBlocked} hydrated={hydrated} />
      ) : conversation.blockedByMe ? (
        <BlockedNotice userId={partner.userId} name={name} />
      ) : (
        <Composer
          conversationId={id}
          name={name}
          onSent={() => (stick.current = true)}
          onOffer={() => builder.open({ to: { conversationId: id }, name })}
        />
      )}
      <ObjektDrawer objekt={active} onClose={() => setActive(null)} />
      {builder.element}
    </div>
  );
}

function MessageItem({
  message,
  name,
  collection,
  offerCard,
  showTime,
  hydrated,
  onOpen,
}: {
  message: ChatMessage;
  name: string;
  collection: ValidObjekt | undefined;
  offerCard: ReactNode;
  /** the last of a run from one side shows its time; the others keep it for screen readers */
  showTime: boolean;
  hydrated: boolean;
  onOpen: (objekt: ValidObjekt) => void;
}) {
  const { mine } = message;
  return (
    <li
      className={cn(
        "flex max-w-[85%] flex-col gap-1 sm:max-w-md",
        mine ? "items-end self-end" : "items-start self-start",
        showTime && "mb-2",
      )}
    >
      <span className="sr-only">{mine ? m.chat_sender_you() : m.chat_sender_name({ name })}</span>
      {offerCard}
      {message.card ? (
        <ObjektCardMessage card={message.card} collection={collection} onOpen={onOpen} />
      ) : null}
      {message.body ? (
        <p
          className={cn(
            "rounded-2xl px-3 py-2 text-sm wrap-anywhere whitespace-pre-wrap",
            mine ? "bg-foreground text-background" : "bg-secondary text-foreground",
          )}
        >
          {message.body}
        </p>
      ) : null}
      {message.caution && message.caution.length > 0 ? (
        <CautionLine categories={message.caution} />
      ) : null}
      <time
        dateTime={message.createdAt}
        className={showTime ? "text-muted-foreground px-1 text-xs tabular-nums" : "sr-only"}
      >
        {hydrated ? messageTime(message.createdAt) : null}
      </time>
    </li>
  );
}

function MuteNotice({
  notice,
  hydrated,
}: {
  notice: { reason: string; until: string | null };
  hydrated: boolean;
}) {
  return (
    <div role="status" className="bg-secondary/60 flex flex-col gap-1 border-t px-4 py-3">
      <p className="flex items-center gap-2 text-sm font-medium">
        <ProhibitIcon aria-hidden className="size-4 shrink-0" />
        {/* the end date is in the viewer's zone, unknown to the server render */}
        {notice.until && hydrated
          ? m.chat_refused_muted({ time: untilLabel(notice.until) })
          : m.chat_refused_muted_always()}
      </p>
      <p className="text-muted-foreground text-sm text-pretty break-words">
        {m.mod_mute_reason({ reason: notice.reason })}
      </p>
    </div>
  );
}

function BlockedNotice({ userId, name }: { userId: string; name: string }) {
  const unblock = useUnblock();
  return (
    <div className="bg-secondary/60 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t px-4 py-3">
      <p className="text-sm text-pretty">{m.mod_blocked_notice({ name })}</p>
      <Button
        variant="outline"
        size="sm"
        loading={unblock.isPending}
        onClick={() => unblock.mutate({ userId })}
      >
        {m.mod_unblock()}
      </Button>
    </div>
  );
}

function RequestBar({ id, name }: { id: number; name: string }) {
  const actions = useConversationActions(id);
  return (
    <div className="bg-secondary/60 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t px-4 py-3">
      <p className="text-sm text-pretty">{m.chat_request_hint({ name })}</p>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          loading={actions.decline.isPending}
          onClick={() => actions.decline.mutate({ id })}
        >
          {m.chat_decline()}
        </Button>
        <Button
          size="sm"
          loading={actions.accept.isPending}
          onClick={() => actions.accept.mutate({ id })}
        >
          {m.chat_accept()}
        </Button>
      </div>
    </div>
  );
}

/** setTimeout's ceiling, about 24.8 days; a 30-day mute is waited out in two steps. */
const MAX_TIMEOUT = 2 ** 31 - 1;

/** A chat mute ends on its own, with no nudge: refresh the thread's state when it does. */
function useMuteEnd(id: number, until: string | null) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (until === null) return;
    const left = new Date(until).getTime() - Date.now();
    if (!(left > 0)) return;
    const timer = setTimeout(
      () => {
        if (left > MAX_TIMEOUT) setStep((value) => value + 1);
        else void fetchNewer(queryClient, id);
      },
      Math.min(left + 1000, MAX_TIMEOUT),
    );
    return () => clearTimeout(timer);
  }, [id, until, step, queryClient]);
}

/** Marks what the reader has seen, once per newer message and only while the tab is visible. */
function useMarkRead(
  id: number,
  newest: ChatMessage | undefined,
  lastReadMessageId: number | null,
) {
  const queryClient = useQueryClient();
  const { mutate } = useMutation(
    orpc.chat.markRead.mutationOptions({ onSuccess: () => invalidateChatLists(queryClient) }),
  );
  const marked = useRef(0);
  const upTo = newest && !newest.mine ? newest.id : 0;

  useEffect(() => {
    if (upTo <= Math.max(marked.current, lastReadMessageId ?? 0)) return;
    const mark = () => {
      if (document.hidden || upTo <= marked.current) return;
      const previous = marked.current;
      // held while in flight so it is not sent twice; a failure lets the next look retry
      marked.current = upTo;
      mutate(
        { id, upTo },
        {
          onError: () => {
            if (marked.current === upTo) marked.current = previous;
          },
        },
      );
    };
    mark();
    document.addEventListener("visibilitychange", mark);
    return () => document.removeEventListener("visibilitychange", mark);
  }, [id, upTo, lastReadMessageId, mutate]);
}

/**
 * New messages reach an open thread as a socket nudge. Without the socket nothing would
 * arrive until a reload, so the thread polls then, and always catches up when shown again.
 */
function useCatchUp(id: number) {
  const queryClient = useQueryClient();
  const live = useUserSocketLive((state) => state.live);

  useEffect(() => {
    const catchUp = () => {
      if (document.hidden) return;
      void fetchNewer(queryClient, id).catch(() => undefined);
    };
    document.addEventListener("visibilitychange", catchUp);
    const timer = live ? undefined : setInterval(catchUp, CATCH_UP_MS);
    return () => {
      document.removeEventListener("visibilitychange", catchUp);
      clearInterval(timer);
    };
  }, [queryClient, id, live]);
}

/** Also the route's pending view, in the thread pane. */
export function ThreadSkeleton() {
  return (
    <div className="flex flex-1 flex-col gap-3 p-4">
      <PendingStatus />
      <Skeleton className="h-10 w-1/2" />
      <Skeleton className="ms-auto h-10 w-2/3" />
      <Skeleton className="h-10 w-1/3" />
    </div>
  );
}
