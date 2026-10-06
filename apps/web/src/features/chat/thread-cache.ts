import type { Outputs } from "@repo/api";
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
