import * as z from "zod";

import { isSafeRedirect } from "@/lib/utils";

import type { OfferPrefill, OfferRequest } from "./builder/types";
import { anyKey } from "./pick";

/**
 * Where a Make offer starts, as a caller knows it. Never the sender's picks: a Market listing
 * names only its one listed objekt (`ask`), public data the server checks again on send.
 */
export type OfferStart = {
  /** any handle of the partner's; the page redirects to the canonical one */
  handle: string;
  /** one of their lists, or the conversation; neither addresses the person */
  to?: { list: string } | { conversation: number };
  /** the row's matches, or with `post` one post's */
  matches?: { list?: string; mutual?: boolean; post?: string };
  /** Make offer with it: a near match's collection */
  near?: string;
  /** the offer being countered */
  counter?: number;
  /** the list of theirs You get's picker opens on */
  startList?: string;
  ask?: { collectionSlug: string; objektId: string | null; serial: number | null };
  /** where Back and Cancel return to */
  from?: string;
};

// the URL parser reads an all-digit value as a number
const text = z
  .union([z.string(), z.number()])
  .transform(String)
  .pipe(z.string().min(1).max(256))
  .optional()
  .catch(undefined);
const id = z.coerce.number().int().positive().optional().catch(undefined);

/** `/trade/@<handle>/offer`'s search: how the offer starts, and where it returns. */
export const offerSearchSchema = z.object({
  /** a list slug of theirs */
  to: text,
  conversation: id,
  match: z.enum(["row", "post"]).optional().catch(undefined),
  post: text,
  /** Compare with: one of the viewer's lists */
  list: text,
  mutual: z.boolean().optional().catch(undefined),
  near: text,
  counter: id,
  start: text,
  /** a Market listing's collection, with its objekt and serial */
  ask: text,
  objekt: text,
  serial: z.coerce.number().int().nonnegative().optional().catch(undefined),
  from: z.string().max(2048).refine(isSafeRedirect).optional().catch(undefined),
});

export type OfferSearch = z.infer<typeof offerSearchSchema>;

/** The link every Make offer and Counter uses; empty and false values stay out of the URL. */
export function offerLink(start: OfferStart) {
  const { to, matches, ask } = start;
  const search: z.input<typeof offerSearchSchema> = {
    ...(to && "list" in to && { to: to.list }),
    ...(to && "conversation" in to && { conversation: to.conversation }),
    ...(matches && { match: matches.post ? ("post" as const) : ("row" as const) }),
    ...(matches?.post && { post: matches.post }),
    ...(matches?.list && { list: matches.list }),
    ...(matches?.mutual && { mutual: true }),
    ...(start.near && { near: start.near }),
    ...(start.counter && { counter: start.counter }),
    ...(start.startList && { start: start.startList }),
    ...(ask && {
      ask: ask.collectionSlug,
      ...(ask.objektId !== null && { objekt: ask.objektId }),
      ...(ask.serial !== null && { serial: ask.serial }),
    }),
    ...(start.from !== undefined && isSafeRedirect(start.from) && { from: start.from }),
  };
  return {
    to: "/trade/@{$handle}/offer" as const,
    params: { handle: start.handle },
    search,
    // Back returns through history only to a page that opened this one
    state: { offerBack: true },
  };
}

/** The builder's request, rebuilt from the page's search. A counter's prefill comes from its offer. */
export function requestOf(
  search: OfferSearch,
  partner: { userId: string; name: string },
): OfferRequest {
  const post = search.match === "row" ? undefined : search.post;
  const matched = search.match !== undefined || post !== undefined;
  const ask: OfferPrefill | undefined = search.ask
    ? {
        get: [
          {
            key: search.objekt ?? anyKey(search.ask),
            collectionSlug: search.ask,
            objektId: search.objekt ?? null,
            serial: search.serial ?? null,
            listSlug: search.start ?? search.to ?? null,
            flags: null,
          },
        ],
      }
    : undefined;
  return {
    to:
      search.conversation !== undefined
        ? { conversationId: search.conversation }
        : search.to !== undefined
          ? { target: { kind: "list", slug: search.to } }
          : { target: { kind: "user", userId: partner.userId } },
    name: partner.name,
    ...(search.counter !== undefined && { counter: true }),
    ...(ask && { prefill: ask }),
    ...(search.start !== undefined && { startList: search.start }),
    ...(matched && {
      matches: {
        partnerId: partner.userId,
        ...(search.list !== undefined && { list: search.list }),
        ...(search.mutual && { mutual: true }),
        ...(post !== undefined && { post }),
      },
    }),
    ...(search.near !== undefined && { addNear: search.near }),
  };
}

/** The list slugs a search names, each of which must be the person's own. */
export function listSlugsOf(search: OfferSearch) {
  return [...new Set([search.to, search.post, search.start].filter((slug) => slug !== undefined))];
}

/**
 * A search whose lists aren't the person's starts from the person instead: an edited URL can't
 * title an offer to one person and address it to another.
 */
export function withoutLists(search: OfferSearch): OfferSearch {
  const {
    to: _to,
    post: _post,
    start: _start,
    match: _match,
    near: _near,
    ask: _ask,
    objekt: _objekt,
    serial: _serial,
    ...rest
  } = search;
  return rest;
}

/** Back and Cancel: the page the offer was started from, else the partner's person page. */
export function backPath(from: string | undefined, handle: string) {
  return from !== undefined && isSafeRedirect(from)
    ? from
    : `/trade/@${encodeURIComponent(handle)}`;
}

/**
 * A handle for a partner known only by their profile, as in chat. A post card's handle is the
 * canonical one; else the address, since two accounts can share a nickname.
 */
export function partnerHandle(
  identity: { address: string | null; nickname: string | null },
  cardHandle?: string | null,
) {
  return cardHandle ?? identity.address?.toLowerCase() ?? identity.nickname ?? null;
}
