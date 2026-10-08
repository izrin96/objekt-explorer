import { ArrowClockwiseIcon, ChatsCircleIcon, WarningIcon } from "@phosphor-icons/react";
import type { ChatMessage } from "@repo/api/schemas/chat";
import type { ValidObjekt } from "@repo/lib/types/objekt";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useHydrated } from "@tanstack/react-router";
import { Fragment, useEffect, useLayoutEffect, useRef, useState } from "react";

import { PendingStatus } from "@/components/router/pending";
import { EmptyState } from "@/components/shared/empty-state";
import { InfiniteSentinel } from "@/components/shared/infinite-sentinel";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { dayLabel } from "@/features/chat/format";
import { resyncThread, threadOptions } from "@/features/chat/queries";
import {
  latestOfferId,
  mergeCollections,
  seenMessageId,
  threadMessages,
  type ThreadPage,
} from "@/features/chat/thread-cache";
import { ObjektDrawer } from "@/features/objekt/drawer";
import { counterRequest } from "@/features/offers/counter-request";
import { useOfferBuilder } from "@/features/offers/offer-builder";
import { OfferCard } from "@/features/offers/offer-card";
import { useMinuteClock } from "@/hooks/use-minute-clock";
import { m } from "@/paraglide/messages";
import { clearTyping, useChatTyping } from "@/stores/chat-typing";

import { Composer } from "./composer";
import { MessageItem } from "./message-item";
import { BlockedNotice, MuteNotice, RequestBar } from "./thread-banners";
import { ThreadHeader } from "./thread-header";
import { useCatchUp, useMarkRead, useMuteEnd } from "./thread-hooks";

/** Within this, consecutive messages from one side share one time stamp. */
const GROUP_MS = 5 * 60_000;
/** How close to the bottom still counts as reading the newest message. */
const STICK_PX = 96;

export function Thread({ id }: { id: number }) {
  const queryClient = useQueryClient();
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
        // the page replaces the ones it started from, so what changed meanwhile is read again
        load: () => query.fetchNextPage().then(() => resyncThread(queryClient, id)),
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
  const { id, partner } = conversation;
  const name = partner.identity.name;
  const scroller = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<ValidObjekt | null>(null);
  const stick = useRef(true);
  const heightBeforeOlder = useRef<number | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const hydrated = useHydrated();
  const now = useMinuteClock();
  const builder = useOfferBuilder();
  const latestOffer = latestOfferId(messages);
  const seenId = seenMessageId(messages, conversation.partnerReadMessageId);
  const typing = useChatTyping((state) => id in state.typing);
  const newestIncoming = messages.findLast((message) => !message.mine)?.id;

  // their message has landed, so whatever they were typing is no longer pending
  useEffect(() => {
    clearTyping(id);
  }, [id, newestIncoming]);

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
      <ThreadHeader conversation={conversation} headingRef={heading} hydrated={hydrated} />

      <div
        ref={scroller}
        role="log"
        aria-label={m.chat_thread_label({ name })}
        tabIndex={0}
        onScroll={(event) => {
          const el = event.currentTarget;
          stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < STICK_PX;
        }}
        className="focus-visible:ring-ring relative min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4 outline-none focus-visible:ring-2 focus-visible:ring-inset md:px-4"
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
                      conversationId={id}
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
                      seen={message.id === seenId}
                      hydrated={hydrated}
                      now={now}
                      onOpen={setActive}
                    />
                  </Fragment>
                );
              })}
            </ol>
          )}
          {/* always rendered, so each change is announced */}
          <p role="status" className="text-muted-foreground min-h-5 px-1 text-xs italic">
            {typing ? m.chat_typing({ name }) : null}
          </p>
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
          empty={messages.length === 0}
          onSent={() => (stick.current = true)}
          onOffer={() => builder.open({ to: { conversationId: id }, name })}
        />
      )}
      <ObjektDrawer objekt={active} onClose={() => setActive(null)} />
      {builder.element}
    </div>
  );
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
