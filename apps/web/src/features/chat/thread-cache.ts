import type { Outputs } from "@repo/api";
import { UNSEND_WINDOW_MINUTES } from "@repo/api/schemas/chat";
import type { OfferView } from "@repo/api/schemas/offer";
import type { InfiniteData } from "@tanstack/react-query";

export type ThreadPage = Outputs["chat"]["thread"];
export type ThreadData = InfiniteData<ThreadPage, number | undefined>;
type Incoming = Pick<ThreadPage, "messages" | "collections"> & {
  conversation?: ThreadPage["conversation"];
};

/** Page 0 is the newest; each later page is older. */
export function threadMessages(data: ThreadData) {
  return data.pages.toReversed().flatMap((page) => page.messages);
}

export function newestId(data: ThreadData) {
  return data.pages[0]?.messages.at(-1)?.id ?? 0;
}

/**
 * Adds the messages newer than the newest one held to the newest page. Ids only grow, so a
 * repeated or overlapping fetch never duplicates or reorders anything.
 */
export function appendToThread(data: ThreadData, incoming: Incoming): ThreadData {
  const [first, ...rest] = data.pages;
  if (!first) return data;
  const newest = newestId(data);
  const fresh = incoming.messages.filter((message) => message.id > newest);
  if (fresh.length === 0 && !incoming.conversation) return data;

  return {
    ...data,
    pages: [
      {
        ...first,
        conversation: incoming.conversation ?? first.conversation,
        messages: [...first.messages, ...fresh],
        collections: { ...first.collections, ...incoming.collections },
      },
      ...rest,
    ],
  };
}

export function mergeCollections(data: ThreadData) {
  return Object.assign(
    {},
    ...data.pages.map((page) => page.collections),
  ) as ThreadPage["collections"];
}

/**
 * Offers whose state can change with no new message (an answer, a cancel, a trade ending), newest
 * last, so their cards are read again through `offer.views`.
 */
export function liveOfferIds(data: ThreadData) {
  const ids = threadMessages(data).flatMap(({ offer }) =>
    offer && (offer.status === "open" || offer.tradeStatus === "in_progress") ? [offer.id] : [],
  );
  return [...new Set(ids)];
}

type OfferViews = { offers: OfferView[]; collections: ThreadPage["collections"] };

/** Swaps in the fresh views of offers already held, wherever their pages are; nothing else moves. */
export function patchOffers(data: ThreadData, views: OfferViews): ThreadData {
  const fresh = new Map(views.offers.map((offer) => [offer.id, offer]));
  if (fresh.size === 0) return data;
  return {
    ...data,
    pages: data.pages.map((page, i) =>
      Object.assign({}, page, {
        messages: page.messages.map((message) => {
          const offer = message.offer ? fresh.get(message.offer.id) : undefined;
          return offer ? Object.assign({}, message, { offer }) : message;
        }),
        collections: i === 0 ? { ...page.collections, ...views.collections } : page.collections,
      }),
    ),
  };
}

/** Blanks the given messages as unsent where they are held, keeping their place and time. */
export function markUnsent(data: ThreadData, ids: ReadonlySet<number>): ThreadData {
  const held = (message: ThreadPage["messages"][number]) => ids.has(message.id) && !message.unsent;
  if (!data.pages.some((page) => page.messages.some(held))) return data;
  return {
    ...data,
    pages: data.pages.map((page) =>
      page.messages.some(held)
        ? Object.assign({}, page, {
            messages: page.messages.map((message) =>
              held(message)
                ? Object.assign({}, message, {
                    body: null,
                    card: null,
                    caution: null,
                    offer: null,
                    unsent: true,
                  })
                : message,
            ),
          })
        : page,
    ),
  };
}

/** Whether the viewer may still unsend it: their own text or card, within the window. */
export function canUnsend(
  message: Pick<ThreadPage["messages"][number], "mine" | "unsent" | "offer" | "createdAt">,
  now: number,
) {
  return (
    message.mine &&
    !message.unsent &&
    !message.offer &&
    Date.parse(message.createdAt) + UNSEND_WINDOW_MINUTES * 60_000 > now
  );
}

/** The viewer's own message that carries "Seen": the latest one the partner has read. */
export function seenMessageId(
  messages: Pick<ThreadPage["messages"][number], "id" | "mine">[],
  partnerReadMessageId: number | null,
) {
  if (partnerReadMessageId === null) return null;
  return (
    messages.findLast((message) => message.mine && message.id <= partnerReadMessageId)?.id ?? null
  );
}

/** The ids a fresh page reports unsent, to apply to what is already held. */
export function unsentIds(page: Pick<ThreadPage, "messages">) {
  return new Set(page.messages.flatMap((message) => (message.unsent ? [message.id] : [])));
}

/** Only the newest offer card is drawn in full; computed here, since a newer one arrives without re-reading the old. */
export function latestOfferId(messages: ThreadPage["messages"]) {
  return messages.findLast((message) => message.offer)?.offer?.id ?? null;
}
