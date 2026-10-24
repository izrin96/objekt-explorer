import {
  ArrowClockwiseIcon,
  ArrowDownIcon,
  ChatsCircleIcon,
  WarningIcon,
} from "@phosphor-icons/react";
import type { ChatMessage } from "@repo/api/schemas/chat";
import type { ValidObjekt } from "@repo/lib/types/objekt";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useHydrated, useLocation } from "@tanstack/react-router";
import { Fragment, useEffect, useLayoutEffect, useRef, useState } from "react";

import { PendingStatus } from "@/components/router/pending";
import { EmptyState } from "@/components/shared/empty-state";
import { InfiniteSentinel } from "@/components/shared/infinite-sentinel";
import { WidgetBoundary } from "@/components/shared/widget-boundary";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { Attachment } from "@/features/chat/attachment";
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
import { displayNickname, isSameAddress } from "@/lib/address";
import { m } from "@/paraglide/messages";
import { dropDraftCard, useChatDraft } from "@/stores/chat-draft";
import { clearTyping, useChatTyping } from "@/stores/chat-typing";

import { runPosition } from "./bubble-run";
import { Composer } from "./composer";
import { MessageItem } from "./message-item";
import { BlockedNotice, MuteNotice, PartnerDeletedNotice, RequestBar } from "./thread-banners";
import { ThreadBackBar, ThreadHeader } from "./thread-header";
import { useCatchUp, useMarkRead, useMuteEnd } from "./thread-hooks";

/** How close to the bottom still counts as reading the newest message. */
const STICK_PX = 96;

export function Thread({ id }: { id: number }) {
  const queryClient = useQueryClient();
  const query = useInfiniteQuery(threadOptions(id));
  useCatchUp(id);

  if (query.isPending) return <ThreadSkeleton />;

  if (query.isError) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <ThreadBackBar />
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
      </div>
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
  // a card handed over by a Message button is attached, then forgotten; also while this thread
  // is already open, as from the objekt drawer's Market tab
  const handed = useChatDraft((state) => state.cards[id]);
  const [attachment, setAttachment] = useState<Attachment | null>(handed ?? null);
  const [taken, setTaken] = useState(handed);
  if (handed && handed !== taken) {
    setTaken(handed);
    setAttachment(handed);
  }
  useEffect(() => {
    if (handed) dropDraftCard(id);
  }, [handed, id]);
  const [atBottom, setAtBottom] = useState(true);
  const heightBeforeOlder = useRef<number | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const hydrated = useHydrated();
  const fromProfile = useLocation({ select: (location) => location.state.fromProfile });
  // opened from one of the partner's other profiles: say whose it is; a private one is never in `also`
  const startedFrom =
    hydrated && fromProfile && !isSameAddress(fromProfile, partner.identity.address)
      ? partner.identity.also.find((ref) => isSameAddress(ref.address, fromProfile))
      : undefined;
  const now = useMinuteClock();
  const builder = useOfferBuilder();
  const latestOffer = latestOfferId(messages);
  const seenId = seenMessageId(messages, conversation.partnerReadMessageId);
  const typing = useChatTyping((state) => id in state.typing);
  const newestIncoming = messages.findLast((message) => !message.mine)?.id;
  // the newest message of theirs the reader had in view when last at the bottom
  const [seenIncoming, setSeenIncoming] = useState(newestIncoming ?? 0);
  const hasNew = !atBottom && newestIncoming !== undefined && newestIncoming > seenIncoming;

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

  useMarkRead(id, newest, conversation.lastReadMessageId, atBottom);
  useMuteEnd(id, conversation.sendBlocked?.until ?? null);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ThreadHeader conversation={conversation} headingRef={heading} hydrated={hydrated} />

      <div
        ref={scroller}
        role="log"
        aria-label={m.chat_thread_label({ name })}
        aria-busy={olderPage.loading || undefined}
        tabIndex={0}
        onScroll={(event) => {
          const el = event.currentTarget;
          const near = el.scrollHeight - el.scrollTop - el.clientHeight < STICK_PX;
          stick.current = near;
          setAtBottom(near);
          if (near && newestIncoming !== undefined) setSeenIncoming(newestIncoming);
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
              hint={[
                startedFrom
                  ? m.chat_thread_alt_profile({
                      profile: displayNickname(startedFrom.address, startedFrom.nickname),
                      name,
                    })
                  : null,
                attachment ? m.chat_thread_empty_card() : m.chat_thread_empty_hint(),
              ]
                .filter(Boolean)
                .join(" ")}
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
                const position = runPosition(previous, message, next);
                return (
                  <Fragment key={message.id}>
                    {newDay ? (
                      <li className="text-muted-foreground py-2 text-center text-xs font-medium">
                        {dayLabel(message.createdAt)}
                      </li>
                    ) : null}
                    <WidgetBoundary as="li" resetKey={message}>
                      <MessageItem
                        conversationId={id}
                        message={message}
                        name={name}
                        collection={
                          message.card ? collections[message.card.collectionSlug] : undefined
                        }
                        collections={collections}
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
                        position={position}
                        seen={message.id === seenId}
                        hydrated={hydrated}
                        now={now}
                        onOpen={setActive}
                      />
                    </WidgetBoundary>
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

      {hasNew ? (
        <div className="relative">
          <Button
            variant="secondary"
            size="sm"
            className="absolute -top-12 left-1/2 -translate-x-1/2 shadow-md"
            onClick={() => {
              const el = scroller.current;
              if (el) el.scrollTop = el.scrollHeight;
            }}
          >
            <ArrowDownIcon />
            {m.chat_new_messages()}
          </Button>
        </div>
      ) : null}
      {conversation.request && !conversation.archived && !conversation.partnerDeleted ? (
        <RequestBar id={id} name={name} />
      ) : null}
      {conversation.partnerDeleted ? (
        <PartnerDeletedNotice />
      ) : conversation.sendBlocked ? (
        <MuteNotice notice={conversation.sendBlocked} hydrated={hydrated} />
      ) : conversation.blockedByMe ? (
        <BlockedNotice userId={partner.userId} name={name} />
      ) : (
        <Composer
          conversationId={id}
          name={name}
          empty={messages.length === 0}
          attachment={attachment}
          setAttachment={setAttachment}
          onSent={() => (stick.current = true)}
          onOffer={() => builder.open({ to: { conversationId: id }, name })}
          onOpen={setActive}
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
    <div className="flex min-h-0 flex-1 flex-col">
      <ThreadBackBar />
      <div className="flex flex-1 flex-col gap-3 p-4">
        <PendingStatus />
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="ms-auto h-10 w-2/3" />
        <Skeleton className="h-10 w-1/3" />
      </div>
    </div>
  );
}
