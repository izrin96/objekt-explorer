import type { ListTypeNew } from "../schemas/list";
import {
  type OfferAction,
  type OfferRefusal,
  type OfferSide,
  type OfferStatus,
  type GetItemInput,
  OFFER_SIDE_LIMIT,
  RATE_WINDOW_DAYS,
  REPORT_AFTER_DAYS,
  TOPUP_MAX,
  type TopupInput,
  type TradeStatus,
} from "../schemas/offer";
import { DAY_MS } from "./time";

type OfferParties = { fromUserId: string; toUserId: string };
export type OfferState = OfferParties & { status: OfferStatus; expiresAt: string | Date };

type CreateEffect = "counter" | "replace" | "new";

/** What a new offer from `senderId` does to the conversation's open offer. */
export function createEffect(open: OfferParties | null, senderId: string): CreateEffect {
  if (open === null) return "new";
  return open.toUserId === senderId ? "counter" : "replace";
}

/** An open offer past `expires_at` reads as expired before any worker writes it. */
export function effectiveStatus(offer: OfferState, now: Date): OfferStatus {
  if (offer.status !== "open") return offer.status;
  return new Date(offer.expiresAt).getTime() <= now.getTime() ? "expired" : "open";
}

export type ActorLimits = { muted?: boolean; tradeBlocked?: boolean };

/** A chat mute stops only sending, so countering; a trade block or ban stops everything. */
export function allowedActions(
  offer: OfferState,
  viewerId: string,
  now: Date,
  limits: ActorLimits = {},
): OfferAction[] {
  if (effectiveStatus(offer, now) !== "open") return [];
  if (offer.toUserId === viewerId) {
    // a trade block leaves a way to back out
    if (limits.tradeBlocked) return ["decline"];
    return limits.muted ? ["accept", "decline"] : ["accept", "decline", "counter"];
  }
  if (offer.fromUserId === viewerId) return ["withdraw"];
  return [];
}

/** Why `action` is refused on this offer, or null when it is allowed. */
export function actionRefusal(
  offer: OfferState,
  viewerId: string,
  action: OfferAction,
  now: Date,
  limits: ActorLimits = {},
): OfferRefusal | null {
  if (limits.tradeBlocked && (action === "accept" || action === "counter")) {
    return "trade_blocked";
  }
  const status = effectiveStatus(offer, now);
  if (status === "expired") return "expired";
  if (status !== "open") return "not_open";
  if (action === "counter" && limits.muted && offer.toUserId === viewerId) return "muted";
  return allowedActions(offer, viewerId, now, limits).includes(action) ? null : "not_allowed";
}

type SafetyFacts = {
  blocked: boolean;
  muted: boolean;
  tradeBlocked: boolean;
  /** the partner is trade blocked or banned; refused like a block, so it isn't revealed */
  partnerTradeBlocked: boolean;
};

/**
 * Sending and countering need everything. Accepting starts a trade, so a block refuses it
 * too, but not a mute; declining, withdrawing and cancelling are always allowed, so a trade
 * block never leaves the other side waiting.
 */
export function safetyRefusal(
  kind: "send" | "accept" | "respond",
  facts: SafetyFacts,
): OfferRefusal | null {
  if (kind === "respond") return null;
  if (facts.tradeBlocked) return "trade_blocked";
  if (kind === "send" && facts.muted) return "muted";
  if (facts.blocked || facts.partnerTradeBlocked) return "not_accepting";
  return null;
}

type ShapeInput = {
  give: unknown[];
  get: unknown[];
  topup?: TopupInput;
};

type Shape =
  | { ok: true; topup: { amount: string; currency: string; payer: TopupInput["payer"] } | null }
  | { ok: false; reason: OfferRefusal };

const CENTS = 100;

/** The amount as `numeric(12,2)` stores it, or null when it can't be one. */
export function topupAmount(amount: number): string | null {
  if (!Number.isFinite(amount) || amount <= 0 || amount > TOPUP_MAX) return null;
  const cents = Math.round(amount * CENTS);
  if (Math.abs(cents - amount * CENTS) > 1e-6) return null;
  return (cents / CENTS).toFixed(2);
}

/** `currencies` are the codes in `currency_rates`. */
export function validateShape(input: ShapeInput, currencies: ReadonlySet<string>): Shape {
  if (input.give.length === 0 && input.get.length === 0) return { ok: false, reason: "empty" };
  if (input.give.length > OFFER_SIDE_LIMIT || input.get.length > OFFER_SIDE_LIMIT) {
    return { ok: false, reason: "too_many" };
  }
  if (!input.topup) return { ok: true, topup: null };
  const amount = topupAmount(input.topup.amount);
  const currency = input.topup.currency.toUpperCase();
  if (amount === null || !currencies.has(currency)) return { ok: false, reason: "invalid_topup" };
  return { ok: true, topup: { amount, currency, payer: input.topup.payer } };
}

type ItemFlags = { transferable: boolean; reserved: boolean; inOpenOffer: number[] };

/**
 * `openOffers` maps an objekt id to the open offers holding it, each with its
 * conversation; the conversation being offered in is left out, since its open
 * offer is the one a new offer replaces.
 */
export function itemFlags(
  objekt: { id: string; transferable: boolean },
  reserved: ReadonlySet<string>,
  openOffers: ReadonlyMap<string, { offerId: number; conversationId: number }[]>,
  conversationId: number | null,
): ItemFlags {
  return {
    transferable: objekt.transferable,
    reserved: reserved.has(objekt.id),
    inOpenOffer: (openOffers.get(objekt.id) ?? [])
      .filter((offer) => offer.conversationId !== conversationId)
      .map((offer) => offer.offerId)
      .toSorted((a, b) => a - b),
  };
}

type ItemVerdict = "ok" | "not_owned" | "not_transferable" | "reserved";

/** One specific objekt against the side that gives it; `addresses` are lowercase. */
export function itemVerdict(
  objekt: { owner: string; transferable: boolean } | undefined,
  addresses: ReadonlySet<string>,
  reserved: boolean,
): ItemVerdict {
  if (!objekt || !addresses.has(objekt.owner.toLowerCase())) return "not_owned";
  if (!objekt.transferable) return "not_transferable";
  return reserved ? "reserved" : "ok";
}

/** The collections asked for as any copy more times than the giver has copies to spare. */
export function anyCopyShortfall(
  wanted: { collectionSlug: string; objektId?: string | null }[],
  available: ReadonlyMap<string, number>,
): string[] {
  const counts = new Map<string, number>();
  for (const item of wanted) {
    if (item.objektId) continue;
    counts.set(item.collectionSlug, (counts.get(item.collectionSlug) ?? 0) + 1);
  }
  return [...counts]
    .filter(([slug, count]) => (available.get(slug) ?? 0) < count)
    .map(([slug]) => slug);
}

/** The first refusal among item verdicts, in the order a user fixes them, with the objekts it names. */
export function firstItemRefusal(
  verdicts: { objektId: string; verdict: ItemVerdict }[],
): { reason: Exclude<ItemVerdict, "ok">; objektIds: string[] } | null {
  for (const reason of ["not_owned", "not_transferable", "reserved"] as const) {
    const objektIds = verdicts.filter((v) => v.verdict === reason).map((v) => v.objektId);
    if (objektIds.length > 0) return { reason, objektIds };
  }
  return null;
}

/** Splits stored items into the viewer's give and get. */
export function offerSummary<T extends { side: OfferSide }>(
  items: T[],
  viewerIsSender: boolean,
): { give: T[]; get: T[] } {
  const own: OfferSide = viewerIsSender ? "give" : "get";
  return {
    give: items.filter((item) => item.side === own),
    get: items.filter((item) => item.side !== own),
  };
}

export function topupPayer(payer: string, viewerIsSender: boolean): "you" | "them" {
  return (payer === "from") === viewerIsSender ? "you" : "them";
}

export type HeldItem = {
  objektId: string;
  /** the giving side's addresses, lowercase */
  holders: string[];
  /** the receiving side's addresses, lowercase */
  receivers: string[];
  /** when the offer was made */
  since: string;
};
export type SeenTransfer = { objektId: string; from: string; to: string; timestamp: string };

/**
 * An open offer's specific objekt still counts while its giver holds it, or once the giver
 * has sent it to the receiver since the offer was made, as accept counts an early send.
 */
export function itemStillHeld(
  item: HeldItem,
  owner: string | undefined,
  transfers: SeenTransfer[],
): boolean {
  if (owner === undefined) return false;
  const at = owner.toLowerCase();
  if (item.holders.includes(at)) return true;
  if (!item.receivers.includes(at)) return false;
  const since = new Date(item.since).getTime();
  return transfers.some(
    (t) =>
      t.objektId === item.objektId &&
      item.holders.includes(t.from.toLowerCase()) &&
      item.receivers.includes(t.to.toLowerCase()) &&
      new Date(t.timestamp).getTime() >= since,
  );
}

export type TradeParty = {
  userId: string;
  verified: number;
  unfinished: number;
  createdAt: string | Date;
};

/**
 * Who should send first: more unfinished trades, then fewer verified trades, then the newer
 * account, then `b` (the offer's recipient). A suggestion only; nothing enforces it.
 */
export function firstSender(a: TradeParty, b: TradeParty): string {
  if (a.unfinished !== b.unfinished) return a.unfinished > b.unfinished ? a.userId : b.userId;
  if (a.verified !== b.verified) return a.verified < b.verified ? a.userId : b.userId;
  const aCreated = new Date(a.createdAt).getTime();
  const bCreated = new Date(b.createdAt).getTime();
  if (aCreated !== bCreated) return aCreated > bCreated ? a.userId : b.userId;
  return b.userId;
}

export type TradeState = {
  status: TradeStatus;
  acceptedAt: string | Date;
  endedAt: string | Date | null;
  /** legs with `verified_at` */
  verifiedLegs: number;
};

export function canReport(trade: TradeState, now: Date) {
  if (trade.status === "failed") return true;
  return (
    trade.status === "in_progress" &&
    now.getTime() - new Date(trade.acceptedAt).getTime() >= REPORT_AFTER_DAYS * DAY_MS
  );
}

/**
 * Either party may cancel until the first leg verifies or the receiver holds a wrong copy
 * they haven't accepted (`heldCopies`), and not while the indexer is behind: a party could
 * otherwise cancel right after receiving, before the transfer is read.
 */
export function cancelRefusal(
  trade: TradeState,
  indexerBehind: boolean,
  heldCopies: number,
): OfferRefusal | null {
  if (trade.status !== "in_progress") return "trade_ended";
  if (trade.verifiedLegs > 0 || heldCopies > 0) return "locked";
  return indexerBehind ? "indexer_behind" : null;
}

type LegOwed = { fromUserId: string; verifiedAt: string | Date | null };

/**
 * The party at fault in a failed trade: the one who still owed a transfer while the other
 * had delivered every leg they gave. A party giving no legs owed nothing the site can see.
 * A leg stuck as non-transferable is still owed. Null when both or neither still owed.
 */
export function atFault(legs: LegOwed[], userA: string, userB: string): string | null {
  const owes = (userId: string) =>
    legs.some((leg) => leg.fromUserId === userId && leg.verifiedAt === null);
  const aOwes = owes(userA);
  if (aOwes === owes(userB)) return null;
  return aOwes ? userA : userB;
}

/**
 * A completed trade takes feedback from both parties; a failed one only from the party who
 * delivered, so not from `faultyUser`. Either way until 14 days after it ended.
 */
export function rateRefusal(
  trade: TradeState,
  now: Date,
  viewerId: string,
  faultyUser: string | null,
): OfferRefusal | null {
  const rateable =
    trade.status === "completed" ||
    (trade.status === "failed" && faultyUser !== null && faultyUser !== viewerId);
  if (!rateable || trade.endedAt === null) return "not_completed";
  const closes = new Date(trade.endedAt).getTime() + RATE_WINDOW_DAYS * DAY_MS;
  return now.getTime() > closes ? "rating_closed" : null;
}

type RatingCounts = {
  verified: number;
  unfinished: number;
  positive: number;
  negative: number;
  since: string;
};

/** Neutral ratings count toward neither side of the share. */
export function toReputation(counts: RatingCounts) {
  const rated = counts.positive + counts.negative;
  return {
    verified: counts.verified,
    unfinished: counts.unfinished,
    positive: rated === 0 ? null : Math.round((100 * counts.positive) / rated),
    since: counts.since,
  };
}

type WantListRef = { userId: string; listTypeNew: ListTypeNew; discoverable: boolean };

/**
 * The collections the give picker keeps, null for all. A named want list counts only when it
 * is the partner's and on Trade, so a slug cannot read someone else's private list.
 */
export function giveNarrowing(
  partnerId: string,
  partnerWants: string[] | null,
  wantList: { list: WantListRef | null; slugs: string[] } | null,
): string[] | null {
  if (wantList === null) return partnerWants;
  const { list } = wantList;
  const named =
    list && list.userId === partnerId && list.listTypeNew === "want" && list.discoverable
      ? [...new Set(wantList.slugs)]
      : [];
  if (partnerWants === null) return named;
  const kept = new Set(partnerWants);
  return named.filter((slug) => kept.has(slug));
}

export type ListEntryRef = {
  listSlug: string;
  collectionSlug: string;
  objektId: string | null;
  hideSerial: boolean;
};

/** The token an entry offers by serial: none on a list that hides serials, which offers any copy. */
export const entryObjektId = (entry: ListEntryRef) => (entry.hideSerial ? null : entry.objektId);

/** The entry a get item comes from: its own token, else a collection entry; the named list first. */
export function matchEntry<E extends ListEntryRef>(item: GetItemInput, entries: E[]): E | null {
  const fits = (entry: E) =>
    entry.collectionSlug === item.collectionSlug &&
    (item.objektId === undefined
      ? entryObjektId(entry) === null
      : !entry.hideSerial && (entry.objektId === null || entry.objektId === item.objektId));
  const candidates = entries.filter(fits);
  return candidates.find((entry) => entry.listSlug === item.listSlug) ?? candidates[0] ?? null;
}

/**
 * The copies an any-copy ask may draw on, per collection: null for every copy, when an entry
 * covers the collection; else only the tokens that hidden-serial entries name, still held.
 */
export function anyCopyScope(entries: ListEntryRef[]) {
  const scope = new Map<string, Set<string> | null>();
  for (const { collectionSlug: slug, objektId, hideSerial } of entries) {
    if (scope.get(slug) === null) continue;
    if (objektId === null) scope.set(slug, null);
    else if (hideSerial) scope.set(slug, new Set([...(scope.get(slug) ?? []), objektId]));
  }
  return scope;
}

/** Whether a copy counts toward an any-copy ask under `scope`. */
export const inAnyCopyScope = (
  scope: ReadonlyMap<string, ReadonlySet<string> | null>,
  copy: { id: string; slug: string },
) => !scope.get(copy.slug) || scope.get(copy.slug)!.has(copy.id);
