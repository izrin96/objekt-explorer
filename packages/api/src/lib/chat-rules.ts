import { realNickname } from "@repo/lib/address";

import {
  type ChatBox,
  MESSAGE_LIMIT_PER_MINUTE,
  type MessageAllow,
  MESSAGE_PREF_DEFAULTS,
  NEW_ACCOUNT_DAYS,
  NEW_ACCOUNT_START_LIMIT,
  START_LIMIT,
  START_WINDOW_HOURS,
} from "../schemas/chat";
import { HOUR_MS } from "./time";
import {
  defaultProfile,
  type LinkedProfile,
  nameProfile,
  type PartnerIdentity,
} from "./trade-rank";

const MINUTE_MS = 60 * 1000;

const escapeLike = (text: string) => text.replace(/[\\%_]/g, "\\$&");

/** `name` matches display names and nicknames; `slug` matches collection slugs, so "SeoYeon 204Z" finds `seoyeon-204z`. */
export function searchPatterns(query: string) {
  const text = query.trim();
  return {
    name: `%${escapeLike(text)}%`,
    slug: `%${escapeLike(text.toLowerCase().replace(/\s+/g, "-"))}%`,
  };
}

/** Ordered by code point, as the `conversation_pair_ordered` check compares them. */
export function pairKey(a: string, b: string) {
  return a < b ? { userLow: a, userHigh: b } : { userLow: b, userHigh: a };
}

export type MessagePref = { allow: MessageAllow };

/** A `message_pref` row, possibly from a LEFT JOIN, or the defaults when the user has none. */
export function toMessagePref(row: { allow: string | null } | null | undefined): MessagePref {
  if (!row || row.allow === null) return { ...MESSAGE_PREF_DEFAULTS };
  return { allow: row.allow === "nobody" ? "nobody" : "anyone" };
}

/** Whether a Message button for this recipient shows. */
export function isMessageable(pref: MessagePref) {
  return pref.allow !== "nobody";
}

type RateDecision = { ok: true } | { ok: false; retryAt: Date };

/** `prior` are the times of the earlier counted events; one more fits while fewer than `limit` are in the window. */
export function slidingWindow(
  prior: number[],
  now: Date,
  windowMs: number,
  limit: number,
): RateDecision {
  const inWindow = prior.filter((at) => at > now.getTime() - windowMs).toSorted((a, b) => a - b);
  if (inWindow.length < limit) return { ok: true };
  // the event that has to leave the window before one more fits
  return { ok: false, retryAt: new Date(inWindow[inWindow.length - limit]! + windowMs) };
}

/** `starts` are the times of the user's new conversations. */
export function rateDecision(starts: number[], accountCreatedAt: Date, now: Date): RateDecision {
  const isNew = now.getTime() - accountCreatedAt.getTime() < NEW_ACCOUNT_DAYS * 24 * HOUR_MS;
  const limit = isNew ? NEW_ACCOUNT_START_LIMIT : START_LIMIT;
  return slidingWindow(starts, now, START_WINDOW_HOURS * HOUR_MS, limit);
}

export const MESSAGE_WINDOW_MS = MINUTE_MS;

/** `sends` are the times of the user's earlier messages, not counting the one being sent. */
export function messageRateDecision(sends: number[], now: Date): RateDecision {
  return slidingWindow(sends, now, MESSAGE_WINDOW_MS, MESSAGE_LIMIT_PER_MINUTE);
}

type CardList = { ownerId: string };

/** A list of either member of the conversation; anyone else's is refused. */
export function cardListAllowed(list: CardList, senderId: string, partnerId: string) {
  return list.ownerId === senderId || list.ownerId === partnerId;
}

type CardEntry = { objektId: string | null };

/**
 * `entries` are the list's rows for the card's collection, or null when the card names no list.
 * `holder` is the address that holds the card's objekt, when it names one.
 */
export function cardAllowed(facts: {
  entries: CardEntry[] | null;
  /** a list that hides its serials answers only for its collections, so a probe learns no copy */
  collectionOnly?: boolean;
  objektId?: string;
  holder: string | null;
  memberAddresses: string[];
}) {
  const { entries, objektId } = facts;
  if (entries !== null) {
    const listed = entries.some(
      (entry) =>
        entry.objektId === null ||
        objektId === undefined ||
        facts.collectionOnly === true ||
        entry.objektId === objektId,
    );
    if (!listed) return false;
  }
  if (objektId === undefined) return true;
  const holder = facts.holder?.toLowerCase();
  return holder !== undefined && facts.memberAddresses.some((a) => a.toLowerCase() === holder);
}

export type StartFacts = {
  senderId: string;
  recipientId: string;
  senderHasAddress: boolean;
  pref: MessagePref;
  /** either account has blocked the other */
  blocked: boolean;
  senderMuted: boolean;
  muteUntil?: Date;
  /** the conversation already holds a message, so the recipient's settings and the limit no longer apply */
  existing: boolean;
  rate: RateDecision;
};

/** What a start or a send can be refused for, a subset of both the chat and the offer refusals. */
export type StartRefusal = "no_address" | "self" | "muted" | "not_accepting" | "start_limit";

type StartVerdict = { ok: true } | { ok: false; reason: StartRefusal; retryAt?: Date };

type ChatMute = { until: string | null } | null;

/** When the chat mute ends; undefined for none or no end date. */
export const muteEnd = (mute: ChatMute) => (mute?.until ? new Date(mute.until) : undefined);

/** `startVerdict`'s facts, read from a start context's parties and safety. */
export function startFactsOf(
  ctx: {
    senderId: string;
    recipientId: string;
    senderHasAddress: boolean;
    pref: MessagePref;
    safety: { blocked: boolean; mute: ChatMute };
  },
  existing: boolean,
  rate: StartFacts["rate"],
): StartFacts {
  return {
    senderId: ctx.senderId,
    recipientId: ctx.recipientId,
    senderHasAddress: ctx.senderHasAddress,
    pref: ctx.pref,
    blocked: ctx.safety.blocked,
    senderMuted: ctx.safety.mute !== null,
    muteUntil: muteEnd(ctx.safety.mute),
    existing,
    rate,
  };
}

/** Whether a conversation's `last_message_id` says it holds a message; absent for no conversation. */
export const holdsMessage = (lastMessageId: number | null | undefined) => lastMessageId != null;

/** A list that hides its serials shows them to its owner only. */
export function hidesSerials(
  list: { hideSerial: boolean; ownerId: string } | null | undefined,
  viewerId: string | null,
) {
  return list != null && list.hideSerial && list.ownerId !== viewerId;
}

/**
 * The recipient's settings, blocks, mutes and the start limit apply until the conversation
 * holds its first message. A block reads exactly like Nobody, so the blocked side cannot tell.
 */
export function startVerdict(facts: StartFacts): StartVerdict {
  if (!facts.senderHasAddress) return { ok: false, reason: "no_address" };
  if (facts.senderId === facts.recipientId) return { ok: false, reason: "self" };
  if (facts.existing) return { ok: true };
  if (facts.senderMuted) return { ok: false, reason: "muted", retryAt: facts.muteUntil };
  if (facts.blocked || facts.pref.allow === "nobody") return { ok: false, reason: "not_accepting" };
  if (!facts.rate.ok) return { ok: false, reason: "start_limit", retryAt: facts.rate.retryAt };
  return { ok: true };
}

export function sendVerdict(facts: { blocked: boolean; senderMuted: boolean }): StartVerdict {
  if (facts.senderMuted) return { ok: false, reason: "muted" };
  if (facts.blocked) return { ok: false, reason: "not_accepting" };
  return { ok: true };
}

export type MemberState = {
  request: boolean;
  archivedAt: string | null;
  /** `"infinity"` for always */
  mutedUntil: string | null;
  lastReadMessageId: number | null;
};

const EMPTY_MEMBER: MemberState = {
  request: false,
  archivedAt: null,
  mutedUntil: null,
  lastReadMessageId: null,
};

/** Neither side is in Requests until the first message says which (see `incoming`). */
export function startMembers(): { sender: MemberState; recipient: MemberState } {
  return { sender: EMPTY_MEMBER, recipient: EMPTY_MEMBER };
}

export type MemberEvent =
  | { type: "send"; messageId: number }
  /** `first`: the conversation's first message; `opensWithContent`: it carries a card or an offer */
  | { type: "incoming"; first?: boolean; opensWithContent?: boolean }
  | { type: "read"; messageId: number }
  | { type: "accept" }
  | { type: "decline" }
  | { type: "archive" }
  | { type: "unarchive" }
  | { type: "mute"; until: string | null };

const maxId = (a: number | null, b: number) => (a === null ? b : Math.max(a, b));

/** `now` is an ISO time. Declining keeps `request`, so the conversation never reaches the Inbox unasked. */
export function nextMemberState(state: MemberState, event: MemberEvent, now: string): MemberState {
  switch (event.type) {
    case "send":
      return {
        ...state,
        request: false,
        archivedAt: null,
        lastReadMessageId: maxId(state.lastReadMessageId, event.messageId),
      };
    case "incoming":
      return {
        ...state,
        request: event.first ? !event.opensWithContent : state.request,
        archivedAt: null,
      };
    case "read":
      return { ...state, lastReadMessageId: maxId(state.lastReadMessageId, event.messageId) };
    case "accept":
      return { ...state, request: false };
    case "decline":
      return { ...state, archivedAt: state.archivedAt ?? now };
    case "archive":
      return { ...state, archivedAt: state.archivedAt ?? now };
    case "unarchive":
      return { ...state, archivedAt: null };
    case "mute":
      return { ...state, mutedUntil: event.until };
  }
}

/**
 * Whether one member's Seen and typing reach the other: both keep the switch on, and the member
 * shown has accepted the conversation if it reached them as a request.
 */
export function showsActivityTo(facts: {
  shownShows: boolean;
  viewerShows: boolean;
  shownRequest: boolean;
}) {
  return facts.shownShows && facts.viewerShows && !facts.shownRequest;
}

export function boxOf(state: Pick<MemberState, "request" | "archivedAt">): ChatBox {
  if (state.archivedAt !== null) return "archived";
  return state.request ? "requests" : "inbox";
}

/** A conversation with an account the user blocked leaves their Inbox and Requests, not Archived. */
export function visibleBox(
  state: Pick<MemberState, "request" | "archivedAt">,
  blockedPartner: boolean,
): ChatBox | null {
  const box = boxOf(state);
  return blockedPartner && box !== "archived" ? null : box;
}

export function isMuted(mutedUntil: string | null, now: Date) {
  if (mutedUntil === null) return false;
  return mutedUntil === "infinity" || new Date(mutedUntil).getTime() > now.getTime();
}

type LastMessage = { id: number; senderId: string };

export function isUnread(
  last: LastMessage | null,
  userId: string,
  lastReadMessageId: number | null,
) {
  return last !== null && last.senderId !== userId && last.id > (lastReadMessageId ?? 0);
}

/** A list row's unread mark: requests never show one. */
export function rowUnread(
  state: Pick<MemberState, "request" | "lastReadMessageId">,
  last: LastMessage | null,
  userId: string,
) {
  return !state.request && isUnread(last, userId, state.lastReadMessageId);
}

/** The badge: unread Inbox conversations that are not muted. */
export function countsTowardBadge(
  state: MemberState,
  last: LastMessage | null,
  userId: string,
  now: Date,
  blockedPartner = false,
) {
  return (
    visibleBox(state, blockedPartner) === "inbox" &&
    !isMuted(state.mutedUntil, now) &&
    isUnread(last, userId, state.lastReadMessageId)
  );
}

/**
 * Named by its default profile (see {@link defaultProfile}), with its other non-private
 * profiles in link order as `also`. Hide nickname does not apply: the account picked this
 * name to be seen by.
 */
export function chatIdentity(accountName: string, addresses: LinkedProfile[]): PartnerIdentity {
  const chosen = defaultProfile(addresses);
  if (!chosen) return { name: accountName, address: null, nickname: null, also: [] };
  return {
    ...nameProfile(chosen),
    also: addresses
      .filter((info) => info !== chosen && !info.privateProfile)
      .map((info) => {
        const address = info.address.toLowerCase();
        return { address, nickname: realNickname(address, info.nickname) };
      }),
  };
}
