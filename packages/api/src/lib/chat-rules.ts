import { truncateAddress } from "@repo/lib/address";

import {
  type ChatBox,
  type ChatRefusal,
  MESSAGE_LIMIT_PER_MINUTE,
  type MessageAllow,
  MESSAGE_PREF_DEFAULTS,
  NEW_ACCOUNT_DAYS,
  NEW_ACCOUNT_START_LIMIT,
  START_LIMIT,
  START_WINDOW_HOURS,
} from "../schemas/chat";
import { HOUR_MS } from "./time";
import { type AddressRef, type PartnerIdentity } from "./trade-rank";

const MINUTE_MS = 60 * 1000;

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

export type StartFacts = {
  senderId: string;
  recipientId: string;
  senderHasAddress: boolean;
  pref: MessagePref;
  /** either account has blocked the other */
  blocked: boolean;
  senderMuted: boolean;
  /** a conversation between the two already exists, so this start reopens it */
  existing: boolean;
  rate: RateDecision;
};

type StartVerdict = { ok: true } | { ok: false; reason: ChatRefusal; retryAt?: Date };

/**
 * The recipient's settings, blocks, mutes and the start limit apply to new conversations
 * only; a reopen that sends a card goes through `sendVerdict` too. A block reads exactly
 * like Nobody, so the blocked side cannot tell.
 */
export function startVerdict(facts: StartFacts): StartVerdict {
  if (!facts.senderHasAddress) return { ok: false, reason: "no_address" };
  if (facts.senderId === facts.recipientId) return { ok: false, reason: "self" };
  if (facts.existing) return { ok: true };
  if (facts.senderMuted) return { ok: false, reason: "muted" };
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

/** The recipient waits in Requests until the first message says otherwise (see `incoming`). */
export function startMembers(): { sender: MemberState; recipient: MemberState } {
  return { sender: EMPTY_MEMBER, recipient: { ...EMPTY_MEMBER, request: true } };
}

export type MemberEvent =
  | { type: "send"; messageId: number }
  /** `opensWithContent`: the conversation's first message, carrying a card or an offer */
  | { type: "incoming"; opensWithContent?: boolean }
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
        request: event.opensWithContent ? false : state.request,
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
 * Named by the address the account chose to chat as while it is still linked, else its first.
 * Hide nickname does not apply: the account picked this name to be seen by.
 */
export function chatIdentity(
  accountName: string,
  addresses: AddressRef[],
  chatAs: string | null = null,
): PartnerIdentity {
  const chosen =
    addresses.find(
      (info) => chatAs !== null && info.address.toLowerCase() === chatAs.toLowerCase(),
    ) ?? addresses[0];
  if (!chosen) return { name: accountName, address: null, also: [] };
  const address = chosen.address.toLowerCase();
  // Cosmo stores an unnamed profile's nickname as its own address
  const named = chosen.nickname && chosen.nickname.toLowerCase() !== address;
  return {
    name: named ? chosen.nickname! : truncateAddress(address),
    address,
    also: [],
  };
}
