import type { StoredCard } from "../schemas/chat";
import {
  EXCERPT_SIZE,
  type ExcerptEntry,
  type ExcerptOffer,
  type ModAction,
  REPORT_WINDOW_HOURS,
} from "../schemas/moderation";
import type { OfferSide, OfferStatus } from "../schemas/offer";
import { effectiveStatus } from "./offer-rules";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * When an action's sanction ends: a chat mute after its days, a ban after its days or
 * never, a trade block only when revoked. Warn and dismiss leave nothing to end.
 */
export function sanctionEnd(action: ModAction, days: number | undefined, now: Date): Date | null {
  switch (action) {
    case "chat_mute":
    case "ban":
      return days === undefined ? null : new Date(now.getTime() + days * DAY_MS);
    case "warn":
    case "trade_block":
    case "dismiss":
      return null;
  }
}

/** When the reporter may report this account again, or null when they may now. */
export function reportRetryAt(lastReportAt: string | null, now: Date): Date | null {
  if (lastReportAt === null) return null;
  const next = new Date(lastReportAt).getTime() + REPORT_WINDOW_HOURS * 60 * 60 * 1000;
  return next > now.getTime() ? new Date(next) : null;
}

export type ExcerptOfferSource = {
  id: number;
  fromUserId: string;
  toUserId: string;
  status: OfferStatus;
  expiresAt: string;
  topupAmount: string | null;
  topupCurrency: string | null;
  topupPayer: string | null;
  note: string | null;
  items: { side: OfferSide; collectionSlug: string; objektId: string | null }[];
};

/** Turned to the reported account's sides, so it reads the same whoever filed the report. */
export function shapeExcerptOffer(
  offer: ExcerptOfferSource,
  targetUserId: string,
  now: Date,
  serialOf: (objektId: string) => number | null,
): ExcerptOffer {
  const targetSent = offer.fromUserId === targetUserId;
  const targetGives: OfferSide = targetSent ? "give" : "get";
  const item = (i: ExcerptOfferSource["items"][number]) => ({
    collectionSlug: i.collectionSlug,
    objektId: i.objektId,
    serial: i.objektId === null ? null : serialOf(i.objektId),
  });
  return {
    offerId: offer.id,
    status: effectiveStatus(offer, now),
    give: offer.items.filter((i) => i.side === targetGives).map(item),
    get: offer.items.filter((i) => i.side !== targetGives).map(item),
    topup:
      offer.topupAmount === null || offer.topupCurrency === null || offer.topupPayer === null
        ? null
        : {
            amount: offer.topupAmount,
            currency: offer.topupCurrency,
            payer: (offer.topupPayer === "from") === targetSent ? "target" : "reporter",
          },
    note: offer.note,
  };
}

export type ExcerptSource = {
  id: number;
  senderId: string;
  body: string | null;
  card: StoredCard | null;
  offer: ExcerptOffer | null;
  createdAt: string;
};

/** The latest messages, oldest first, without ids or sender ids. */
export function shapeExcerpt(messages: ExcerptSource[], targetUserId: string): ExcerptEntry[] {
  return messages
    .toSorted((a, b) => b.id - a.id)
    .slice(0, EXCERPT_SIZE)
    .toReversed()
    .map((message) => ({
      fromTarget: message.senderId === targetUserId,
      body: message.body,
      card: message.card,
      offer: message.offer,
      at: new Date(message.createdAt).toISOString(),
    }));
}

export type EffectiveSanction = { reason: string; until: string | null };

/**
 * Which of a user's active sanctions of one type is in force: one with no end wins, else the
 * one that ends last. `active` rows only; `activeSanctionWhere` decides which those are.
 */
export function effectiveSanction(
  active: { reason: string; expiresAt: string | null }[],
): EffectiveSanction | null {
  if (active.length === 0) return null;
  const last =
    active.find((sanction) => sanction.expiresAt === null) ??
    active.reduce((a, b) =>
      new Date(a.expiresAt!).getTime() >= new Date(b.expiresAt!).getTime() ? a : b,
    );
  return {
    reason: last.reason,
    until: last.expiresAt === null ? null : new Date(last.expiresAt).toISOString(),
  };
}
