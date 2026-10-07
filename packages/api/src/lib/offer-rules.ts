import {
  type OfferAction,
  type OfferRefusal,
  type OfferSide,
  type OfferStatus,
  OFFER_SIDE_LIMIT,
  RATE_WINDOW_DAYS,
  REPORT_AFTER_DAYS,
  TOPUP_MAX,
  type TopupInput,
  type TradeStatus,
} from "../schemas/offer";

const DAY_MS = 24 * 60 * 60 * 1000;

export type OfferParties = { fromUserId: string; toUserId: string };
export type OfferState = OfferParties & { status: OfferStatus; expiresAt: string | Date };

export type CreateEffect = "counter" | "replace" | "new";

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
  if (effectiveStatus(offer, now) !== "open" || limits.tradeBlocked) return [];
  if (offer.toUserId === viewerId) {
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
  if (limits.tradeBlocked) return "trade_blocked";
  const status = effectiveStatus(offer, now);
  if (status === "expired") return "expired";
  if (status !== "open") return "not_open";
  if (action === "counter" && limits.muted && offer.toUserId === viewerId) return "muted";
  return allowedActions(offer, viewerId, now, limits).includes(action) ? null : "not_allowed";
}

export type SafetyFacts = {
  blocked: boolean;
  muted: boolean;
  tradeBlocked: boolean;
  /** the partner is trade blocked or banned; refused like a block, so it isn't revealed */
  partnerTradeBlocked: boolean;
};

/**
 * Sending and countering need everything. Accepting starts a trade, so a block refuses it
 * too, but not a mute; declining, withdrawing and cancelling need only no trade block.
 */
export function safetyRefusal(
  kind: "send" | "accept" | "respond",
  facts: SafetyFacts,
): OfferRefusal | null {
  if (facts.tradeBlocked) return "trade_blocked";
  if (kind === "respond") return null;
  if (kind === "send" && facts.muted) return "muted";
  if (facts.blocked || facts.partnerTradeBlocked) return "not_accepting";
  return null;
}

export type ShapeInput = {
  give: unknown[];
  get: unknown[];
  topup?: TopupInput;
};

export type Shape =
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

export type ItemFlags = { transferable: boolean; reserved: boolean; inOpenOffer: number[] };

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

export type ItemVerdict = "ok" | "not_owned" | "not_transferable" | "reserved";

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

export type TradeParty = { userId: string; verified: number; createdAt: string | Date };

/**
 * Who should send first: fewer verified trades, then the newer account, then `b` (the
 * offer's recipient). A suggestion only; nothing enforces it.
 */
export function firstSender(a: TradeParty, b: TradeParty): string {
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

/** Either party may cancel until the first leg verifies. */
export function cancelRefusal(trade: TradeState): OfferRefusal | null {
  if (trade.status !== "in_progress") return "trade_ended";
  return trade.verifiedLegs > 0 ? "locked" : null;
}

/** Only a completed trade takes feedback, until 14 days after it ended. */
export function rateRefusal(trade: TradeState, now: Date): OfferRefusal | null {
  if (trade.status !== "completed" || trade.endedAt === null) return "not_completed";
  const closes = new Date(trade.endedAt).getTime() + RATE_WINDOW_DAYS * DAY_MS;
  return now.getTime() > closes ? "rating_closed" : null;
}

export type RatingCounts = { verified: number; positive: number; negative: number; since: string };

/** Neutral ratings count toward neither side of the share. */
export function toReputation(counts: RatingCounts) {
  const rated = counts.positive + counts.negative;
  return {
    verified: counts.verified,
    positive: rated === 0 ? null : Math.round((100 * counts.positive) / rated),
    since: counts.since,
  };
}
